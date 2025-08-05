import { prisma } from "@/lib/db";
import { createLeadSchema } from "@/lib/validations";
import { NextRequest, NextResponse } from "next/server";

// GET - List leads with filters
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || undefined;
    const source = searchParams.get('source') || undefined;
    const bdr = searchParams.get('bdr') || undefined;
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '10');
    const skip = (page - 1) * pageSize;
    
    // Build where clause
    const where: any = {};
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { company: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (status) where.status = status;
    if (source) where.source = source;
    if (bdr) where.bdr = bdr;
    
    // Get total count
    const total = await prisma.lead.count({ where });
    
    // Get leads with pipeline information
    const leads = await prisma.lead.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: {
        addedDate: 'desc' // Sort by addedDate in descending order (newest first)
      },
      include: {
        pipelineItems: {
          select: {
            id: true,
            category: true,
            status: true,
          }
        }
      }
    });
    
    // Transform the response to include inPipeline flag
    const transformedLeads = leads.map(lead => {
      const { pipelineItems, ...rest } = lead;
      return {
        ...rest,
        inPipeline: pipelineItems.length > 0,
        pipelineStatus: pipelineItems[0]?.status || null,
        pipelineCategory: pipelineItems[0]?.category || null,
      };
    });
    
    return NextResponse.json({
      leads: transformedLeads,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize)
    });
    
  } catch (error: any) {
    console.error("Error fetching leads:", error);
    return NextResponse.json(
      { error: "Failed to fetch leads" },
      { status: 500 }
    );
  }
}

// POST - Create a new lead
export async function POST(req: NextRequest) {
  try {
    const data = await req.json();
    
    // Validate the lead data
    const validatedData = createLeadSchema.parse(data);
    
    // Create the lead
    const lead = await prisma.lead.create({
      data: validatedData,
    });
    
    return NextResponse.json(lead, { status: 201 });
    
  } catch (error: any) {
    console.error("Error creating lead:", error);
    
    // Handle validation errors
    if (error.name === "ZodError") {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: "Failed to create lead" },
      { status: 500 }
    );
  }
} 