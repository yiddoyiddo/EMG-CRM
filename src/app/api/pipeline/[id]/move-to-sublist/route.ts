import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const itemId = parseInt(resolvedParams.id);
    const body = await request.json();
    const { sublistId, sortOrder } = body;

    if (isNaN(itemId)) {
      return NextResponse.json(
        { error: 'Invalid item ID' },
        { status: 400 }
      );
    }

    // Check if the item exists
    const item = await prisma.pipelineItem.findUnique({
      where: { id: itemId },
    });

    if (!item) {
      return NextResponse.json(
        { error: 'Pipeline item not found' },
        { status: 404 }
      );
    }

    // If sublistId is provided, verify it exists and is a sublist
    if (sublistId) {
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
          { error: 'Target is not a sublist' },
          { status: 400 }
        );
      }
    }

    // Update the item's parent and sort order
    const updatedItem = await prisma.pipelineItem.update({
      where: { id: itemId },
      data: {
        parentId: sublistId || null,
        sortOrder: sortOrder || null,
      },
      include: {
        parent: true,
        children: true,
      },
    });

    // Create activity log
    const logDescription = sublistId 
      ? `Moved item to sublist`
      : `Removed item from sublist`;
    
    await prisma.activityLog.create({
      data: {
        bdr: item.bdr,
        activityType: 'Note_Added',
        description: logDescription,
        pipelineItemId: itemId,
        notes: `Item organization updated`,
      },
    });

    return NextResponse.json(updatedItem);
  } catch (error) {
    console.error('Error moving item to sublist:', error);
    
    return NextResponse.json(
      { error: 'Failed to move item to sublist' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
} 