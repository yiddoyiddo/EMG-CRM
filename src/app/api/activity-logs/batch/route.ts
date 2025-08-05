import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const pipelineItemIds = searchParams.get('pipelineItemIds');
    
    if (!pipelineItemIds) {
      return NextResponse.json(
        { error: "pipelineItemIds parameter is required" },
        { status: 400 }
      );
    }
    
    const ids = pipelineItemIds.split(',').map(id => Number(id)).filter(id => !isNaN(id));
    
    if (ids.length === 0) {
      return NextResponse.json({ logs: [] });
    }
    
    // Get activity logs for all pipeline items in a single query
    const logs = await prisma.activityLog.findMany({
      where: {
        pipelineItemId: { in: ids }
      },
      orderBy: { timestamp: 'desc' },
      include: {
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
    
    // Group logs by pipeline item ID
    const groupedLogs = logs.reduce((acc: Record<number, typeof logs>, log: any) => {
      if (log.pipelineItemId) {
        if (!acc[log.pipelineItemId]) {
          acc[log.pipelineItemId] = [];
        }
        acc[log.pipelineItemId].push(log);
      }
      return acc;
    }, {} as Record<number, typeof logs>);
    
    return NextResponse.json({ groupedLogs });
  } catch (error: any) {
    console.error("Error fetching batch activity logs:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch batch activity logs" },
      { status: 500 }
    );
  }
} 