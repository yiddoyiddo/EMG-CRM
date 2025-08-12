import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';
import { z } from 'zod';
import { hasPermission, getDataAccessFilter } from '@/lib/permissions';
import { PERMISSIONS } from '@/lib/permissions';
import { Resource } from '@prisma/client';
import { normalizeCompanyName, normalizePersonName, normalizeEmail, calculateStringSimilarity } from '@/lib/duplicate-detection';

// Request schema validation
const searchSchema = z.object({
  query: z.string().min(2).max(100),
  type: z.enum(['company', 'contact', 'email', 'phone', 'all']).optional().default('all'),
  limit: z.number().min(1).max(100).optional().default(20),
  includeInactive: z.boolean().optional().default(false),
});

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check permissions for database search
    if (!hasPermission(session.user as any, PERMISSIONS.LEADS.READ.resource, PERMISSIONS.LEADS.READ.action) &&
        !hasPermission(session.user as any, PERMISSIONS.PIPELINE.READ.resource, PERMISSIONS.PIPELINE.READ.action)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const validatedParams = searchSchema.parse({
      query: searchParams.get('query'),
      type: searchParams.get('type'),
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined,
      includeInactive: searchParams.get('includeInactive') === 'true',
    });
    
    const { query, type, limit, includeInactive } = validatedParams;
    const results: any[] = [];
    
    // Get data access filter based on user permissions
    const leadAccessFilter = getDataAccessFilter(session.user as any, Resource.LEADS);
    const pipelineAccessFilter = getDataAccessFilter(session.user as any, Resource.PIPELINE);
    
    // Search leads
    if (type === 'all' || type === 'company' || type === 'contact' || type === 'email') {
      const leadResults = await prisma.lead.findMany({
        where: {
          ...leadAccessFilter,
          AND: [
            includeInactive ? {} : { status: { not: 'Closed' } },
            {
              OR: [
                { name: { contains: query, mode: 'insensitive' } },
                { company: { contains: query, mode: 'insensitive' } },
                { email: { contains: query, mode: 'insensitive' } },
                { phone: { contains: query } },
              ]
            }
          ]
        },
        include: {
          bdr: {
            select: { id: true, name: true, role: true }
          },
          activityLogs: {
            orderBy: { timestamp: 'desc' },
            take: 1,
          }
        },
        take: Math.min(limit, 50),
        orderBy: { addedDate: 'desc' }
      });
      
      results.push(...leadResults.map(lead => ({
        id: `lead-${lead.id}`,
        type: 'lead',
        name: lead.name,
        company: lead.company,
        email: lead.email,
        phone: lead.phone,
        status: lead.status,
        addedDate: lead.addedDate,
        lastActivity: lead.activityLogs[0]?.timestamp,
        owner: lead.bdr,
        relevanceScore: calculateSearchRelevance(query, {
          name: lead.name,
          company: lead.company,
          email: lead.email,
        })
      })));
    }
    
    // Search pipeline items
    if (type === 'all' || type === 'company' || type === 'contact' || type === 'email') {
      const pipelineResults = await prisma.pipelineItem.findMany({
        where: {
          ...pipelineAccessFilter,
          AND: [
            includeInactive ? {} : { 
              status: { 
                notIn: ['Closed - Won', 'Closed - Lost', 'Dead'] 
              } 
            },
            {
              OR: [
                { name: { contains: query, mode: 'insensitive' } },
                { company: { contains: query, mode: 'insensitive' } },
                { email: { contains: query, mode: 'insensitive' } },
                { phone: { contains: query } },
              ]
            }
          ]
        },
        include: {
          bdr: {
            select: { id: true, name: true, role: true }
          },
          activityLogs: {
            orderBy: { timestamp: 'desc' },
            take: 1,
          }
        },
        take: Math.min(limit, 50),
        orderBy: { lastUpdated: 'desc' }
      });
      
      results.push(...pipelineResults.map(item => ({
        id: `pipeline-${item.id}`,
        type: 'pipeline',
        name: item.name,
        company: item.company,
        email: item.email,
        phone: item.phone,
        status: item.status,
        category: item.category,
        value: item.value,
        addedDate: item.addedDate,
        lastActivity: item.activityLogs[0]?.timestamp || item.lastUpdated,
        owner: item.bdr,
        relevanceScore: calculateSearchRelevance(query, {
          name: item.name,
          company: item.company,
          email: item.email,
        })
      })));
    }
    
    // Sort by relevance and limit results
    const sortedResults = results
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, limit);
    
    return NextResponse.json({
      results: sortedResults,
      totalFound: results.length,
      query,
      searchType: type,
    });
    
  } catch (error) {
    console.error('Error performing duplicate search:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid search parameters', details: error.errors },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Calculate search relevance score
function calculateSearchRelevance(query: string, fields: { name?: string | null; company?: string | null; email?: string | null }): number {
  const normalizedQuery = query.toLowerCase().trim();
  let maxScore = 0;
  
  // Check exact matches (highest score)
  if (fields.name && normalizePersonName(fields.name).includes(normalizedQuery)) {
    maxScore = Math.max(maxScore, 1.0);
  }
  if (fields.company && normalizeCompanyName(fields.company).includes(normalizedQuery)) {
    maxScore = Math.max(maxScore, 1.0);
  }
  if (fields.email && normalizeEmail(fields.email).includes(normalizedQuery)) {
    maxScore = Math.max(maxScore, 1.0);
  }
  
  // Check similarity matches
  if (fields.name) {
    const nameSimilarity = calculateStringSimilarity(normalizedQuery, normalizePersonName(fields.name));
    maxScore = Math.max(maxScore, nameSimilarity * 0.9);
  }
  
  if (fields.company) {
    const companySimilarity = calculateStringSimilarity(normalizedQuery, normalizeCompanyName(fields.company));
    maxScore = Math.max(maxScore, companySimilarity * 0.9);
  }
  
  // Partial matches (lower score)
  const searchTerms = normalizedQuery.split(' ');
  for (const term of searchTerms) {
    if (term.length < 2) continue;
    
    if (fields.name && normalizePersonName(fields.name).includes(term)) {
      maxScore = Math.max(maxScore, 0.6);
    }
    if (fields.company && normalizeCompanyName(fields.company).includes(term)) {
      maxScore = Math.max(maxScore, 0.6);
    }
  }
  
  return maxScore;
}