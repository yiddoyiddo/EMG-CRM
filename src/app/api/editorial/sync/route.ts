import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';
import { z } from 'zod';

const syncFromPipelineSchema = z.object({
  pipelineItemId: z.number(),
  force: z.boolean().optional().default(false), // Force create even if already exists
});

// POST /api/editorial/sync - Sync pipeline item to editorial board
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { pipelineItemId, force } = syncFromPipelineSchema.parse(body);

    // Get the pipeline item
    const pipelineItem = await prisma.pipelineItem.findUnique({
      where: { id: pipelineItemId },
      include: {
        bdr: {
          select: { id: true, name: true, email: true }
        },
        lead: {
          select: { id: true, name: true, company: true, email: true, phone: true }
        }
      }
    });

    if (!pipelineItem) {
      return NextResponse.json({ error: 'Pipeline item not found' }, { status: 404 });
    }

    // Check if already exists in editorial board (unless force is true)
    if (!force) {
      const existingEditorialItem = await prisma.editorialBoardItem.findFirst({
        where: { pipelineItemId }
      });

      if (existingEditorialItem) {
        return NextResponse.json(
          { error: 'Pipeline item already exists in editorial board', editorialItem: existingEditorialItem },
          { status: 409 }
        );
      }
    }

    // Determine initial status based on pipeline status
    let editorialStatus: string;
    switch (pipelineItem.status) {
      case 'List Out':
      case 'Partner List Sent':
        editorialStatus = 'LIST_OUT_QA_INTERVIEW_PROPOSED';
        break;
      case 'Q&A':
      case 'Free Q&A Offered':
        editorialStatus = 'QA_SUBMITTED';
        break;
      case 'Sold':
        editorialStatus = 'QA_APPROVED';
        break;
      default:
        editorialStatus = 'LIST_OUT_QA_INTERVIEW_PROPOSED';
    }

    // Create editorial board item with duplicated data
    const editorialItem = await prisma.editorialBoardItem.create({
      data: {
        name: pipelineItem.name,
        title: pipelineItem.title || undefined,
        company: pipelineItem.company || undefined,
        email: pipelineItem.email || pipelineItem.lead?.email || undefined,
        phone: pipelineItem.phone || pipelineItem.lead?.phone || undefined,
        bdrId: pipelineItem.bdrId,
        status: editorialStatus as any,
        notes: `Synced from pipeline: ${pipelineItem.notes || 'No notes'}`,
        link: pipelineItem.link || undefined,
        leadId: pipelineItem.leadId || undefined,
        pipelineItemId: pipelineItem.id,
        lastUpdated: new Date(),
      },
      include: {
        bdr: {
          select: { name: true, email: true }
        },
        lead: {
          select: { name: true, company: true }
        },
        pipelineItem: {
          select: { name: true, company: true }
        }
      }
    });

    // Log the sync activity
    await prisma.activityLog.create({
      data: {
        bdrId: pipelineItem.bdrId,
        activityType: 'Editorial_Sync',
        description: `Pipeline item synced to editorial board`,
        notes: `Status: ${pipelineItem.status} → ${editorialStatus}`,
        pipelineItemId: pipelineItem.id,
        editorialItemId: editorialItem.id,
      }
    });

    return NextResponse.json({
      success: true,
      editorialItem,
      message: `Pipeline item "${pipelineItem.name}" synced to editorial board`
    }, { status: 201 });

  } catch (error) {
    console.error('Error syncing pipeline item to editorial board:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to sync pipeline item to editorial board' },
      { status: 500 }
    );
  }
}

// POST /api/editorial/sync/auto - Auto-sync eligible pipeline items
export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Find pipeline items in eligible statuses that aren't already in editorial board
    const eligibleStatuses = ['List Out', 'Partner List Sent', 'Q&A', 'Free Q&A Offered', 'Sold'];
    
    const eligibleItems = await prisma.pipelineItem.findMany({
      where: {
        status: { in: eligibleStatuses },
        editorialItems: {
          none: {} // Not already in editorial board
        }
      },
      include: {
        bdr: {
          select: { id: true, name: true, email: true }
        },
        lead: {
          select: { id: true, name: true, company: true, email: true, phone: true }
        }
      },
      take: 50 // Limit to avoid overwhelming the system
    });

    const syncedItems = [];
    
    for (const pipelineItem of eligibleItems) {
      // Determine initial status based on pipeline status
      let editorialStatus: string;
      switch (pipelineItem.status) {
        case 'List Out':
        case 'Partner List Sent':
          editorialStatus = 'LIST_OUT_QA_INTERVIEW_PROPOSED';
          break;
        case 'Q&A':
        case 'Free Q&A Offered':
          editorialStatus = 'QA_SUBMITTED';
          break;
        case 'Sold':
          editorialStatus = 'QA_APPROVED';
          break;
        default:
          editorialStatus = 'LIST_OUT_QA_INTERVIEW_PROPOSED';
      }

      try {
        // Create editorial board item
        const editorialItem = await prisma.editorialBoardItem.create({
          data: {
            name: pipelineItem.name,
            title: pipelineItem.title || undefined,
            company: pipelineItem.company || undefined,
            email: pipelineItem.email || pipelineItem.lead?.email || undefined,
            phone: pipelineItem.phone || pipelineItem.lead?.phone || undefined,
            bdrId: pipelineItem.bdrId,
            status: editorialStatus as any,
            notes: `Auto-synced from pipeline: ${pipelineItem.notes || 'No notes'}`,
            link: pipelineItem.link || undefined,
            leadId: pipelineItem.leadId || undefined,
            pipelineItemId: pipelineItem.id,
            lastUpdated: new Date(),
          }
        });

        // Log the sync activity
        await prisma.activityLog.create({
          data: {
            bdrId: pipelineItem.bdrId,
            activityType: 'Editorial_Auto_Sync',
            description: `Pipeline item auto-synced to editorial board`,
            notes: `Status: ${pipelineItem.status} → ${editorialStatus}`,
            pipelineItemId: pipelineItem.id,
            editorialItemId: editorialItem.id,
          }
        });

        syncedItems.push({
          pipelineItem: { id: pipelineItem.id, name: pipelineItem.name },
          editorialItem: { id: editorialItem.id, status: editorialStatus }
        });
      } catch (error) {
        console.error(`Failed to sync pipeline item ${pipelineItem.id}:`, error);
        // Continue with other items even if one fails
      }
    }

    return NextResponse.json({
      success: true,
      syncedCount: syncedItems.length,
      syncedItems,
      message: `Auto-synced ${syncedItems.length} pipeline items to editorial board`
    });

  } catch (error) {
    console.error('Error auto-syncing pipeline items:', error);
    return NextResponse.json(
      { error: 'Failed to auto-sync pipeline items to editorial board' },
      { status: 500 }
    );
  }
}