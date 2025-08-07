import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createPipelineItemSchema, pipelineFilterSchema } from "@/lib/validations";

export async function GET(req: NextRequest) {
  try {
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
    
    // Build the where clause
    const where: any = {};
    
    if (parsedParams.search) {
      where.OR = [
        { name: { contains: parsedParams.search, mode: 'insensitive' } },
        { company: { contains: parsedParams.search, mode: 'insensitive' } },
        { email: { contains: parsedParams.search, mode: 'insensitive' } },
      ];
    }
    
    if (parsedParams.category) {
      where.category = parsedParams.category;
    }
    
    if (parsedParams.status) {
      where.status = parsedParams.status;
    }
    
    if (parsedParams.bdr) {
      where.bdr = parsedParams.bdr;
    }
    
    // Add filter for top-level items only (not children of sublists)
    const whereWithParent = {
      ...where,
      parentId: null
    };

    // Get total count for pagination (only top-level items)
    const total = await prisma.pipelineItem.count({ where: whereWithParent });
    
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
        bdr: true,
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
            bdr: true,
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
                bdr: true,
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
            bdr: true,
            activityType: true,
            description: true,
            notes: true,
          }
        }
      }
    });
    
    // Transform the data to include latest activity log information and nested children
    const transformedItems = items.map((item: any) => ({
      ...item,
      latestActivityLog: item.activityLogs[0] || null,
      children: item.children?.map((child: any) => ({
        ...child,
        latestActivityLog: child.activityLogs[0] || null,
        activityLogs: undefined
      })) || [],
      activityLogs: undefined // Remove the full activityLogs array to keep response clean
    }));
    
    // Calculate total pages
    const totalPages = Math.ceil(total / parsedParams.pageSize);
    
    return NextResponse.json({
      items: transformedItems,
      total,
      page: parsedParams.page,
      pageSize: parsedParams.pageSize,
      totalPages,
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
    const data = await req.json();
    
    // Validate the request body
    const validatedData = createPipelineItemSchema.parse(data);
    
    // Create the pipeline item
    const pipelineItem = await prisma.pipelineItem.create({
      data: {
        name: validatedData.name,
        title: validatedData.title,
        bdr: validatedData.bdr,
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
    });
    
    return NextResponse.json(pipelineItem, { status: 201 });
  } catch (error: any) {
    console.error("Error creating pipeline item:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create pipeline item" },
      { status: 400 }
    );
  }
} 