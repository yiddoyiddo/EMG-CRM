import { prisma } from '@/lib/db';

// Statuses that should automatically trigger editorial board sync
export const EDITORIAL_ELIGIBLE_STATUSES = [
  'List Out',
  'Partner List Sent', 
  'Q&A',
  'Free Q&A Offered',
  'Sold'
];

// Check if a pipeline status change should trigger editorial sync
export function shouldSyncToEditorial(oldStatus: string, newStatus: string): boolean {
  return !EDITORIAL_ELIGIBLE_STATUSES.includes(oldStatus) && 
         EDITORIAL_ELIGIBLE_STATUSES.includes(newStatus);
}

// Auto-sync a single pipeline item to editorial board
export async function autoSyncPipelineItemToEditorial(pipelineItemId: number): Promise<void> {
  try {
    const pipelineItem = await prisma.pipelineItem.findUnique({
      where: { id: pipelineItemId },
      include: {
        bdr: { select: { id: true, name: true, email: true } },
        lead: { select: { id: true, name: true, company: true, email: true, phone: true } }
      }
    });

    if (!pipelineItem) {
      console.log(`Pipeline item ${pipelineItemId} not found`);
      return;
    }

    // Check if eligible status
    if (!EDITORIAL_ELIGIBLE_STATUSES.includes(pipelineItem.status)) {
      console.log(`Pipeline item ${pipelineItemId} status "${pipelineItem.status}" not eligible for editorial sync`);
      return;
    }

    // Check if already exists
    const existingEditorialItem = await prisma.editorialBoardItem.findFirst({
      where: { pipelineItemId }
    });

    if (existingEditorialItem) {
      console.log(`Pipeline item ${pipelineItemId} already exists in editorial board`);
      return;
    }

    // Determine initial editorial status based on pipeline status
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

    console.log(`Successfully auto-synced pipeline item ${pipelineItemId} to editorial board`);
    
  } catch (error) {
    console.error(`Failed to auto-sync pipeline item ${pipelineItemId} to editorial board:`, error);
    // Don't throw - we don't want pipeline updates to fail because of editorial sync issues
  }
}

// Batch sync multiple pipeline items
export async function batchAutoSyncToEditorial(pipelineItemIds: number[]): Promise<void> {
  for (const id of pipelineItemIds) {
    await autoSyncPipelineItemToEditorial(id);
  }
}