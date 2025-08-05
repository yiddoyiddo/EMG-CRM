import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixConvertedLeadsStatus() {
  try {
    console.log('Finding leads that have been converted to pipeline but don\'t have "Moved to Pipeline" status...');
    
    // Find leads that have pipeline items but don't have "Moved to Pipeline" status
    const leadsToFix = await prisma.lead.findMany({
      where: {
        status: { not: 'Moved to Pipeline' },
        pipelineItems: { some: {} }
      },
      include: {
        pipelineItems: {
          select: {
            id: true,
            category: true,
            status: true,
            addedDate: true
          }
        }
      }
    });
    
    console.log(`Found ${leadsToFix.length} leads that need status updates.`);
    
    if (leadsToFix.length === 0) {
      console.log('All converted leads already have the correct status.');
      return;
    }
    
    let updatedCount = 0;
    
    for (const lead of leadsToFix) {
      const pipelineItem = lead.pipelineItems[0]; // Get the first pipeline item
      if (!pipelineItem) continue;
      
      // Create conversion note
      const conversionDate = pipelineItem.addedDate instanceof Date 
        ? pipelineItem.addedDate.toLocaleDateString() 
        : new Date(pipelineItem.addedDate).toLocaleDateString();
      
      const conversionNote = `Moved to Pipeline: ${pipelineItem.category} - ${pipelineItem.status} (${conversionDate})`;
      const updatedNotes = lead.notes 
        ? `${lead.notes}\n\n${conversionNote}`
        : conversionNote;
      
      // Update the lead
      await prisma.lead.update({
        where: { id: lead.id },
        data: {
          status: 'Moved to Pipeline',
          notes: updatedNotes,
        },
      });
      
      console.log(`Updated lead ${lead.id} (${lead.name}): ${lead.status} → Moved to Pipeline`);
      updatedCount++;
    }
    
    console.log(`\nSuccessfully updated ${updatedCount} leads.`);
    
  } catch (error) {
    console.error('Error fixing converted leads status:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixConvertedLeadsStatus(); 