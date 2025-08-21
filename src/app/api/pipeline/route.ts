import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient, Resource, Action } from '@prisma/client';
import { createSublistSchema, pipelineSchema } from '@/lib/validations';
import { SecurityService, withSecurity } from '@/lib/security';

const prisma = new PrismaClient();

// GET - List pipeline items with filters (read-only)
export async function GET(req: NextRequest) {
  return withSecurity(Resource.PIPELINE, Action.READ, async (context) => {
    const { searchParams } = new URL(req.url);
    const search = (searchParams.get('search') || '').trim();
    const category = (searchParams.get('category') || '').trim();
    const status = (searchParams.get('status') || '').trim();
    const bdr = (searchParams.get('bdr') || '').trim();
    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = parseInt(searchParams.get('pageSize') || '50', 10);
    const skip = (page - 1) * pageSize;

    const where: any = {};
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { company: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (category) where.category = category;
    if (status) where.status = status;

    if (bdr) {
      const targetUser = await prisma.user.findFirst({ where: { name: bdr }, select: { id: true } });
      where.bdrId = targetUser ? targetUser.id : '___NO_MATCH___';
    }

    const baseQuery: any = {
      where,
      skip,
      take: pageSize,
      orderBy: { lastUpdated: 'desc' },
      include: {
        bdr: { select: { name: true, territoryId: true } },
        children: {
          orderBy: { sortOrder: 'asc' },
          include: { bdr: { select: { name: true, territoryId: true } } },
        },
      },
    };

    const secureQuery = SecurityService.buildSecureQuery(baseQuery, context, Resource.PIPELINE);
    const countQuery = SecurityService.buildSecureQuery({ where }, context, Resource.PIPELINE);

    const [itemsRaw, total] = await Promise.all([
      prisma.pipelineItem.findMany(secureQuery),
      prisma.pipelineItem.count(countQuery),
    ]);

    const mapItem = (item: any): any => ({
      id: item.id,
      name: item.name,
      title: item.title,
      addedDate: item.addedDate,
      lastUpdated: item.lastUpdated,
      bdr: item.bdr?.name || null,
      company: item.company,
      category: item.category,
      status: item.status,
      value: item.value,
      probability: item.probability,
      expectedCloseDate: item.expectedCloseDate,
      callDate: item.callDate,
      link: item.link,
      phone: item.phone,
      notes: item.notes,
      email: item.email,
      leadId: item.leadId,
      parentId: item.parentId,
      isSublist: item.isSublist,
      sublistName: item.sublistName,
      sortOrder: item.sortOrder,
      partnerListSize: item.partnerListSize,
      partnerListSentDate: item.partnerListSentDate,
      firstSaleDate: item.firstSaleDate,
      totalSalesFromList: item.totalSalesFromList,
      children: Array.isArray(item.children) ? item.children.map(mapItem) : [],
    });

    const items = itemsRaw.map(mapItem);
    const totalPages = Math.ceil(total / pageSize);

    return new NextResponse(
      JSON.stringify({ items, total, page, pageSize, totalPages }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'private, max-age=15, stale-while-revalidate=30',
        },
      }
    );
  }, req);
}

export async function POST(request: NextRequest) {
  return withSecurity(Resource.PIPELINE, Action.CREATE, async (context) => {
    try {
      const body = await request.json();
      
      // Check if this is a sublist creation or regular pipeline item
      if (body.isSublist) {
        // Handle sublist creation
        const validatedData = createSublistSchema.parse(body);
        
        // Find the BDR user by name
        const bdrUser = await prisma.user.findFirst({
          where: { name: validatedData.bdr }
        });
        
        if (!bdrUser) {
          return NextResponse.json(
            { error: `BDR "${validatedData.bdr}" not found` },
            { status: 400 }
          );
        }
        
        // Create the sublist
        const sublist = await prisma.pipelineItem.create({
          data: {
            name: validatedData.name,
            bdrId: bdrUser.id,
            category: validatedData.category,
            status: validatedData.status,
            parentId: validatedData.parentId,
            isSublist: true,
            sublistName: validatedData.name,
            sortOrder: validatedData.sortOrder,
            // Set default values for required fields
            title: null,
            company: null,
            value: null,
            probability: null,
            expectedCloseDate: null,
            callDate: null,
            link: null,
            phone: null,
            notes: `Sublist: ${validatedData.name}`,
            email: null,
            leadId: null,
          },
          include: {
            children: {
              orderBy: {
                sortOrder: 'asc',
              },
            },
            parent: true,
          },
        });

        // Create activity log for sublist creation
        await prisma.activityLog.create({
          data: {
            bdrId: bdrUser.id,
            activityType: 'Note_Added',
            description: `Created sublist: ${validatedData.name}`,
            pipelineItemId: sublist.id,
            notes: `Sublist created in ${validatedData.category} - ${validatedData.status}`,
          },
        });

        return NextResponse.json(sublist);
      } else {
        // Handle regular pipeline item creation
        const validatedData = pipelineSchema.parse(body);
        
        // Find the BDR user by name
        const bdrUser = await prisma.user.findFirst({
          where: { name: validatedData.bdr }
        });
        
        if (!bdrUser) {
          return NextResponse.json(
            { error: `BDR "${validatedData.bdr}" not found` },
            { status: 400 }
          );
        }
        
        // Create the pipeline item
        const pipelineItem = await prisma.pipelineItem.create({
          data: {
            name: validatedData.name,
            bdrId: bdrUser.id,
            company: validatedData.company,
            category: validatedData.category,
            status: validatedData.status,
            value: validatedData.value,
            notes: validatedData.notes,
            link: validatedData.link,
            phone: validatedData.phone,
            email: validatedData.email,
            callDate: validatedData.callDate,
            isSublist: false,
          },
          include: {
            bdr: { select: { name: true, territoryId: true } },
            children: {
              orderBy: { sortOrder: 'asc' },
            },
            parent: true,
          },
        });

        // Create activity log for pipeline item creation
        await prisma.activityLog.create({
          data: {
            bdrId: bdrUser.id,
            activityType: 'Note_Added',
            description: `Created pipeline item: ${validatedData.name}`,
            pipelineItemId: pipelineItem.id,
            notes: `Pipeline item created in ${validatedData.category} - ${validatedData.status}`,
          },
        });

        return NextResponse.json(pipelineItem);
      }
    } catch (error) {
      console.error('Error creating pipeline item:', error);
      
      if (error instanceof Error) {
        return NextResponse.json(
          { error: error.message },
          { status: 400 }
        );
      }
      
      return NextResponse.json(
        { error: 'Failed to create pipeline item' },
        { status: 500 }
      );
    } finally {
      await prisma.$disconnect();
    }
  }, request);
} 