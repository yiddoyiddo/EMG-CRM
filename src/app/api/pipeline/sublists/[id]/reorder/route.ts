import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const sublistId = parseInt(resolvedParams.id);
    const body = await request.json();
    const { itemOrder } = body;

    if (isNaN(sublistId)) {
      return NextResponse.json(
        { error: 'Invalid sublist ID' },
        { status: 400 }
      );
    }

    if (!Array.isArray(itemOrder)) {
      return NextResponse.json(
        { error: 'itemOrder must be an array' },
        { status: 400 }
      );
    }

    // Check if the sublist exists
    const sublist = await prisma.pipelineItem.findUnique({
      where: { id: sublistId },
    });

    if (!sublist) {
      return NextResponse.json(
        { error: 'Sublist not found' },
        { status: 404 }
      );
    }

    if (!sublist.isSublist) {
      return NextResponse.json(
        { error: 'Item is not a sublist' },
        { status: 400 }
      );
    }

    // Update sort order for each item
    const updatePromises = itemOrder.map(({ id, sortOrder }) =>
      prisma.pipelineItem.update({
        where: { id: parseInt(id) },
        data: { sortOrder },
      })
    );

    await Promise.all(updatePromises);

    // Create activity log
    await prisma.activityLog.create({
      data: {
        bdr: sublist.bdr,
        activityType: 'Note_Added',
        description: `Reordered items in sublist: ${sublist.sublistName || sublist.name}`,
        pipelineItemId: sublistId,
        notes: `${itemOrder.length} items reordered`,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error reordering sublist items:', error);
    
    return NextResponse.json(
      { error: 'Failed to reorder sublist items' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
} 