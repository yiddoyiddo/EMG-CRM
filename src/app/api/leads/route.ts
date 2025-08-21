import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createLeadSchema } from "@/lib/validations";
import { NextRequest } from "next/server";
import { Resource, Action, DuplicateAction } from "@prisma/client";
import { SecurityService, withSecurity } from "@/lib/security";
import { duplicateDetectionService } from "@/lib/duplicate-detection";

// GET - List leads with filters
export async function GET(req: NextRequest) {
  return withSecurity(Resource.LEADS, Action.READ, async (context) => {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || undefined;
    const source = searchParams.get('source') || undefined;
    const bdr = searchParams.get('bdr') || undefined;
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '10');
    const skip = (page - 1) * pageSize;
    
    // Build base query
    const baseQuery: Record<string, any> = {
      skip,
      take: pageSize,
      orderBy: { addedDate: 'desc' }
    };

    // Build where clause with filters
    const where: Record<string, any> = {};
    
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { company: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (status) where.status = status;
    if (source) where.source = source;
    
    // Apply BDR filter for users with appropriate permissions
    if (bdr && (context.permissions.includes(`${Resource.LEADS}:${Action.VIEW_ALL}`) || context.permissions.includes(`${Resource.LEADS}:${Action.VIEW_TEAM}`))) {
      const targetUser = await prisma.user.findFirst({ where: { name: bdr }, select: { id: true } });
      if (targetUser) {
        where.bdrId = targetUser.id;
      } else {
        where.bdrId = '___NO_MATCH___';
      }
    }

    baseQuery.where = where;
    
    // Apply row-level security
    const secureQuery = SecurityService.buildSecureQuery(baseQuery, context, Resource.LEADS);
    
    // Get total count with same security restrictions
    const countQuery = SecurityService.buildSecureQuery({ where }, context, Resource.LEADS);
    const total = await prisma.lead.count(countQuery);
    
    // Get leads with pipeline information
    const leads = await prisma.lead.findMany({
      ...secureQuery,
      select: {
        id: true,
        name: true,
        title: true,
        addedDate: true,
        company: true,
        source: true,
        status: true,
        link: true,
        phone: true,
        notes: true,
        email: true,
        bdr: { select: { name: true } },
        pipelineItems: {
          select: {
            id: true,
            category: true,
            status: true,
            lastUpdated: true,
          },
          take: 1,
          orderBy: { lastUpdated: 'desc' }
        }
      }
    });
    
    // Transform the response
    const transformedLeads = leads.map(lead => {
      const { pipelineItems, bdr, ...rest } = lead as Record<string, any>;
      const latestItem = pipelineItems[0];
      return {
        ...rest,
        // Derive lastUpdated from latest pipeline item if available, otherwise fall back to addedDate
        lastUpdated: latestItem?.lastUpdated || rest.addedDate,
        bdr: bdr?.name || bdr || null,
        inPipeline: pipelineItems.length > 0,
        pipelineStatus: latestItem?.status || null,
        pipelineCategory: latestItem?.category || null,
      };
    });

    const totalPages = Math.ceil(total / pageSize);
    
    return new NextResponse(JSON.stringify({
      leads: transformedLeads,
      total,
      page,
      pageSize,
      totalPages,
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'private, max-age=30, stale-while-revalidate=60',
      },
    });
  }, req);
}

export async function POST(req: NextRequest) {
  return withSecurity(Resource.LEADS, Action.CREATE, async (context) => {
    const data = await req.json();
    
    // Validate the request body
    const validatedData = createLeadSchema.parse(data);
    
    // Determine BDR assignment based on permissions
    let bdrId = context.userId; // Default to current user
    
    if (validatedData.bdrId && context.permissions.includes(`${Resource.LEADS}:${Action.VIEW_ALL}`)) {
      // Users with VIEW_ALL permission can assign to any BDR
      bdrId = validatedData.bdrId;
    }
    
    // Create the lead
    const lead = await prisma.lead.create({
      data: {
        name: validatedData.name,
        title: validatedData.title,
        bdrId: bdrId,
        company: validatedData.company,
        source: validatedData.source,
        status: validatedData.status,
        link: validatedData.link,
        phone: validatedData.phone,
        notes: validatedData.notes,
        email: validatedData.email,
      },
      include: {
        bdr: {
          select: {
            id: true,
            name: true,
            email: true,
            territory: {
              select: { name: true }
            }
          }
        }
      }
    });

    // Log the creation
    await SecurityService.logAction({
      action: 'CREATE',
      resource: 'LEADS',
      resourceId: lead.id.toString(),
      details: {
        leadName: lead.name,
        company: lead.company,
        assignedTo: bdrId
      }
    }, req);
    
    // Fire-and-forget: record a duplicate awareness warning for reporting if this company/email was recently active in other owners
    if (lead.company || lead.email) {
      duplicateDetectionService
        .checkForDuplicates(
          { name: lead.name, company: lead.company || undefined, email: lead.email || undefined, phone: lead.phone || undefined, title: lead.title || undefined, linkedinUrl: lead.link || undefined },
          bdrId,
          DuplicateAction.LEAD_CREATE
        )
        .catch(() => {});
    }
    return NextResponse.json(lead, { status: 201 });
  }, req);
} 