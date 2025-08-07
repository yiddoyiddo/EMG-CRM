import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { createLeadSchema } from "@/lib/validations";
import { NextRequest } from "next/server";
import { Role } from "@prisma/client";

// GET - List leads with filters
export async function GET(req: NextRequest) {
  try {
    // 1. Get Session securely on the server
    const session = await getServerSession(authOptions);

    // 2. Check Authentication
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { role, id: userId, name: userName } = session.user;

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || undefined;
    const source = searchParams.get('source') || undefined;
    const bdr = searchParams.get('bdr') || undefined;
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '10');
    const skip = (page - 1) * pageSize;
    
    // 3. Enforce Authorization (RBAC) - Build where clause with role-based filtering
    const where: any = {};
    
    // Role-based data filtering
    if (role === Role.BDR) {
      // BDRs can only see their own leads
      where.bdr = userName; // Use the user's name as the BDR filter
    } else if (role === Role.ADMIN) {
      // Admins can see all leads - no additional filtering
    } else {
      // Unknown role - deny access
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Apply search filters
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { company: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (status) where.status = status;
    if (source) where.source = source;
    
    // Note: For BDRs, we ignore the 'bdr' filter param since they can only see their own data
    // For Admins, we can still apply the bdr filter if provided
    if (bdr && role === Role.ADMIN) {
      where.bdr = bdr; // This is now a string field
    }
    
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
      select: {
        id: true,
        name: true,
        title: true,
        addedDate: true,
        bdr: true, // This is now a string field
        company: true,
        source: true,
        status: true,
        link: true,
        phone: true,
        notes: true,
        email: true,
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

    // Calculate total pages
    const totalPages = Math.ceil(total / pageSize);
    
    return NextResponse.json({
      leads: transformedLeads,
      total,
      page,
      pageSize,
      totalPages,
    });
  } catch (error: any) {
    console.error("Error fetching leads:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch leads" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    // 1. Get Session securely on the server
    const session = await getServerSession(authOptions);

    // 2. Check Authentication
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { role, id: userId, name: userName } = session.user;
    const data = await req.json();
    
    // Validate the request body
    const validatedData = createLeadSchema.parse(data);
    
    // 3. Enforce Authorization (RBAC) for lead creation
    let leadData = { ...validatedData };
    
    if (role === Role.BDR) {
      // BDRs can only create leads assigned to themselves
      leadData.bdr = userName; // Use the user's name as the BDR
    } else if (role === Role.ADMIN) {
      // Admins can assign leads to any BDR
      // Use the provided bdr or assign to themselves if not provided
      if (!leadData.bdr) {
        leadData.bdr = userName;
      }
    } else {
      // Unknown role - deny access
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    
    // Create the lead
    const lead = await prisma.lead.create({
      data: {
        name: leadData.name,
        title: leadData.title,
        bdr: leadData.bdr, // This is now a string field
        company: leadData.company,
        source: leadData.source,
        status: leadData.status,
        link: leadData.link,
        phone: leadData.phone,
        notes: leadData.notes,
        email: leadData.email,
      }
    });
    
    return NextResponse.json(lead, { status: 201 });
  } catch (error: any) {
    console.error("Error creating lead:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create lead" },
      { status: 400 }
    );
  }
} 