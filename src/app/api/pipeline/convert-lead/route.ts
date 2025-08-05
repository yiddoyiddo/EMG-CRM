import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { z } from "zod";
import { allPipelineStatusValues, pipelineCategoryEnum } from "@/lib/validations";

// Schema for validation
const convertLeadSchema = z.object({
  leadId: z.number(),
  category: z.enum(pipelineCategoryEnum),
  status: z.string().refine(value => allPipelineStatusValues.includes(value as any), {
    message: "Invalid status for pipeline item",
  }),
});

export async function POST(req: NextRequest) {
  try {
    const data = await req.json();
    
    // Validate the request body
    const validatedData = convertLeadSchema.parse(data);
    
    // Find the lead
    const lead = await prisma.lead.findUnique({
      where: { id: validatedData.leadId },
    });
    
    if (!lead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    // Check if BDR is assigned
    if (!lead.bdr) {
      return NextResponse.json({ error: "A BDR must be assigned to this lead before moving to pipeline" }, { status: 400 });
    }
    
    // Create a pipeline item from the lead
    const pipelineItem = await prisma.pipelineItem.create({
      data: {
        name: lead.name,
        title: lead.title,
        bdr: lead.bdr, // BDR is required in pipeline
        company: lead.company,
        category: validatedData.category,
        status: validatedData.status,
        link: lead.link,
        phone: lead.phone,
        notes: lead.notes,
        email: lead.email,
        leadId: lead.id,
        lastUpdated: new Date(),
      },
    });
    
    // Transfer activity logs (updates) from lead to pipeline item
    const activityLogs = await prisma.activityLog.findMany({
      where: {
        leadId: lead.id,
        activityType: 'BDR_Update'
      },
      orderBy: { timestamp: 'asc' }
    });
    
    // Create new activity logs for the pipeline item with the same content
    if (activityLogs.length > 0) {
      await Promise.all(
        activityLogs.map(log =>
          prisma.activityLog.create({
            data: {
              bdr: log.bdr,
              activityType: log.activityType,
              description: log.description,
              notes: log.notes,
              pipelineItemId: pipelineItem.id,
              timestamp: log.timestamp, // Preserve original timestamp
            },
          })
        )
      );
    }
    
    // Log the activity
    await prisma.activityLog.create({
      data: {
        bdr: lead.bdr,
        activityType: "Lead_Converted",
        description: `Converted lead to ${validatedData.category} (${validatedData.status})`,
        leadId: lead.id,
        pipelineItemId: pipelineItem.id,
        newCategory: validatedData.category,
        newStatus: validatedData.status,
        notes: `Lead converted to pipeline item with ID: ${pipelineItem.id}`
      },
    });
    
    return NextResponse.json(pipelineItem, { status: 201 });
  } catch (error: any) {
    console.error("Error converting lead to pipeline item:", error);
    return NextResponse.json(
      { error: error.message || "Failed to convert lead" },
      { status: 400 }
    );
  }
} 