import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createActivityLogSchema, activityLogFilterSchema } from "@/lib/validations";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const bdr = searchParams.get('bdr') || undefined;
    const activityType = searchParams.get('activityType') || undefined;
    const fromDate = searchParams.get('fromDate') ? new Date(searchParams.get('fromDate')!) : undefined;
    const toDate = searchParams.get('toDate') ? new Date(searchParams.get('toDate')!) : undefined;
    const leadId = searchParams.get('leadId') ? Number(searchParams.get('leadId')) : undefined;
    const pipelineItemId = searchParams.get('pipelineItemId') ? Number(searchParams.get('pipelineItemId')) : undefined;
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');
    
    const skip = (page - 1) * pageSize;
    
    // Build the where clause
    const where: any = {};
    
    if (bdr) where.bdr = bdr;
    if (activityType) where.activityType = activityType;
    if (leadId) where.leadId = leadId;
    if (pipelineItemId) where.pipelineItemId = pipelineItemId;
    
    // Date range query
    if (fromDate || toDate) {
      where.timestamp = {};
      if (fromDate) where.timestamp.gte = fromDate;
      if (toDate) where.timestamp.lte = toDate;
    }
    
    // Get total count for pagination
    const total = await prisma.activityLog.count({ where });
    
    // Get activity logs
    const logs = await prisma.activityLog.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: { timestamp: 'desc' },
      include: {
        lead: {
          select: {
            id: true,
            name: true,
            company: true
          }
        },
        pipelineItem: {
          select: {
            id: true,
            name: true,
            company: true,
            category: true,
            status: true
          }
        }
      }
    });
    
    // Calculate total pages
    const totalPages = Math.ceil(total / pageSize);
    
    return NextResponse.json({
      logs,
      total,
      page,
      pageSize,
      totalPages,
    });
  } catch (error: any) {
    console.error("Error fetching activity logs:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch activity logs" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const data = await req.json();
    
    // Validate the request body
    const validatedData = createActivityLogSchema.parse(data);
    
    // Create the activity log and update the pipeline item's lastUpdated
    const [activityLog] = await prisma.$transaction([
      prisma.activityLog.create({
        data: {
          bdr: validatedData.bdr,
          activityType: validatedData.activityType,
          description: validatedData.description,
          scheduledDate: validatedData.scheduledDate,
          completedDate: validatedData.completedDate,
          notes: validatedData.notes,
          leadId: validatedData.leadId,
          pipelineItemId: validatedData.pipelineItemId,
          previousStatus: validatedData.previousStatus,
          newStatus: validatedData.newStatus,
          previousCategory: validatedData.previousCategory,
          newCategory: validatedData.newCategory,
        },
      }),
      // Update lastUpdated on the pipeline item if it exists
      ...(validatedData.pipelineItemId ? [
        prisma.pipelineItem.update({
          where: { id: validatedData.pipelineItemId },
          data: { lastUpdated: new Date() },
        })
      ] : [])
    ]);
    
    return NextResponse.json(activityLog, { status: 201 });
  } catch (error: any) {
    console.error("Error creating activity log:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create activity log" },
      { status: 400 }
    );
  }
} 