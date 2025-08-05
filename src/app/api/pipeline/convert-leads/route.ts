import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { z } from "zod";
import { leadStatusEnum, pipelineCategoryEnum, pipelineStatusEnum } from "@/lib/validations";

// Schema for validation
const bulkConvertLeadSchema = z.object({
  leadIds: z.array(z.number()),
});

// Function to determine pipeline category and status based on lead status
function determinePipelineDetails(leadStatus: string): { category: string; status: string } {
  switch (leadStatus) {
    case "Proposal - Profile":
      return {
        category: "Pipeline",
        status: "Proposal - Profile"
      };
    case "Proposal - Media Sales":
      return {
        category: "Pipeline",
        status: "Proposal - Media"
      };
    case "Agreement - Profile":
      return {
        category: "Pipeline",
        status: "Agreement - Profile"
      };
    case "List Out":
      return {
        category: "Lists_Media_QA",
        status: "List Out"
      };
    case "Sold":
      return {
        category: "Lists_Media_QA",
        status: "Sold"
      };
    case "Call Booked":
      return {
        category: "Calls",
        status: "Call Booked"
      };
    case "DECLINED":
      return {
        category: "Declined_Rescheduled",
        status: "Declined_Rescheduled"
      };
    default:
      // For "BDR Followed Up" and "Passed Over", start with a call
      return {
        category: "Calls",
        status: "Call Proposed"
      };
  }
}

export async function POST(req: NextRequest) {
  try {
    const data = await req.json();
    
    // Validate the request body
    const validatedData = bulkConvertLeadSchema.parse(data);
    
    // Find all leads
    const leads = await prisma.lead.findMany({
      where: { 
        id: { in: validatedData.leadIds },
        bdr: { not: null } // Ensure all leads have BDRs assigned
      },
    });
    
    if (leads.length === 0) {
      return NextResponse.json({ error: "No valid leads found" }, { status: 404 });
    }

    if (leads.length !== validatedData.leadIds.length) {
      return NextResponse.json({ 
        error: "Some leads were not found or don't have BDRs assigned" 
      }, { status: 400 });
    }
    
    // Create pipeline items in a transaction
    const result = await prisma.$transaction(async (tx) => {
      const pipelineItems = await Promise.all(
        leads.map(async (lead) => {
          // Determine pipeline category and status based on lead status
          const { category, status } = determinePipelineDetails(lead.status);

          // Create pipeline item
          const pipelineItem = await tx.pipelineItem.create({
            data: {
              name: lead.name,
              title: lead.title,
              bdr: lead.bdr!, // We know it's not null from the query
              company: lead.company,
              category: category as typeof pipelineCategoryEnum[number],
              status: status,
              link: lead.link,
              phone: lead.phone,
              notes: lead.notes,
              email: lead.email,
              leadId: lead.id,
              lastUpdated: new Date(),
            },
          });

          // Transfer activity logs (updates) from lead to pipeline item
          const activityLogs = await tx.activityLog.findMany({
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
                tx.activityLog.create({
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
          await tx.activityLog.create({
            data: {
              bdr: lead.bdr!,
              activityType: "Lead_Converted",
              description: `Converted lead to ${category} (${status})`,
              leadId: lead.id,
              pipelineItemId: pipelineItem.id,
              newCategory: category,
              newStatus: status,
              notes: `Lead converted to pipeline item with ID: ${pipelineItem.id}`
            },
          });

          return pipelineItem;
        })
      );

      return pipelineItems;
    });
    
    return NextResponse.json({
      message: `Converted ${result.length} leads to pipeline items`,
      items: result
    }, { status: 201 });
  } catch (error: any) {
    console.error("Error converting leads to pipeline items:", error);
    return NextResponse.json(
      { error: error.message || "Failed to convert leads" },
      { status: 400 }
    );
  }
} 