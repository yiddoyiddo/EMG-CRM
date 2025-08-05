import { prisma } from "@/lib/db";
import { leadStatusEnum } from "@/lib/validations";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const bulkUpdateSchema = z.object({
  ids: z.array(z.number()),
  status: z.enum(leadStatusEnum),
});

// PATCH - Bulk update leads status
export async function PATCH(req: NextRequest) {
  try {
    const data = await req.json();
    
    // Validate the data
    const { ids, status } = bulkUpdateSchema.parse(data);
    
    // No IDs provided
    if (ids.length === 0) {
      return NextResponse.json(
        { error: "No lead IDs provided" },
        { status: 400 }
      );
    }
    
    // Get existing leads to track status changes
    const existingLeads = await prisma.lead.findMany({
      where: { id: { in: ids } },
      select: { id: true, status: true, bdr: true }
    });
    
    // Update all leads with the provided IDs
    const result = await prisma.lead.updateMany({
      where: {
        id: { in: ids },
      },
      data: { status },
    });
    
    // Create activity logs for status transitions
    const activityLogs = [];
    for (const lead of existingLeads) {
      if (lead.status !== status) {
        // Create status change activity log
        activityLogs.push({
          bdr: lead.bdr || 'Unknown',
          activityType: 'Status_Change',
          description: `Lead status changed from ${lead.status} to ${status}`,
          previousStatus: lead.status,
          newStatus: status,
          leadId: lead.id,
          timestamp: new Date(),
        });
        
        // If this is a transition from "Call Booked" to a completion status (excluding no show/rescheduled),
        // also create a Call_Completed activity log
        if (lead.status === 'Call Booked' && 
            status !== 'Call Booked' && 
            !['no show', 'rescheduled', 'No Show', 'Rescheduled'].includes(status.toLowerCase())) {
          activityLogs.push({
            bdr: lead.bdr || 'Unknown',
            activityType: 'Call_Completed',
            description: `Call completed automatically: ${lead.status} → ${status}`,
            previousStatus: lead.status,
            newStatus: status,
            leadId: lead.id,
            timestamp: new Date(),
          });
        }
      }
    }
    
    // Create all activity logs in a transaction
    if (activityLogs.length > 0) {
      await prisma.activityLog.createMany({
        data: activityLogs,
      });
    }
    
    return NextResponse.json({
      message: `Updated ${result.count} leads`,
      count: result.count,
      activityLogsCreated: activityLogs.length,
    });
    
  } catch (error: any) {
    console.error("Error bulk updating leads:", error);
    
    // Handle validation errors
    if (error.name === "ZodError") {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: "Failed to update leads" },
      { status: 500 }
    );
  }
} 