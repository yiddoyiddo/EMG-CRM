import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

interface RouteParams {
  params: {
    id: string;
  };
}

// GET - Fetch a specific pipeline item
export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const resolvedParams = await params;
    const id = resolvedParams.id;
    const pipelineItemId = Number(id);
    
    if (isNaN(pipelineItemId)) {
      return NextResponse.json(
        { error: "Invalid pipeline item ID" },
        { status: 400 }
      );
    }
    
    const pipelineItem = await prisma.pipelineItem.findUnique({
      where: { id: pipelineItemId },
      include: {
        children: true,
      },
    });
    
    if (!pipelineItem) {
      return NextResponse.json(
        { error: "Pipeline item not found" },
        { status: 404 }
      );
    }
    
    return NextResponse.json(pipelineItem);
    
  } catch (error) {
    console.error("Error fetching pipeline item:", error);
    return NextResponse.json(
      { error: "Failed to fetch pipeline item" },
      { status: 500 }
    );
  }
}

// PUT - Update a pipeline item
export async function PUT(req: NextRequest, { params }: RouteParams) {
  try {
    const resolvedParams = await params;
    const id = resolvedParams.id;
    const pipelineItemId = Number(id);
    
    if (isNaN(pipelineItemId)) {
      return NextResponse.json(
        { error: "Invalid pipeline item ID" },
        { status: 400 }
      );
    }
    
    const data = await req.json();
    
    // Get the existing pipeline item first
    const existingItem = await prisma.pipelineItem.findUnique({
      where: { id: pipelineItemId },
    });
    
    if (!existingItem) {
      return NextResponse.json(
        { error: "Pipeline item not found" },
        { status: 404 }
      );
    }
    
    // Check if status is changing
    const statusChanged = existingItem.status !== data.status;
    const previousStatus = existingItem.status;
    const newStatus = data.status;
    
    // Update the pipeline item with all possible fields
    const pipelineItem = await prisma.pipelineItem.update({
      where: { id: pipelineItemId },
      data: {
        name: data.name,
        company: data.company,
        title: data.title,
        category: data.category,
        status: data.status,
        value: data.value,
        probability: data.probability,
        expectedCloseDate: data.expectedCloseDate,
        callDate: data.callDate,
        link: data.link,
        phone: data.phone,
        notes: data.notes,
        email: data.email,
        lastUpdated: new Date(),
      },
      include: {
        lead: true,
        activityLogs: {
          orderBy: {
            timestamp: 'desc'
          }
        }
      }
    });
    
    // If status changed, create an activity log for the status transition
    if (statusChanged) {
      await prisma.activityLog.create({
        data: {
          bdr: pipelineItem.bdr,
          activityType: 'Status_Change',
          description: `Status changed from ${previousStatus} to ${newStatus}`,
          previousStatus: previousStatus,
          newStatus: newStatus,
          previousCategory: existingItem.category,
          newCategory: data.category,
          pipelineItemId: pipelineItemId,
          leadId: pipelineItem.leadId,
          timestamp: new Date(),
        },
      });
      
      // If this is a transition from "Call Booked" to a completion status (excluding no show/rescheduled),
      // also create a Call_Completed activity log
      if (previousStatus === 'Call Booked' && 
          newStatus !== 'Call Booked' && 
          !['no show', 'rescheduled', 'No Show', 'Rescheduled'].includes(newStatus.toLowerCase())) {
        await prisma.activityLog.create({
          data: {
            bdr: pipelineItem.bdr,
            activityType: 'Call_Completed',
            description: `Call completed automatically: ${previousStatus} → ${newStatus}`,
            previousStatus: previousStatus,
            newStatus: newStatus,
            previousCategory: existingItem.category,
            newCategory: data.category,
            pipelineItemId: pipelineItemId,
            leadId: pipelineItem.leadId,
            timestamp: new Date(),
          },
        });
      }
    }
    
    return NextResponse.json(pipelineItem);
    
  } catch (error) {
    console.error("Error updating pipeline item:", error);
    return NextResponse.json(
      { error: "Failed to update pipeline item" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    const resolvedParams = await params;
    const id = resolvedParams.id;
    const pipelineId = Number(id);
    
    if (isNaN(pipelineId)) {
      return NextResponse.json({ error: "Invalid pipeline item ID" }, { status: 400 });
    }
    
    await prisma.pipelineItem.delete({
      where: { id: pipelineId },
    });
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting pipeline item:", error);
    return NextResponse.json(
      { error: error.message || "Failed to delete pipeline item" },
      { status: 500 }
    );
  }
} 