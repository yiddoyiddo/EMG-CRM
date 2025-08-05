import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const sublistId = parseInt(params.id);
    const body = await request.json();
    const { moveItemsTo } = body;

    if (isNaN(sublistId)) {
      return NextResponse.json(
        { error: 'Invalid sublist ID' },
        { status: 400 }
      );
    }

    // Check if the sublist exists and is actually a sublist
    const sublist = await prisma.pipelineItem.findUnique({
      where: { id: sublistId },
      include: {
        children: true,
      },
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

    // Handle moving child items
    if (sublist.children && sublist.children.length > 0) {
      if (moveItemsTo) {
        // Move items to another sublist
        await prisma.pipelineItem.updateMany({
          where: { parentId: sublistId },
          data: { parentId: moveItemsTo },
        });
      } else {
        // Move items out of sublist (make them top-level)
        await prisma.pipelineItem.updateMany({
          where: { parentId: sublistId },
          data: { parentId: null },
        });
      }
    }

    // Create activity log for sublist deletion
    await prisma.activityLog.create({
      data: {
        bdr: sublist.bdr,
        activityType: 'Note_Added',
        description: `Deleted sublist: ${sublist.sublistName || sublist.name}`,
        notes: `Sublist deleted from ${sublist.category} - ${sublist.status}`,
      },
    });

    // Delete the sublist
    await prisma.pipelineItem.delete({
      where: { id: sublistId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting sublist:', error);
    
    return NextResponse.json(
      { error: 'Failed to delete sublist' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
} 