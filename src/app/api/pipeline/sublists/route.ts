import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { createSublistSchema } from '@/lib/validations';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate the request body
    const validatedData = createSublistSchema.parse(body);
    
    // Create the sublist
    const sublist = await prisma.pipelineItem.create({
      data: {
        name: validatedData.name,
        bdr: validatedData.bdr,
        category: validatedData.category,
        status: validatedData.status,
        parentId: validatedData.parentId,
        isSublist: true,
        sublistName: validatedData.name,
        sortOrder: validatedData.sortOrder,
        // Set default values for required fields
        title: null,
        company: null,
        value: null,
        probability: null,
        expectedCloseDate: null,
        callDate: null,
        link: null,
        phone: null,
        notes: `Sublist: ${validatedData.name}`,
        email: null,
        leadId: null,
      },
      include: {
        children: {
          orderBy: {
            sortOrder: 'asc',
          },
        },
        parent: true,
      },
    });

    // Create activity log for sublist creation
    await prisma.activityLog.create({
      data: {
        bdr: validatedData.bdr,
        activityType: 'Note_Added',
        description: `Created sublist: ${validatedData.name}`,
        pipelineItemId: sublist.id,
        notes: `Sublist created in ${validatedData.category} - ${validatedData.status}`,
      },
    });

    return NextResponse.json(sublist);
  } catch (error) {
    console.error('Error creating sublist:', error);
    
    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to create sublist' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
} 