import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { createActivityLogSchema } from "@/lib/validations";
import { Role } from "@prisma/client";

export async function GET(req: NextRequest) {
  try {
    // 1. Get Session securely on the server
    const session = await getServerSession(authOptions);

    // 2. Check Authentication
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { role, id: userId } = session.user;

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
    
    // 3. Enforce Authorization (RBAC) - Build where clause with role-based filtering
    const where: Record<string, unknown> = {};

    // Role-based data filtering
    if (role === Role.BDR) {
      // BDRs can only see their own activity logs
      where.bdrId = userId;
    } else if (role === Role.ADMIN) {
      // Admins can see all activity logs - no additional filtering
    } else {
      // Unknown role - deny access
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    
    // Note: For BDRs, we ignore the 'bdr' filter param since they can only see their own data
    // For Admins, we can still apply the bdr filter if provided
    if (bdr && role === Role.ADMIN) {
      where.bdr = { name: bdr };
    }
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
        bdr: {
          select: {
            id: true,
            name: true,
            email: true,
          }
        },
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
    
    // Normalize response: return bdr as a string (name) to match frontend expectations
    const normalizedLogs = logs.map((log) => ({
      ...log,
      bdr: log.bdr?.name || '',
    }));
    
    // Calculate total pages
    const totalPages = Math.ceil(total / pageSize);
    
    return NextResponse.json({
      logs: normalizedLogs,
      total,
      page,
      pageSize,
      totalPages,
    });
  } catch (error) {
    console.error("Error fetching activity logs:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to fetch activity logs";
    return NextResponse.json(
      { error: errorMessage },
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

    const { role, id: userId } = session.user;
    const data = await req.json();
    
    // Validate the request body
    const validatedData = createActivityLogSchema.parse(data);
    
    // 3. Enforce Authorization (RBAC) for activity log creation
    const activityData = { ...validatedData };
    
    if (role === Role.BDR) {
      // BDRs can only create activity logs assigned to themselves
      activityData.bdrId = userId;
    } else if (role === Role.ADMIN) {
      // Admins can assign activity logs to any user
      // Use the provided bdrId or assign to themselves if not provided
      if (!activityData.bdrId) {
        activityData.bdrId = userId;
      }
    } else {
      // Unknown role - deny access
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    
    // Create the activity log and update the pipeline item's lastUpdated
    const [activityLog] = await prisma.$transaction([
      prisma.activityLog.create({
        data: {
          bdrId: activityData.bdrId,
          activityType: activityData.activityType,
          description: activityData.description,
          scheduledDate: activityData.scheduledDate,
          completedDate: activityData.completedDate,
          notes: activityData.notes,
          leadId: activityData.leadId,
          pipelineItemId: activityData.pipelineItemId,
          previousStatus: activityData.previousStatus,
          newStatus: activityData.newStatus,
          previousCategory: activityData.previousCategory,
          newCategory: activityData.newCategory,
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
      }),
      // Update lastUpdated on the pipeline item if it exists
      ...(activityData.pipelineItemId ? [
        prisma.pipelineItem.update({
          where: { id: activityData.pipelineItemId },
          data: { lastUpdated: new Date() },
        })
      ] : [])
    ]);
    
    return NextResponse.json(activityLog, { status: 201 });
  } catch (error) {
    console.error("Error creating activity log:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to create activity log";
    return NextResponse.json(
      { error: errorMessage },
      { status: 400 }
    );
  }
} 