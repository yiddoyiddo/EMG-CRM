import { prisma } from "@/lib/db";
import { updateLeadSchema } from "@/lib/validations";
import { NextRequest, NextResponse } from "next/server";

interface RouteParams {
  params: {
    id: string;
  };
}

// GET - Fetch a specific lead
export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const resolvedParams = await params;
    const id = resolvedParams.id;
    const leadId = Number(id);
    
    if (isNaN(leadId)) {
      return NextResponse.json(
        { error: "Invalid lead ID" },
        { status: 400 }
      );
    }
    
    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
    });
    
    if (!lead) {
      return NextResponse.json(
        { error: "Lead not found" },
        { status: 404 }
      );
    }
    
    return NextResponse.json(lead);
    
  } catch (error) {
    console.error("Error fetching lead:", error);
    return NextResponse.json(
      { error: "Failed to fetch lead" },
      { status: 500 }
    );
  }
}

// PUT - Update a lead
export async function PUT(req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = params;
    const leadId = Number(id);
    
    if (isNaN(leadId)) {
      return NextResponse.json(
        { error: "Invalid lead ID" },
        { status: 400 }
      );
    }
    
    const data = await req.json();
    
    // Get the existing lead data first
    const existingLead = await prisma.lead.findUnique({
      where: { id: leadId },
    });
    
    if (!existingLead) {
      return NextResponse.json(
        { error: "Lead not found" },
        { status: 404 }
      );
    }
    
    // Check if status is changing
    const statusChanged = existingLead.status !== data.status;
    const previousStatus = existingLead.status;
    const newStatus = data.status;
    
    // Merge the existing data with the partial update
    const mergedData = {
      ...existingLead,
      ...data,
      id: leadId,
    };
    
    // Validate the merged data
    const validatedData = updateLeadSchema.parse(mergedData);
    
    // Update the lead
    const lead = await prisma.lead.update({
      where: { id: leadId },
      data: {
        name: validatedData.name,
        title: validatedData.title,
        bdr: validatedData.bdr,
        company: validatedData.company,
        source: validatedData.source,
        status: validatedData.status,
        link: validatedData.link,
        phone: validatedData.phone,
        notes: validatedData.notes,
        email: validatedData.email,
      },
    });
    
    // If status changed, create an activity log for the status transition
    if (statusChanged) {
      await prisma.activityLog.create({
        data: {
          bdr: lead.bdr || 'Unknown',
          activityType: 'Status_Change',
          description: `Lead status changed from ${previousStatus} to ${newStatus}`,
          previousStatus: previousStatus,
          newStatus: newStatus,
          leadId: leadId,
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
            bdr: lead.bdr || 'Unknown',
            activityType: 'Call_Completed',
            description: `Call completed automatically: ${previousStatus} → ${newStatus}`,
            previousStatus: previousStatus,
            newStatus: newStatus,
            leadId: leadId,
            timestamp: new Date(),
          },
        });
      }
    }
    
    return NextResponse.json(lead);
    
  } catch (error: any) {
    console.error("Error updating lead:", error);
    
    // Handle validation errors
    if (error.name === "ZodError") {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }
    
    // Handle Prisma errors
    if (error.code === "P2025") {
      return NextResponse.json(
        { error: "Lead not found" },
        { status: 404 }
      );
    }
    
    return NextResponse.json(
      { error: "Failed to update lead" },
      { status: 500 }
    );
  }
}

// DELETE - Delete a lead
export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = params;
    const leadId = Number(id);
    
    if (isNaN(leadId)) {
      return NextResponse.json(
        { error: "Invalid lead ID" },
        { status: 400 }
      );
    }
    
    await prisma.lead.delete({
      where: { id: leadId },
    });
    
    return NextResponse.json({ message: "Lead deleted" }, { status: 200 });
    
  } catch (error: any) {
    console.error("Error deleting lead:", error);
    
    // Handle Prisma errors
    if (error.code === "P2025") {
      return NextResponse.json(
        { error: "Lead not found" },
        { status: 404 }
      );
    }
    
    return NextResponse.json(
      { error: "Failed to delete lead" },
      { status: 500 }
    );
  }
} 