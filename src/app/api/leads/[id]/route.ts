import { prisma } from "@/lib/db";
import { updateLeadSchema } from "@/lib/validations";
import { NextRequest, NextResponse } from "next/server";
import { PERMISSIONS, hasPermission } from "@/lib/permissions";
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';

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

    // Notify finance viewers if notes indicate a deal was added
    try {
      const session = await getServerSession(authOptions);
      const updatedNotes: string = (data?.notes ?? '').toString();
      const previousNotes: string = (existingLead?.notes ?? '').toString();
      const notesChanged = updatedNotes !== previousNotes;
      const dealKeywords = [
        /\bdeal\b/i,
        /\bsold\b/i,
        /\bagreement\b/i,
        /\binvoice\b/i,
        /\bgbp\b/i,
        /\bamount\b/i,
      ];
      const hasDealSignal = notesChanged && dealKeywords.some((re) => re.test(updatedNotes));
      if (hasDealSignal) {
        // Find all users with finance board access (READ on FINANCE)
        const financeUsers = await prisma.user.findMany({
          where: { isActive: true },
          select: { id: true, role: true },
        });
        const recipients = financeUsers
          .filter((u) => hasPermission(u as any, 2 /* Resource.FINANCE */ as any, 1 /* Action.READ */ as any))
          .map((u) => u.id);
        // Emit ephemeral notifications via existing notifications endpoint contract (no DB persistence)
        const title = 'Deal activity on lead notes';
        const msg = `Lead ${lead.name} (${lead.company || 'Unknown'}) notes indicate a deal update.`;
        // Best-effort fire-and-forget post per recipient
        await Promise.all(
          recipients.map((uid) =>
            fetch(`${process.env.NEXT_PUBLIC_BASE_URL || ''}/api/reporting/advanced/notifications`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ userId: uid, type: 'info', title, message: msg, priority: 'high' }),
            }).catch(() => null)
          )
        );
      }
    } catch (e) {
      // Do not fail lead update on notification error
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