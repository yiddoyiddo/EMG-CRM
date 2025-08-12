import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { pipelineCategoryEnum } from "@/lib/validations";
import { z } from "zod";

interface RouteParams {
  params: {
    id: string;
  };
}

// Schema for validation
const movePipelineItemSchema = z.object({
  newCategory: z.enum(pipelineCategoryEnum),
  newStatus: z.string(),
});

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  try {
    const resolvedParams = await params;
    const id = resolvedParams.id;
    const pipelineId = Number(id);
    
    if (isNaN(pipelineId)) {
      return NextResponse.json({ error: "Invalid pipeline item ID" }, { status: 400 });
    }
    
    // Find the pipeline item first to get current values
    const pipelineItem = await prisma.pipelineItem.findUnique({
      where: { id: pipelineId },
    });
    
    if (!pipelineItem) {
      return NextResponse.json({ error: "Pipeline item not found" }, { status: 404 });
    }
    
    // Extract and validate request data
    const data = await req.json();
    const validatedData = movePipelineItemSchema.parse(data);
    
    // Store previous values for logging
    const previousCategory = pipelineItem.category;
    const previousStatus = pipelineItem.status;
    
    // Update the pipeline item
    const updatedPipelineItem = await prisma.pipelineItem.update({
      where: { id: pipelineId },
      data: {
        category: validatedData.newCategory,
        status: validatedData.newStatus,
        lastUpdated: new Date(),
      },
    });
    
    // Create activity log entry for pipeline move
    await prisma.activityLog.create({
      data: {
        bdr: pipelineItem.bdr,
        activityType: "Pipeline_Move",
        description: `Moved from ${previousCategory} (${previousStatus}) to ${validatedData.newCategory} (${validatedData.newStatus})`,
        pipelineItemId: pipelineId,
        previousCategory,
        newCategory: validatedData.newCategory,
        previousStatus,
        newStatus: validatedData.newStatus,
      },
    });
    
    // If this is a transition from "Call Booked" to a completion status (excluding no show/rescheduled),
    // also create a Call_Completed activity log
    if (previousStatus === 'Call Booked' && 
        validatedData.newStatus !== 'Call Booked' && 
        !['no show', 'rescheduled', 'No Show', 'Rescheduled'].includes(validatedData.newStatus.toLowerCase())) {
      await prisma.activityLog.create({
        data: {
          bdr: pipelineItem.bdr,
          activityType: 'Call_Completed',
          description: `Call completed automatically: ${previousStatus} → ${validatedData.newStatus}`,
          previousStatus: previousStatus,
          newStatus: validatedData.newStatus,
          previousCategory: previousCategory,
          newCategory: validatedData.newCategory,
          pipelineItemId: pipelineId,
          leadId: pipelineItem.leadId,
          timestamp: new Date(),
        },
      });
    }
    
    return NextResponse.json(updatedPipelineItem);
  } catch (error: any) {
    console.error("Error moving pipeline item:", error);
    return NextResponse.json(
      { error: error.message || "Failed to move pipeline item" },
      { status: 400 }
    );
  }
} 