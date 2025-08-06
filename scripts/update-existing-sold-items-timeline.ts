import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function updateExistingSoldItemsTimeline() {
  try {
    console.log('🔍 Updating existing sold items timeline with deal amounts...\n');

    // Get all sold pipeline items with existing notes that don't contain deal amounts
    const soldItemsWithExistingNotes = await prisma.pipelineItem.findMany({
      where: {
        OR: [
          { status: 'Sold' },
          { status: 'sold' },
          { status: 'SOLD' }
        ],
        AND: {
          notes: {
            not: null
          }
        }
      },
      include: {
        activityLogs: {
          orderBy: { timestamp: 'asc' }
        }
      }
    });

    console.log(`📊 Found ${soldItemsWithExistingNotes.length} sold items with existing notes`);

    let updatedCount = 0;
    let skippedCount = 0;

    for (const item of soldItemsWithExistingNotes) {
      // Skip items that already have deal amounts in their notes
      if (item.notes.includes('Deal closed:') || item.notes.includes('£')) {
        console.log(`⏭️  Skipping ${item.name} - already has deal amount in notes`);
        skippedCount++;
        continue;
      }

      if (item.activityLogs.length === 0) {
        console.log(`⚠️  Skipping ${item.name} - no activity logs found`);
        skippedCount++;
        continue;
      }

      // Find the deal closed activity log
      const dealClosedLog = item.activityLogs.find(log => 
        log.activityType === 'Deal_Closed' && log.description.includes('Deal closed:')
      );

      if (!dealClosedLog) {
        console.log(`⚠️  Skipping ${item.name} - no deal closed activity log found`);
        skippedCount++;
        continue;
      }

      // Create new timeline notes that include the deal amount
      const dealAmountInfo = `[${dealClosedLog.timestamp.toLocaleDateString('en-GB')}] ${dealClosedLog.activityType}: ${dealClosedLog.description}`;
      
      // Combine existing notes with deal amount information
      const updatedNotes = `${item.notes}\n\n${dealAmountInfo}`;

      // Update the pipeline item
      await prisma.pipelineItem.update({
        where: { id: item.id },
        data: { notes: updatedNotes }
      });

      console.log(`✅ Updated ${item.name} (ID: ${item.id}) - Value: £${item.value?.toFixed(0) || 'N/A'}`);
      console.log(`   Added: ${dealAmountInfo}`);
      updatedCount++;
    }

    console.log('\n📊 SUMMARY:');
    console.log('='.repeat(30));
    console.log(`Items processed: ${soldItemsWithExistingNotes.length}`);
    console.log(`Successfully updated: ${updatedCount}`);
    console.log(`Skipped: ${skippedCount}`);

    if (updatedCount > 0) {
      console.log('\n✅ Timeline updates completed successfully!');
    } else {
      console.log('\nℹ️  No updates were needed.');
    }

  } catch (error) {
    console.error('Error updating existing sold items timeline:', error);
  } finally {
    await prisma.$disconnect();
  }
}

updateExistingSoldItemsTimeline()
  .catch(console.error); 