import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";
import { createPipelineItemSchema, pipelineFilterSchema } from "@/lib/validations";
import { Resource, Action, DuplicateAction } from "@prisma/client";
import { getAuthenticatedUser, createErrorResponse, createSuccessResponse } from "@/lib/auth-api";
import { hasPermission, getDataAccessFilter } from "@/lib/permissions";
import { duplicateDetectionService } from "@/lib/duplicate-detection";

export async function GET(req: NextRequest) {
  try {
    // Reduced noisy logging in production
    if (process.env.NODE_ENV !== 'production') {
      console.log('🔍 Pipeline API called');
    }
    
    // Get authenticated user with permissions
    const user = await getAuthenticatedUser(req);
    if (!user) {
      if (process.env.NODE_ENV !== 'production') {
        console.log('❌ No authenticated user - returning 401');
      }
      return createErrorResponse("Unauthorized", 401);
    }

    // Check read permission
    if (!hasPermission(user, Resource.PIPELINE, Action.READ)) {
      if (process.env.NODE_ENV !== 'production') {
        console.log('❌ No read permission - returning 403');
      }
      return createErrorResponse("Forbidden", 403);
    }

    if (process.env.NODE_ENV !== 'production') {
      console.log(`👤 User: ${user.id}, Role: ${user.role}, Name: ${user.name}`);
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || undefined;
    const category = searchParams.get('category') || undefined;
    const status = searchParams.get('status') || undefined;
    const bdr = searchParams.get('bdr') || undefined;
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '50');
    
    const skip = (page - 1) * pageSize;
    
    // Parse and validate the query parameters
    const parsedParams = pipelineFilterSchema.parse({
      search,
      category,
      status,
      bdr,
      page,
      pageSize,
    });
    
    // Build where clause with permission-based filtering
    let where: any = getDataAccessFilter(user, Resource.PIPELINE);
    if (process.env.NODE_ENV !== 'production') {
      console.log(`🔒 Permission-based filter applied:`, where);
    }
    
    if (parsedParams.search) {
      const searchFilter = {
        OR: [
          { name: { contains: parsedParams.search, mode: 'insensitive' } },
          { company: { contains: parsedParams.search, mode: 'insensitive' } },
          { email: { contains: parsedParams.search, mode: 'insensitive' } },
        ]
      };
      
      where = where.OR ? { AND: [where, searchFilter] } : { ...where, ...searchFilter };
    }
    
    if (parsedParams.category) {
      where.category = parsedParams.category;
    }
    
    if (parsedParams.status) {
      where.status = parsedParams.status;
    }
    
    // Apply BDR filter for users with appropriate permissions
    if (parsedParams.bdr && (hasPermission(user, Resource.PIPELINE, Action.VIEW_ALL) || hasPermission(user, Resource.PIPELINE, Action.VIEW_TEAM))) {
      if (process.env.NODE_ENV !== 'production') {
        console.log(`🔍 User requested BDR filter: "${parsedParams.bdr}"`);
      }
      const targetUser = await prisma.user.findFirst({ where: { name: parsedParams.bdr }, select: { id: true } });
      if (targetUser) {
        where.bdrId = targetUser.id;
        if (process.env.NODE_ENV !== 'production') {
          console.log(`✅ BDR filter applied by id: ${targetUser.id}`);
        }
      } else {
        // Force no results if name doesn't exist
        where.bdrId = '___NO_MATCH___';
        if (process.env.NODE_ENV !== 'production') {
          console.warn(`⚠️ BDR name not found: ${parsedParams.bdr}`);
        }
      }
    }
    
    // Add filter for top-level items only (not children of sublists)
    const whereWithParent = {
      ...where,
      parentId: null
    };
    
    if (process.env.NODE_ENV !== 'production') {
      console.log('📋 Final WHERE clause:', JSON.stringify(whereWithParent, null, 2));
    }

    // Get total count for pagination (only top-level items)
    const total = await prisma.pipelineItem.count({ where: whereWithParent });
    if (process.env.NODE_ENV !== 'production') {
      console.log(`📊 Total items found: ${total}`);
    }
    
    // Get pipeline items with optimized query using select
    const items = await prisma.pipelineItem.findMany({
      where: whereWithParent,
      skip,
      take: parsedParams.pageSize,
      orderBy: { lastUpdated: 'desc' },
      select: {
        id: true,
        name: true,
        title: true,
        bdr: {
          select: {
            name: true,
          }
        },
        company: true,
        category: true,
        status: true,
        value: true,
        probability: true,
        expectedCloseDate: true,
        callDate: true,
        link: true,
        phone: true,
        notes: true,
        email: true,
        leadId: true,
        addedDate: true,
        lastUpdated: true,
        isSublist: true,
        parentId: true,
        sublistName: true,
        sortOrder: true,
        agreementDate: true,
        partnerListDueDate: true,
        partnerListSentDate: true,
        firstSaleDate: true,
        partnerListSize: true,
        totalSalesFromList: true,
        children: {
          orderBy: { sortOrder: 'asc' },
          select: {
            id: true,
            name: true,
            title: true,
            bdr: {
              select: {
                name: true,
              }
            },
            company: true,
            category: true,
            status: true,
            value: true,
            probability: true,
            expectedCloseDate: true,
            callDate: true,
            link: true,
            phone: true,
            notes: true,
            email: true,
            leadId: true,
            addedDate: true,
            lastUpdated: true,
            isSublist: true,
            parentId: true,
            sublistName: true,
            sortOrder: true,
            agreementDate: true,
            partnerListDueDate: true,
            partnerListSentDate: true,
            firstSaleDate: true,
            partnerListSize: true,
            totalSalesFromList: true,
            activityLogs: {
              orderBy: { timestamp: 'desc' },
              take: 1,
              where: {
                OR: [
                  { activityType: 'BDR_Update' },
                  { activityType: 'Note_Added' },
                  { activityType: 'Status_Change' },
                  { activityType: 'Pipeline_Move' },
                  { activityType: 'Deal_Closed' }
                ]
              },
              select: {
                id: true,
                timestamp: true,
                bdr: {
                  select: {
                    name: true,
                  }
                },
                activityType: true,
                description: true,
                notes: true,
              }
            }
          }
        },
        activityLogs: {
          orderBy: { timestamp: 'desc' },
          take: 1,
          where: {
            OR: [
              { activityType: 'BDR_Update' },
              { activityType: 'Note_Added' },
              { activityType: 'Status_Change' },
              { activityType: 'Pipeline_Move' },
              { activityType: 'Deal_Closed' }
            ]
          },
          select: {
            id: true,
            timestamp: true,
            bdr: {
              select: {
                name: true,
              }
            },
            activityType: true,
            description: true,
            notes: true,
          }
        }
      }
    });
    
    // Transform the data to include latest activity log information and nested children
    const transformedItems = items.map((item: any) => {
      const latest = item.activityLogs[0] || null;
      return {
        ...item,
        bdr: item.bdr?.name || '',
        latestActivityLog: latest
          ? {
              ...latest,
              bdr: latest.bdr?.name || ''
            }
          : null,
        children:
          item.children?.map((child: any) => {
            const childLatest = child.activityLogs[0] || null;
            return {
              ...child,
              bdr: child.bdr?.name || '',
              latestActivityLog: childLatest
                ? {
                    ...childLatest,
                    bdr: childLatest.bdr?.name || ''
                  }
                : null,
              activityLogs: undefined,
            };
          }) || [],
        activityLogs: undefined, // Remove the full activityLogs array to keep response clean
      };
    });
    
    // Calculate total pages
    const totalPages = Math.ceil(total / parsedParams.pageSize);
    
    if (process.env.NODE_ENV !== 'production') {
      console.log(`📤 Returning ${transformedItems.length} items to frontend`);
    }
    
    return new NextResponse(JSON.stringify({
      items: transformedItems,
      total,
      page: parsedParams.page,
      pageSize: parsedParams.pageSize,
      totalPages,
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'private, max-age=30, stale-while-revalidate=60',
      },
    });
  } catch (error: any) {
    console.error("Error fetching pipeline items:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch pipeline items" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    // Get authenticated user with permissions
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return createErrorResponse("Unauthorized", 401);
    }

    // Check create permission
    if (!hasPermission(user, Resource.PIPELINE, Action.CREATE)) {
      return createErrorResponse("Forbidden", 403);
    }

    const data = await req.json();
    
    // Validate the request body
    const validatedData = createPipelineItemSchema.parse(data);
    
    // Determine BDR assignment based on permissions first
    let bdrId = user.id; // Default to current user
    
    // Handle BDR assignment from form data (name to ID conversion)
    if (validatedData.bdr && hasPermission(user, Resource.PIPELINE, Action.VIEW_ALL)) {
      // Users with VIEW_ALL permission can assign to any BDR by name
      const targetBdr = await prisma.user.findFirst({
        where: { name: validatedData.bdr },
        select: { id: true }
      });
      if (targetBdr) {
        bdrId = targetBdr.id;
      }
    } else if (validatedData.bdrId && hasPermission(user, Resource.PIPELINE, Action.VIEW_ALL)) {
      // Users with VIEW_ALL permission can assign to any BDR by ID
      bdrId = validatedData.bdrId;
    }
    
    // Check if force parameter is passed to skip duplicate detection
    const { searchParams } = new URL(req.url);
    const force = searchParams.get('force') === 'true';
    
    // Non-blocking duplicate awareness: if similar item exists in another BDR's pipeline,
    // record a duplicate warning for reporting/notifications but do not block creation.
    if (!force && validatedData.name && validatedData.company) {
      const existingDuplicate = await prisma.pipelineItem.findFirst({
        where: {
          name: { equals: validatedData.name, mode: 'insensitive' },
          company: { equals: validatedData.company, mode: 'insensitive' },
          bdrId: { not: bdrId },
        },
        select: { id: true }
      });
      if (existingDuplicate) {
        // Fire-and-forget duplicate warning creation
        duplicateDetectionService
          .checkForDuplicates(
            { name: validatedData.name, company: validatedData.company, email: validatedData.email, phone: validatedData.phone, title: validatedData.title, linkedinUrl: validatedData.link },
            user.id,
            DuplicateAction.PIPELINE_CREATE
          )
          .catch(() => {});
      }
    }
    
    // Create the pipeline item
    const pipelineItem = await prisma.pipelineItem.create({
      data: {
        name: validatedData.name,
        title: validatedData.title,
        bdrId: bdrId,
        company: validatedData.company,
        category: validatedData.category,
        status: validatedData.status,
        value: validatedData.value,
        probability: validatedData.probability,
        expectedCloseDate: validatedData.expectedCloseDate,
        callDate: validatedData.callDate,
        lastUpdated: new Date(),
        link: validatedData.link,
        phone: validatedData.phone,
        notes: validatedData.notes,
        email: validatedData.email,
        leadId: validatedData.leadId,
        // Initialize sublist fields
        parentId: validatedData.parentId || null,
        isSublist: validatedData.isSublist || false,
        sublistName: validatedData.sublistName || null,
        sortOrder: validatedData.sortOrder || null,
      },
      include: {
        bdr: {
          select: {
            id: true,
            name: true,
            email: true,
          }
        }
      }
    });
    
    return createSuccessResponse(pipelineItem, 201);
  } catch (error: any) {
    console.error("Error creating pipeline item:", error);
    return createErrorResponse(error.message || "Failed to create pipeline item", 400);
  }
} 