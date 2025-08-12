import { prisma } from './db';
import { 
  DuplicateAction, 
  DuplicateType, 
  WarningSeverity, 
  UserDecision,
  Role 
} from '@prisma/client';

// Types for duplicate detection
export interface DuplicateCheckInput {
  name?: string;
  email?: string;
  phone?: string;
  company?: string;
  linkedinUrl?: string;
  title?: string;
}

export interface DuplicateMatch {
  id: string;
  matchType: DuplicateType;
  confidence: number;
  matchDetails: Record<string, any>;
  existingRecord: {
    id?: number;
    type: 'lead' | 'pipeline' | 'company' | 'contact';
    name?: string;
    company?: string;
    email?: string;
    phone?: string;
    owner?: {
      id: string;
      name: string;
      role: Role;
    };
    lastContactDate?: Date;
    status?: string;
    isActive?: boolean;
  };
  severity: WarningSeverity;
}

export interface DuplicateWarningResult {
  hasWarning: boolean;
  severity: WarningSeverity;
  matches: DuplicateMatch[];
  warningId?: string;
  message?: string;
}

// Text normalization utilities
export function normalizeCompanyName(company: string): string {
  if (!company) return '';
  
  return company
    .toLowerCase()
    .trim()
    // Remove common company suffixes
    .replace(/\s+(ltd|limited|inc|incorporated|corp|corporation|llc|plc|gmbh|sa|sas|bv|ab|oy|as)\.?$/gi, '')
    // Remove common prefixes
    .replace(/^(the\s+)/gi, '')
    // Remove special characters except spaces and hyphens
    .replace(/[^\w\s-]/g, '')
    // Normalize multiple spaces to single space
    .replace(/\s+/g, ' ')
    .trim();
}

export function normalizePersonName(name: string): string {
  if (!name) return '';
  
  return name
    .toLowerCase()
    .trim()
    // Remove titles and suffixes
    .replace(/\b(mr|mrs|ms|dr|prof|sir|dame|jr|sr|ii|iii|iv|v)\b\.?/gi, '')
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function normalizeEmail(email: string): string {
  if (!email) return '';
  return email.toLowerCase().trim();
}

export function normalizePhone(phone: string): string {
  if (!phone) return '';
  // Extract only digits
  return phone.replace(/\D/g, '');
}

export function extractDomainFromEmail(email: string): string {
  if (!email) return '';
  const parts = email.split('@');
  return parts.length > 1 ? parts[1].toLowerCase() : '';
}

// Similarity scoring functions
export function calculateStringSimilarity(str1: string, str2: string): number {
  if (!str1 || !str2) return 0;
  if (str1 === str2) return 1;
  
  // Levenshtein distance implementation
  const matrix: number[][] = [];
  const len1 = str1.length;
  const len2 = str2.length;
  
  for (let i = 0; i <= len2; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= len1; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= len2; i++) {
    for (let j = 1; j <= len1; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  
  const maxLength = Math.max(len1, len2);
  return maxLength === 0 ? 1 : (maxLength - matrix[len2][len1]) / maxLength;
}

// Main duplicate detection service
export class DuplicateDetectionService {
  private static instance: DuplicateDetectionService;
  
  public static getInstance(): DuplicateDetectionService {
    if (!DuplicateDetectionService.instance) {
      DuplicateDetectionService.instance = new DuplicateDetectionService();
    }
    return DuplicateDetectionService.instance;
  }

  // Check for duplicates when creating a lead/contact
  async checkForDuplicates(
    input: DuplicateCheckInput,
    userId: string,
    action: DuplicateAction = DuplicateAction.LEAD_CREATE
  ): Promise<DuplicateWarningResult> {
    const matches: DuplicateMatch[] = [];
    
    try {
      // Company matches
      if (input.company) {
        const companyMatches = await this.findCompanyMatches(input.company, userId);
        matches.push(...companyMatches);
      }
      
      // Contact matches
      if (input.email) {
        const emailMatches = await this.findEmailMatches(input.email, userId);
        matches.push(...emailMatches);
      }
      
      if (input.phone) {
        const phoneMatches = await this.findPhoneMatches(input.phone, userId);
        matches.push(...phoneMatches);
      }
      
      if (input.name) {
        const nameMatches = await this.findNameMatches(input.name, userId);
        matches.push(...nameMatches);
      }
      
      if (input.linkedinUrl) {
        const linkedinMatches = await this.findLinkedInMatches(input.linkedinUrl, userId);
        matches.push(...linkedinMatches);
      }
      
      // Determine overall severity
      const severity = this.calculateOverallSeverity(matches);
      const hasWarning = matches.length > 0 && severity !== WarningSeverity.LOW;
      
      let warningId: string | undefined;
      
      // Create warning record if there are significant matches
      if (hasWarning) {
        const warning = await prisma.duplicateWarning.create({
          data: {
            triggeredByUserId: userId,
            triggerAction: action,
            warningType: this.getPrimaryWarningType(matches),
            severity,
            triggerData: input,
            potentialDuplicates: {
              create: matches.map(match => ({
                matchType: match.matchType,
                confidence: match.confidence,
                matchDetails: match.matchDetails,
                existingLeadId: match.existingRecord.type === 'lead' ? match.existingRecord.id : undefined,
                existingPipelineId: match.existingRecord.type === 'pipeline' ? match.existingRecord.id : undefined,
                existingCompany: match.existingRecord.company,
                existingContactInfo: {
                  name: match.existingRecord.name,
                  email: match.existingRecord.email,
                  phone: match.existingRecord.phone,
                },
                ownedByUserId: match.existingRecord.owner?.id,
                lastContactDate: match.existingRecord.lastContactDate,
                recordStatus: match.existingRecord.status,
              }))
            }
          }
        });
        
        warningId = warning.id;
        
        // Log the warning
        await this.logDuplicateAudit(userId, 'warning_shown', warningId, {
          entityType: action.includes('LEAD') ? 'lead' : 'pipeline',
          matchCount: matches.length,
          highestSeverity: severity,
        });
      }
      
      return {
        hasWarning,
        severity,
        matches,
        warningId,
        message: this.generateWarningMessage(matches),
      };
      
    } catch (error) {
      console.error('Error in duplicate detection:', error);
      
      // Return safe fallback - no warning to avoid blocking user workflow
      return {
        hasWarning: false,
        severity: WarningSeverity.LOW,
        matches: [],
        message: undefined,
      };
    }
  }

  // Find company matches
  private async findCompanyMatches(company: string, userId: string): Promise<DuplicateMatch[]> {
    const normalizedCompany = normalizeCompanyName(company);
    const matches: DuplicateMatch[] = [];
    
    // Exact company name matches in leads
    const leadMatches = await prisma.lead.findMany({
      where: {
        company: {
          not: null,
        },
        bdrId: {
          not: userId, // Exclude own records initially
        },
      },
      include: {
        bdr: {
          select: { id: true, name: true, role: true }
        },
        activityLogs: {
          where: {
            timestamp: {
              gte: new Date(Date.now() - 12 * 30 * 24 * 60 * 60 * 1000) // 12 months
            }
          },
          orderBy: { timestamp: 'desc' },
          take: 1,
        }
      }
    });
    
    for (const lead of leadMatches) {
      if (!lead.company) continue;
      
      const normalizedExisting = normalizeCompanyName(lead.company);
      const similarity = calculateStringSimilarity(normalizedCompany, normalizedExisting);
      
      if (similarity >= 0.8) { // High similarity threshold
        const lastActivity = lead.activityLogs[0];
        const confidence = similarity;
        const severity = this.calculateMatchSeverity(confidence, lastActivity?.timestamp);
        
        matches.push({
          id: `lead-company-${lead.id}`,
          matchType: DuplicateType.COMPANY_NAME,
          confidence,
          matchDetails: {
            originalCompany: company,
            matchedCompany: lead.company,
            similarity,
          },
          existingRecord: {
            id: lead.id,
            type: 'lead',
            name: lead.name,
            company: lead.company,
            email: lead.email,
            phone: lead.phone,
            owner: lead.bdr,
            lastContactDate: lastActivity?.timestamp,
            status: lead.status,
            isActive: lead.status !== 'Closed',
          },
          severity,
        });
      }
    }
    
    // Similar check for pipeline items
    const pipelineMatches = await prisma.pipelineItem.findMany({
      where: {
        company: {
          not: null,
        },
        bdrId: {
          not: userId,
        },
      },
      include: {
        bdr: {
          select: { id: true, name: true, role: true }
        },
        activityLogs: {
          where: {
            timestamp: {
              gte: new Date(Date.now() - 12 * 30 * 24 * 60 * 60 * 1000)
            }
          },
          orderBy: { timestamp: 'desc' },
          take: 1,
        }
      }
    });
    
    for (const pipeline of pipelineMatches) {
      if (!pipeline.company) continue;
      
      const normalizedExisting = normalizeCompanyName(pipeline.company);
      const similarity = calculateStringSimilarity(normalizedCompany, normalizedExisting);
      
      if (similarity >= 0.8) {
        const lastActivity = pipeline.activityLogs[0];
        const confidence = similarity;
        const severity = this.calculateMatchSeverity(confidence, lastActivity?.timestamp);
        
        matches.push({
          id: `pipeline-company-${pipeline.id}`,
          matchType: DuplicateType.COMPANY_NAME,
          confidence,
          matchDetails: {
            originalCompany: company,
            matchedCompany: pipeline.company,
            similarity,
          },
          existingRecord: {
            id: pipeline.id,
            type: 'pipeline',
            name: pipeline.name,
            company: pipeline.company,
            email: pipeline.email,
            phone: pipeline.phone,
            owner: pipeline.bdr,
            lastContactDate: lastActivity?.timestamp || pipeline.lastUpdated,
            status: pipeline.status,
            isActive: !['Closed - Won', 'Closed - Lost', 'Dead'].includes(pipeline.status),
          },
          severity,
        });
      }
    }
    
    return matches;
  }

  // Find email matches
  private async findEmailMatches(email: string, userId: string): Promise<DuplicateMatch[]> {
    const normalizedEmail = normalizeEmail(email);
    const domain = extractDomainFromEmail(normalizedEmail);
    const matches: DuplicateMatch[] = [];
    
    // Exact email matches
    const exactMatches = await prisma.lead.findMany({
      where: {
        email: normalizedEmail,
        bdrId: {
          not: userId,
        }
      },
      include: {
        bdr: {
          select: { id: true, name: true, role: true }
        },
        activityLogs: {
          orderBy: { timestamp: 'desc' },
          take: 1,
        }
      }
    });
    
    for (const lead of exactMatches) {
      const lastActivity = lead.activityLogs[0];
      const severity = this.calculateMatchSeverity(1.0, lastActivity?.timestamp);
      
      matches.push({
        id: `lead-email-${lead.id}`,
        matchType: DuplicateType.CONTACT_EMAIL,
        confidence: 1.0,
        matchDetails: {
          originalEmail: email,
          matchedEmail: lead.email,
          exactMatch: true,
        },
        existingRecord: {
          id: lead.id,
          type: 'lead',
          name: lead.name,
          company: lead.company,
          email: lead.email,
          phone: lead.phone,
          owner: lead.bdr,
          lastContactDate: lastActivity?.timestamp,
          status: lead.status,
          isActive: lead.status !== 'Closed',
        },
        severity,
      });
    }
    
    // Domain matches (company level)
    if (domain) {
      const domainMatches = await prisma.lead.findMany({
        where: {
          email: {
            contains: `@${domain}`,
          },
          bdrId: {
            not: userId,
          }
        },
        include: {
          bdr: {
            select: { id: true, name: true, role: true }
          },
          activityLogs: {
            where: {
              timestamp: {
                gte: new Date(Date.now() - 6 * 30 * 24 * 60 * 60 * 1000) // 6 months for domain matches
              }
            },
            orderBy: { timestamp: 'desc' },
            take: 1,
          }
        },
        take: 5, // Limit domain matches
      });
      
      for (const lead of domainMatches) {
        if (lead.email === normalizedEmail) continue; // Skip exact matches already found
        
        const lastActivity = lead.activityLogs[0];
        const severity = this.calculateMatchSeverity(0.7, lastActivity?.timestamp);
        
        matches.push({
          id: `lead-domain-${lead.id}`,
          matchType: DuplicateType.COMPANY_DOMAIN,
          confidence: 0.7,
          matchDetails: {
            originalDomain: domain,
            matchedEmail: lead.email,
            sameDomain: true,
          },
          existingRecord: {
            id: lead.id,
            type: 'lead',
            name: lead.name,
            company: lead.company,
            email: lead.email,
            phone: lead.phone,
            owner: lead.bdr,
            lastContactDate: lastActivity?.timestamp,
            status: lead.status,
            isActive: lead.status !== 'Closed',
          },
          severity,
        });
      }
    }
    
    return matches;
  }

  // Find phone matches
  private async findPhoneMatches(phone: string, userId: string): Promise<DuplicateMatch[]> {
    const normalizedPhone = normalizePhone(phone);
    if (normalizedPhone.length < 7) return []; // Skip short numbers
    
    const matches: DuplicateMatch[] = [];
    
    // Find leads with similar phone numbers
    const phoneMatches = await prisma.lead.findMany({
      where: {
        phone: {
          not: null,
        },
        bdrId: {
          not: userId,
        }
      },
      include: {
        bdr: {
          select: { id: true, name: true, role: true }
        },
        activityLogs: {
          orderBy: { timestamp: 'desc' },
          take: 1,
        }
      }
    });
    
    for (const lead of phoneMatches) {
      if (!lead.phone) continue;
      
      const normalizedExisting = normalizePhone(lead.phone);
      
      // Check for exact match or similar endings (last 7-10 digits)
      const isExactMatch = normalizedPhone === normalizedExisting;
      const endsMatch = normalizedPhone.length >= 7 && 
                       normalizedExisting.length >= 7 && 
                       normalizedPhone.slice(-7) === normalizedExisting.slice(-7);
      
      if (isExactMatch || endsMatch) {
        const confidence = isExactMatch ? 1.0 : 0.8;
        const lastActivity = lead.activityLogs[0];
        const severity = this.calculateMatchSeverity(confidence, lastActivity?.timestamp);
        
        matches.push({
          id: `lead-phone-${lead.id}`,
          matchType: DuplicateType.CONTACT_PHONE,
          confidence,
          matchDetails: {
            originalPhone: phone,
            matchedPhone: lead.phone,
            exactMatch: isExactMatch,
            endsMatch,
          },
          existingRecord: {
            id: lead.id,
            type: 'lead',
            name: lead.name,
            company: lead.company,
            email: lead.email,
            phone: lead.phone,
            owner: lead.bdr,
            lastContactDate: lastActivity?.timestamp,
            status: lead.status,
            isActive: lead.status !== 'Closed',
          },
          severity,
        });
      }
    }
    
    return matches;
  }

  // Find name matches
  private async findNameMatches(name: string, userId: string): Promise<DuplicateMatch[]> {
    const normalizedName = normalizePersonName(name);
    const matches: DuplicateMatch[] = [];
    
    // Find leads with similar names
    const nameMatches = await prisma.lead.findMany({
      where: {
        bdrId: {
          not: userId,
        }
      },
      include: {
        bdr: {
          select: { id: true, name: true, role: true }
        },
        activityLogs: {
          orderBy: { timestamp: 'desc' },
          take: 1,
        }
      }
    });
    
    for (const lead of nameMatches) {
      const normalizedExisting = normalizePersonName(lead.name);
      const similarity = calculateStringSimilarity(normalizedName, normalizedExisting);
      
      if (similarity >= 0.85) { // High threshold for name matches
        const lastActivity = lead.activityLogs[0];
        const confidence = similarity;
        const severity = this.calculateMatchSeverity(confidence, lastActivity?.timestamp);
        
        matches.push({
          id: `lead-name-${lead.id}`,
          matchType: DuplicateType.CONTACT_NAME,
          confidence,
          matchDetails: {
            originalName: name,
            matchedName: lead.name,
            similarity,
          },
          existingRecord: {
            id: lead.id,
            type: 'lead',
            name: lead.name,
            company: lead.company,
            email: lead.email,
            phone: lead.phone,
            owner: lead.bdr,
            lastContactDate: lastActivity?.timestamp,
            status: lead.status,
            isActive: lead.status !== 'Closed',
          },
          severity,
        });
      }
    }
    
    return matches;
  }

  // Find LinkedIn profile matches
  private async findLinkedInMatches(linkedinUrl: string, userId: string): Promise<DuplicateMatch[]> {
    if (!linkedinUrl) return [];
    
    const matches: DuplicateMatch[] = [];
    
    // Normalize LinkedIn URL
    const normalizedUrl = linkedinUrl.toLowerCase()
      .replace(/https?:\/\/(www\.)?linkedin\.com\/in\//, '')
      .replace(/\/$/, '');
    
    const linkedinMatches = await prisma.lead.findMany({
      where: {
        link: {
          contains: normalizedUrl,
        },
        bdrId: {
          not: userId,
        }
      },
      include: {
        bdr: {
          select: { id: true, name: true, role: true }
        },
        activityLogs: {
          orderBy: { timestamp: 'desc' },
          take: 1,
        }
      }
    });
    
    for (const lead of linkedinMatches) {
      const lastActivity = lead.activityLogs[0];
      const severity = this.calculateMatchSeverity(0.95, lastActivity?.timestamp);
      
      matches.push({
        id: `lead-linkedin-${lead.id}`,
        matchType: DuplicateType.LINKEDIN_PROFILE,
        confidence: 0.95,
        matchDetails: {
          originalUrl: linkedinUrl,
          matchedUrl: lead.link,
        },
        existingRecord: {
          id: lead.id,
          type: 'lead',
          name: lead.name,
          company: lead.company,
          email: lead.email,
          phone: lead.phone,
          owner: lead.bdr,
          lastContactDate: lastActivity?.timestamp,
          status: lead.status,
          isActive: lead.status !== 'Closed',
        },
        severity,
      });
    }
    
    return matches;
  }

  // Calculate match severity based on confidence and recency
  private calculateMatchSeverity(confidence: number, lastContactDate?: Date): WarningSeverity {
    const now = new Date();
    const threeMonthsAgo = new Date(now.getTime() - 3 * 30 * 24 * 60 * 60 * 1000);
    const sixMonthsAgo = new Date(now.getTime() - 6 * 30 * 24 * 60 * 60 * 1000);
    
    // High confidence exact matches
    if (confidence >= 0.95) {
      if (lastContactDate && lastContactDate > threeMonthsAgo) {
        return WarningSeverity.CRITICAL; // Recent contact with exact match
      }
      if (lastContactDate && lastContactDate > sixMonthsAgo) {
        return WarningSeverity.HIGH;
      }
      return WarningSeverity.MEDIUM;
    }
    
    // Good confidence matches
    if (confidence >= 0.8) {
      if (lastContactDate && lastContactDate > threeMonthsAgo) {
        return WarningSeverity.HIGH;
      }
      return WarningSeverity.MEDIUM;
    }
    
    // Lower confidence matches
    return WarningSeverity.LOW;
  }

  // Calculate overall warning severity
  private calculateOverallSeverity(matches: DuplicateMatch[]): WarningSeverity {
    if (matches.length === 0) return WarningSeverity.LOW;
    
    const hasCritical = matches.some(m => m.severity === WarningSeverity.CRITICAL);
    const hasHigh = matches.some(m => m.severity === WarningSeverity.HIGH);
    const hasMedium = matches.some(m => m.severity === WarningSeverity.MEDIUM);
    
    if (hasCritical) return WarningSeverity.CRITICAL;
    if (hasHigh) return WarningSeverity.HIGH;
    if (hasMedium) return WarningSeverity.MEDIUM;
    
    return WarningSeverity.LOW;
  }

  // Get primary warning type from matches
  private getPrimaryWarningType(matches: DuplicateMatch[]): DuplicateType {
    if (matches.length === 0) return DuplicateType.COMPANY_NAME;
    
    // Prioritize by severity and confidence
    const sortedMatches = matches.sort((a, b) => {
      if (a.severity !== b.severity) {
        const severityOrder = { 
          [WarningSeverity.CRITICAL]: 4, 
          [WarningSeverity.HIGH]: 3, 
          [WarningSeverity.MEDIUM]: 2, 
          [WarningSeverity.LOW]: 1 
        };
        return severityOrder[b.severity] - severityOrder[a.severity];
      }
      return b.confidence - a.confidence;
    });
    
    return sortedMatches[0].matchType;
  }

  // Generate warning message
  private generateWarningMessage(matches: DuplicateMatch[]): string | undefined {
    if (matches.length === 0) return undefined;
    
    const highSeverityMatches = matches.filter(m => 
      m.severity === WarningSeverity.CRITICAL || m.severity === WarningSeverity.HIGH
    );
    
    if (highSeverityMatches.length > 0) {
      const match = highSeverityMatches[0];
      const timeAgo = match.existingRecord.lastContactDate 
        ? this.getTimeAgo(match.existingRecord.lastContactDate)
        : 'some time ago';
      
      return `Potential duplicate detected: Similar ${match.matchType.toLowerCase().replace('_', ' ')} was contacted ${timeAgo} by ${match.existingRecord.owner?.name || 'another BDR'}`;
    }
    
    return `${matches.length} potential duplicate(s) found. Please review before proceeding.`;
  }

  // Utility to get human-readable time difference
  private getTimeAgo(date: Date): string {
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 60) return 'just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
    if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)} days ago`;
    if (diffInSeconds < 31536000) return `${Math.floor(diffInSeconds / 2592000)} months ago`;
    
    return `${Math.floor(diffInSeconds / 31536000)} years ago`;
  }

  // Record user decision on duplicate warning
  async recordDecision(
    warningId: string,
    decision: UserDecision,
    userId: string,
    reason?: string
  ): Promise<void> {
    await prisma.duplicateWarning.update({
      where: { id: warningId },
      data: {
        userDecision: decision,
        decisionMade: true,
        decisionAt: new Date(),
        proceedReason: reason,
      }
    });
    
    // Log the decision
    await this.logDuplicateAudit(userId, decision === UserDecision.PROCEEDED ? 'proceeded_anyway' : 'cancelled', warningId, {
      decision,
      reason,
    });
  }

  // Log duplicate audit trail
  async logDuplicateAudit(
    userId: string,
    action: string,
    warningId?: string,
    context?: Record<string, any>
  ): Promise<void> {
    try {
      await prisma.duplicateAuditLog.create({
        data: {
          userId,
          action,
          warningId,
          entityType: context?.entityType,
          entityId: context?.entityId,
          decisionReason: context?.reason,
          systemSuggestion: context?.systemSuggestion,
          actualOutcome: context?.actualOutcome,
        }
      });
    } catch (error) {
      console.error('Failed to log duplicate audit:', error);
      // Don't throw - audit logging shouldn't break the main flow
    }
  }

  // Admin functions for duplicate management
  async getDuplicateStatistics(dateRange?: { from: Date; to: Date }) {
    const whereClause = dateRange ? {
      createdAt: {
        gte: dateRange.from,
        lte: dateRange.to,
      }
    } : {};
    
    const [totalWarnings, proceedCount, cancelledCount, severityBreakdown] = await Promise.all([
      prisma.duplicateWarning.count({ where: whereClause }),
      prisma.duplicateWarning.count({ 
        where: { 
          ...whereClause,
          userDecision: UserDecision.PROCEEDED 
        } 
      }),
      prisma.duplicateWarning.count({ 
        where: { 
          ...whereClause,
          userDecision: UserDecision.CANCELLED 
        } 
      }),
      prisma.duplicateWarning.groupBy({
        by: ['severity'],
        where: whereClause,
        _count: true,
      })
    ]);
    
    return {
      totalWarnings,
      proceedCount,
      cancelledCount,
      proceedRate: totalWarnings > 0 ? (proceedCount / totalWarnings) * 100 : 0,
      severityBreakdown: severityBreakdown.reduce((acc, item) => {
        acc[item.severity] = item._count;
        return acc;
      }, {} as Record<WarningSeverity, number>),
    };
  }

  // Get recent duplicate warnings for admin dashboard
  async getRecentWarnings(limit = 50, includeResolved = false) {
    return prisma.duplicateWarning.findMany({
      where: includeResolved ? {} : { decisionMade: false },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        triggeredBy: {
          select: { id: true, name: true, email: true, role: true }
        },
        potentialDuplicates: {
          include: {
            ownedBy: {
              select: { id: true, name: true, email: true, role: true }
            }
          }
        }
      }
    });
  }
}

// Export singleton instance
export const duplicateDetectionService = DuplicateDetectionService.getInstance();