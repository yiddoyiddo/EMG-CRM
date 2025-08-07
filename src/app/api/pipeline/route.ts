import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { createPipelineItemSchema, pipelineFilterSchema } from "@/lib/validations";
import { Role } from "@prisma/client";

export async function GET(req: NextRequest) {
  try {
    console.log('🔍 Pipeline API called');
    
    // 1. Get Session securely on the server
    const session = await getServerSession(authOptions);
    console.log('📋 Session:', session ? `User: ${session.user?.email}, Role: ${session.user?.role}` : 'NO SESSION');

    // 2. Check Authentication
    if (!session || !session.user) {
      console.log('❌ No session - returning 401');
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { role, id: userId, name: userName } = session.user;
    console.log(`👤 User: ${userId}, Role: ${role}, Name: ${userName}`);

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
    
    // 3. Enforce Authorization (RBAC) - Build where clause with role-based filtering
    const where: any = {};
    
    // Role-based data filtering
    if (role === Role.BDR) {
      // BDRs can only see their own pipeline items
      where.bdr = userName; // Use the user's name as the BDR filter
      console.log(`🔒 BDR filter applied: bdr = ${userName}`);
    } else if (role === Role.ADMIN) {
      // Admins can see all pipeline items - no additional filtering
      console.log('🔓 ADMIN - No bdr filter applied');
    } else {
      // Unknown role - deny access
      console.log(`❌ Unknown role: ${role}`);
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    
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
    
    // Note: For BDRs, we ignore the 'bdr' filter param since they can only see their own data
    // For Admins, we can still apply the bdr filter if provided
    if (parsedParams.bdr && role === Role.ADMIN) {
      console.log(`🔍 Admin requested BDR filter: "${parsedParams.bdr}"`);
      where.bdr = parsedParams.bdr;
      console.log(`✅ BDR filter applied: ${parsedParams.bdr}`);
    }
    
    // Add filter for top-level items only (not children of sublists)
    const whereWithParent = {
      ...where,
      parentId: null
    };
    
    console.log('📋 Final WHERE clause:', JSON.stringify(whereWithParent, null, 2));

    // Get total count for pagination (only top-level items)
    const total = await prisma.pipelineItem.count({ where: whereWithParent });
    console.log(`📊 Total items found: ${total}`);
    
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
        bdr: true, // This is now a string field
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
            bdr: true, // This is now a string field
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
                bdr: true, // This is now a string field
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
            bdr: true, // This is now a string field
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
    
    console.log(`📤 Returning ${transformedItems.length} items to frontend`);
    
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
    // 1. Get Session securely on the server
    const session = await getServerSession(authOptions);

    // 2. Check Authentication
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { role, id: userId, name: userName } = session.user;
    const data = await req.json();
    
    // Validate the request body
    const validatedData = createPipelineItemSchema.parse(data);
    
    // 3. Enforce Authorization (RBAC) for pipeline item creation
    let pipelineData = { ...validatedData };
    
    if (role === Role.BDR) {
      // BDRs can only create pipeline items assigned to themselves
      pipelineData.bdr = userName; // Use the user's name as the BDR
    } else if (role === Role.ADMIN) {
      // Admins can assign pipeline items to any BDR
      // Use the provided bdr or assign to themselves if not provided
      if (!pipelineData.bdr) {
        pipelineData.bdr = userName;
      }
    } else {
      // Unknown role - deny access
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    
    // Create the pipeline item
    const pipelineItem = await prisma.pipelineItem.create({
      data: {
        name: pipelineData.name,
        title: pipelineData.title,
        bdr: pipelineData.bdr, // This is now a string field
        company: pipelineData.company,
        category: pipelineData.category,
        status: pipelineData.status,
        value: pipelineData.value,
        probability: pipelineData.probability,
        expectedCloseDate: pipelineData.expectedCloseDate,
        callDate: pipelineData.callDate,
        lastUpdated: new Date(),
        link: pipelineData.link,
        phone: pipelineData.phone,
        notes: pipelineData.notes,
        email: pipelineData.email,
        leadId: pipelineData.leadId,
        // Initialize sublist fields
        parentId: pipelineData.parentId || null,
        isSublist: pipelineData.isSublist || false,
        sublistName: pipelineData.sublistName || null,
        sortOrder: pipelineData.sortOrder || null,
      }
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