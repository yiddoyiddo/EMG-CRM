import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { createSublistSchema } from '@/lib/validations';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate the request body
    const validatedData = createSublistSchema.parse(body);
    
    // Find the BDR user by name
    const bdrUser = await prisma.user.findFirst({
      where: { name: validatedData.bdr }
    });
    
    if (!bdrUser) {
      return NextResponse.json(
        { error: `BDR "${validatedData.bdr}" not found` },
        { status: 400 }
      );
    }
    
    // Create the sublist
    const sublist = await prisma.pipelineItem.create({
      data: {
        name: validatedData.name,
        bdrId: bdrUser.id,
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
        bdrId: bdrUser.id,
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