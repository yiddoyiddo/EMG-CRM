import { SecurityService, SecurityContext } from './security';
import { prisma } from './db';
import { Role, Resource } from '@prisma/client';

export interface ExportRequest {
  resource: Resource;
  format: 'csv' | 'json' | 'xlsx';
  filters?: any;
  fields?: string[];
  dateRange?: {
    start: Date;
    end: Date;
  };
}

export interface ExportRestrictions {
  maxRecords: number;
  allowedFields: string[];
  sensitiveFields: string[];
  requireApproval: boolean;
  allowedFormats: string[];
}

export class DataExportService {
  private static readonly EXPORT_RESTRICTIONS: Record<Role, Record<Resource, ExportRestrictions>> = {
    BDR: {
      LEADS: {
        maxRecords: 500,
        allowedFields: ['name', 'company', 'status', 'source', 'addedDate', 'notes'],
        sensitiveFields: ['phone', 'email'],
        requireApproval: false,
        allowedFormats: ['csv']
      },
      PIPELINE: {
        maxRecords: 500,
        allowedFields: ['name', 'company', 'category', 'status', 'value', 'probability'],
        sensitiveFields: ['phone', 'email'],
        requireApproval: false,
        allowedFormats: ['csv']
      },
      FINANCE: {
        maxRecords: 0, // No access
        allowedFields: [],
        sensitiveFields: [],
        requireApproval: true,
        allowedFormats: []
      },
      USERS: {
        maxRecords: 0,
        allowedFields: [],
        sensitiveFields: [],
        requireApproval: true,
        allowedFormats: []
      },
      REPORTS: {
        maxRecords: 100,
        allowedFields: ['basic_metrics'],
        sensitiveFields: [],
        requireApproval: false,
        allowedFormats: ['csv']
      },
      SETTINGS: {
        maxRecords: 0,
        allowedFields: [],
        sensitiveFields: [],
        requireApproval: true,
        allowedFormats: []
      },
      ACTIVITY_LOGS: {
        maxRecords: 100,
        allowedFields: ['timestamp', 'activityType', 'description'],
        sensitiveFields: [],
        requireApproval: false,
        allowedFormats: ['csv']
      }
    },
    TEAM_LEAD: {
      LEADS: {
        maxRecords: 2000,
        allowedFields: ['name', 'company', 'status', 'source', 'addedDate', 'notes', 'bdrId'],
        sensitiveFields: ['phone', 'email'],
        requireApproval: false,
        allowedFormats: ['csv', 'xlsx']
      },
      PIPELINE: {
        maxRecords: 2000,
        allowedFields: ['name', 'company', 'category', 'status', 'value', 'probability', 'bdrId'],
        sensitiveFields: ['phone', 'email'],
        requireApproval: false,
        allowedFormats: ['csv', 'xlsx']
      },
      FINANCE: {
        maxRecords: 0, // Limited access
        allowedFields: [],
        sensitiveFields: [],
        requireApproval: true,
        allowedFormats: []
      },
      USERS: {
        maxRecords: 50,
        allowedFields: ['name', 'email', 'role', 'territory'],
        sensitiveFields: [],
        requireApproval: false,
        allowedFormats: ['csv']
      },
      REPORTS: {
        maxRecords: 1000,
        allowedFields: ['team_metrics', 'individual_metrics'],
        sensitiveFields: [],
        requireApproval: false,
        allowedFormats: ['csv', 'xlsx']
      },
      SETTINGS: {
        maxRecords: 0,
        allowedFields: [],
        sensitiveFields: [],
        requireApproval: true,
        allowedFormats: []
      },
      ACTIVITY_LOGS: {
        maxRecords: 1000,
        allowedFields: ['timestamp', 'activityType', 'description', 'bdrId'],
        sensitiveFields: [],
        requireApproval: false,
        allowedFormats: ['csv']
      }
    },
    MANAGER: {
      LEADS: {
        maxRecords: 10000,
        allowedFields: ['*'], // All fields
        sensitiveFields: [],
        requireApproval: false,
        allowedFormats: ['csv', 'json', 'xlsx']
      },
      PIPELINE: {
        maxRecords: 10000,
        allowedFields: ['*'],
        sensitiveFields: [],
        requireApproval: false,
        allowedFormats: ['csv', 'json', 'xlsx']
      },
      FINANCE: {
        maxRecords: 5000,
        allowedFields: ['company', 'status', 'soldAmount', 'gbpAmount', 'month', 'bdrId'],
        sensitiveFields: ['actualGbpReceived', 'commissionPaid'],
        requireApproval: false,
        allowedFormats: ['csv', 'xlsx']
      },
      USERS: {
        maxRecords: 200,
        allowedFields: ['name', 'email', 'role', 'territory', 'lastLoginAt', 'isActive'],
        sensitiveFields: [],
        requireApproval: false,
        allowedFormats: ['csv', 'xlsx']
      },
      REPORTS: {
        maxRecords: 10000,
        allowedFields: ['*'],
        sensitiveFields: [],
        requireApproval: false,
        allowedFormats: ['csv', 'json', 'xlsx']
      },
      SETTINGS: {
        maxRecords: 100,
        allowedFields: ['basic_settings'],
        sensitiveFields: ['api_keys', 'secrets'],
        requireApproval: false,
        allowedFormats: ['json']
      },
      ACTIVITY_LOGS: {
        maxRecords: 10000,
        allowedFields: ['*'],
        sensitiveFields: [],
        requireApproval: false,
        allowedFormats: ['csv', 'json']
      }
    },
    DIRECTOR: {
      LEADS: {
        maxRecords: 50000,
        allowedFields: ['*'],
        sensitiveFields: [],
        requireApproval: false,
        allowedFormats: ['csv', 'json', 'xlsx']
      },
      PIPELINE: {
        maxRecords: 50000,
        allowedFields: ['*'],
        sensitiveFields: [],
        requireApproval: false,
        allowedFormats: ['csv', 'json', 'xlsx']
      },
      FINANCE: {
        maxRecords: 50000,
        allowedFields: ['*'],
        sensitiveFields: [],
        requireApproval: false,
        allowedFormats: ['csv', 'json', 'xlsx']
      },
      USERS: {
        maxRecords: 1000,
        allowedFields: ['*'],
        sensitiveFields: [],
        requireApproval: false,
        allowedFormats: ['csv', 'json', 'xlsx']
      },
      REPORTS: {
        maxRecords: 100000,
        allowedFields: ['*'],
        sensitiveFields: [],
        requireApproval: false,
        allowedFormats: ['csv', 'json', 'xlsx']
      },
      SETTINGS: {
        maxRecords: 1000,
        allowedFields: ['*'],
        sensitiveFields: [],
        requireApproval: false,
        allowedFormats: ['csv', 'json', 'xlsx']
      },
      ACTIVITY_LOGS: {
        maxRecords: 100000,
        allowedFields: ['*'],
        sensitiveFields: [],
        requireApproval: false,
        allowedFormats: ['csv', 'json', 'xlsx']
      }
    },
    ADMIN: {
      LEADS: {
        maxRecords: -1, // Unlimited
        allowedFields: ['*'],
        sensitiveFields: [],
        requireApproval: false,
        allowedFormats: ['csv', 'json', 'xlsx']
      },
      PIPELINE: {
        maxRecords: -1,
        allowedFields: ['*'],
        sensitiveFields: [],
        requireApproval: false,
        allowedFormats: ['csv', 'json', 'xlsx']
      },
      FINANCE: {
        maxRecords: -1,
        allowedFields: ['*'],
        sensitiveFields: [],
        requireApproval: false,
        allowedFormats: ['csv', 'json', 'xlsx']
      },
      USERS: {
        maxRecords: -1,
        allowedFields: ['*'],
        sensitiveFields: [],
        requireApproval: false,
        allowedFormats: ['csv', 'json', 'xlsx']
      },
      REPORTS: {
        maxRecords: -1,
        allowedFields: ['*'],
        sensitiveFields: [],
        requireApproval: false,
        allowedFormats: ['csv', 'json', 'xlsx']
      },
      SETTINGS: {
        maxRecords: -1,
        allowedFields: ['*'],
        sensitiveFields: [],
        requireApproval: false,
        allowedFormats: ['csv', 'json', 'xlsx']
      },
      ACTIVITY_LOGS: {
        maxRecords: -1,
        allowedFields: ['*'],
        sensitiveFields: [],
        requireApproval: false,
        allowedFormats: ['csv', 'json', 'xlsx']
      }
    }
  };

  static async canExport(
    context: SecurityContext,
    request: ExportRequest
  ): Promise<{ allowed: boolean; restrictions?: ExportRestrictions; reason?: string }> {
    const restrictions = this.EXPORT_RESTRICTIONS[context.role]?.[request.resource];
    
    if (!restrictions) {
      return { allowed: false, reason: 'Resource not accessible for this role' };
    }

    if (restrictions.maxRecords === 0) {
      return { allowed: false, reason: 'Export not permitted for this resource' };
    }

    if (!restrictions.allowedFormats.includes(request.format)) {
      return { 
        allowed: false, 
        reason: `Format ${request.format} not allowed. Permitted formats: ${restrictions.allowedFormats.join(', ')}` 
      };
    }

    if (restrictions.requireApproval) {
      return { 
        allowed: false, 
        reason: 'This export requires approval from a manager or admin' 
      };
    }

    return { allowed: true, restrictions };
  }

  static async executeExport(
    context: SecurityContext,
    request: ExportRequest
  ): Promise<{ data: any[]; metadata: any }> {
    const { allowed, restrictions, reason } = await this.canExport(context, request);
    
    if (!allowed) {
      throw new Error(reason || 'Export not allowed');
    }

    // Log the export attempt
    await SecurityService.logAction({
      action: 'EXPORT',
      resource: request.resource,
      details: {
        format: request.format,
        recordCount: restrictions?.maxRecords || 'unlimited',
        filters: request.filters
      }
    });

    // Build secure query based on user context and restrictions
    let query = this.buildExportQuery(context, request);
    
    // Apply field restrictions
    if (restrictions && !restrictions.allowedFields.includes('*')) {
      query = this.applyFieldRestrictions(query, restrictions);
    }

    // Execute the query based on resource type
    const data = await this.fetchData(request.resource, query, context);

    // Apply record limit
    let limitedData = data;
    if (restrictions && restrictions.maxRecords > 0 && data.length > restrictions.maxRecords) {
      limitedData = data.slice(0, restrictions.maxRecords);
    }

    // Remove sensitive fields for non-admin users
    if (context.role !== 'ADMIN' && restrictions?.sensitiveFields.length) {
      limitedData = this.removeSensitiveFields(limitedData, restrictions.sensitiveFields);
    }

    return {
      data: limitedData,
      metadata: {
        totalRecords: data.length,
        exportedRecords: limitedData.length,
        format: request.format,
        exportedBy: context.userId,
        exportedAt: new Date(),
        restrictions: restrictions
      }
    };
  }

  private static buildExportQuery(context: SecurityContext, request: ExportRequest): any {
    let query: any = {
      where: request.filters || {}
    };

    // Apply date range if specified
    if (request.dateRange) {
      const dateField = this.getDateFieldForResource(request.resource);
      if (dateField) {
        query.where[dateField] = {
          gte: request.dateRange.start,
          lte: request.dateRange.end
        };
      }
    }

    // Apply row-level security
    query = SecurityService.buildSecureQuery(query, context, request.resource);

    return query;
  }

  private static applyFieldRestrictions(query: any, restrictions: ExportRestrictions): any {
    const allowedFields = restrictions.allowedFields;
    const selectObj: any = {};
    
    allowedFields.forEach(field => {
      selectObj[field] = true;
    });

    return {
      ...query,
      select: selectObj
    };
  }

  private static async fetchData(resource: Resource, query: any, context: SecurityContext): Promise<any[]> {
    switch (resource) {
      case 'LEADS':
        return prisma.lead.findMany({
          ...query,
          include: {
            bdr: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          }
        });

      case 'PIPELINE':
        return prisma.pipelineItem.findMany({
          ...query,
          include: {
            bdr: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          }
        });

      case 'FINANCE':
        return prisma.financeEntry.findMany({
          ...query,
          include: {
            bdr: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          }
        });

      case 'USERS':
        return prisma.user.findMany({
          ...query,
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            isActive: true,
            lastLoginAt: true,
            createdAt: true,
            territory: {
              select: {
                name: true
              }
            }
          }
        });

      case 'ACTIVITY_LOGS':
        return prisma.activityLog.findMany({
          ...query,
          include: {
            bdr: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          }
        });

      default:
        throw new Error(`Export not supported for resource: ${resource}`);
    }
  }

  private static getDateFieldForResource(resource: Resource): string | null {
    const dateFieldMap: Record<Resource, string> = {
      LEADS: 'addedDate',
      PIPELINE: 'addedDate',
      FINANCE: 'createdAt',
      USERS: 'createdAt',
      ACTIVITY_LOGS: 'timestamp',
      REPORTS: 'createdAt',
      SETTINGS: 'createdAt'
    };

    return dateFieldMap[resource] || null;
  }

  private static removeSensitiveFields(data: any[], sensitiveFields: string[]): any[] {
    return data.map(record => {
      const cleanRecord = { ...record };
      sensitiveFields.forEach(field => {
        if (field in cleanRecord) {
          delete cleanRecord[field];
        }
      });
      return cleanRecord;
    });
  }

  static async getExportHistory(userId: string, days = 30) {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    
    return prisma.auditLog.findMany({
      where: {
        userId,
        action: 'EXPORT',
        timestamp: { gte: since }
      },
      orderBy: {
        timestamp: 'desc'
      }
    });
  }

  static async requestExportApproval(
    context: SecurityContext,
    request: ExportRequest,
    justification: string
  ): Promise<string> {
    // In a real implementation, this would create an approval workflow
    // For now, we'll log the request
    const requestId = `export_req_${Date.now()}`;
    
    await SecurityService.logAction({
      action: 'EXPORT_REQUEST',
      resource: request.resource,
      details: {
        requestId,
        format: request.format,
        justification,
        status: 'pending'
      }
    });

    return requestId;
  }
}