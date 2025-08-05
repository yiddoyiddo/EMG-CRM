import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

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
    // Get all leads that have already been converted to pipeline
    const convertedLeadIds = await prisma.$queryRaw`
      SELECT "leadId" FROM "PipelineItem" WHERE "leadId" IS NOT NULL
    `;
    
    const leadIdsToExclude = (convertedLeadIds as any[])
      .map((item: any) => item.leadId)
      .filter(Boolean);
    
    // Find all leads that have BDRs assigned and are not in pipeline
    const leads = await prisma.lead.findMany({
      where: {
        bdr: { not: null },
        NOT: {
          id: { in: leadIdsToExclude }
        }
      },
    });
    
    if (leads.length === 0) {
      return NextResponse.json({ 
        message: "No leads found to convert" 
      }, { status: 200 });
    }

    // Create pipeline items for each lead
    const createdItems = [];
    
    for (const lead of leads) {
      try {
        // Determine pipeline category and status based on lead status
        const { category, status } = determinePipelineDetails(lead.status);

        // Create pipeline item
        const pipelineItemData = {
          name: lead.name,
          title: lead.title,
          bdr: lead.bdr!, // We know it's not null from the query
          company: lead.company,
          category: category,
          status: status,
          link: lead.link,
          phone: lead.phone,
          notes: lead.notes,
          email: lead.email,
          leadId: lead.id,
          lastUpdated: new Date(),
        };

        // Use raw SQL to create pipeline item
        const result = await prisma.$queryRaw`
          INSERT INTO "PipelineItem" (
            "name", "title", "bdr", "company", "category", "status", 
            "link", "phone", "notes", "email", "leadId", "lastUpdated", "addedDate"
          ) VALUES (
            ${pipelineItemData.name},
            ${pipelineItemData.title},
            ${pipelineItemData.bdr},
            ${pipelineItemData.company},
            ${pipelineItemData.category},
            ${pipelineItemData.status},
            ${pipelineItemData.link},
            ${pipelineItemData.phone},
            ${pipelineItemData.notes},
            ${pipelineItemData.email},
            ${pipelineItemData.leadId},
            ${pipelineItemData.lastUpdated},
            ${new Date()}
          )
          RETURNING *
        `;
        
        const pipelineItem = Array.isArray(result) ? result[0] : result;

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
                  pipelineItemId: (pipelineItem as any).id,
                  timestamp: log.timestamp, // Preserve original timestamp
                },
              })
            )
          );
        }

        // Use raw SQL to create activity log
        await prisma.$queryRaw`
          INSERT INTO "ActivityLog" (
            "bdr", "activityType", "description", "leadId", "pipelineItemId",
            "newCategory", "newStatus", "notes", "timestamp"
          ) VALUES (
            ${lead.bdr!},
            ${'Lead_Converted'},
            ${`Converted lead to ${category} (${status})`},
            ${lead.id},
            ${(pipelineItem as any).id},
            ${category},
            ${status},
            ${`Lead converted to pipeline item with ID: ${(pipelineItem as any).id}`},
            ${new Date()}
          )
        `;

        createdItems.push(pipelineItem);
      } catch (error) {
        console.error(`Error converting lead ${lead.id}:`, error);
        // Continue with next lead
      }
    }
    
    return NextResponse.json({
      message: `Converted ${createdItems.length} leads to pipeline items`,
      items: createdItems
    }, { status: 201 });
  } catch (error: any) {
    console.error("Error converting leads to pipeline items:", error);
    return NextResponse.json(
      { error: error.message || "Failed to convert leads" },
      { status: 400 }
    );
  }
} 