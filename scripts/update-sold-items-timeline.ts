import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function updateSoldItemsTimeline() {
  try {
    console.log('🔍 Updating sold items timeline...\n');

    // Get all sold pipeline items with activity logs but no notes
    const soldItemsNeedingUpdates = await prisma.pipelineItem.findMany({
      where: {
        OR: [
          { status: 'Sold' },
          { status: 'sold' },
          { status: 'SOLD' }
        ],
        AND: {
          OR: [
            { notes: null },
            { notes: '' }
          ]
        }
      },
      include: {
        activityLogs: {
          orderBy: { timestamp: 'asc' }
        }
      }
    });

    console.log(`📊 Found ${soldItemsNeedingUpdates.length} sold items needing timeline updates`);

    let updatedCount = 0;
    let skippedCount = 0;

    for (const item of soldItemsNeedingUpdates) {
      if (item.activityLogs.length === 0) {
        console.log(`⚠️  Skipping ${item.name} - no activity logs found`);
        skippedCount++;
        continue;
      }

      // Create timeline notes from activity logs
      const timelineNotes = item.activityLogs.map(log => {
        const date = log.timestamp.toLocaleDateString('en-GB');
        return `[${date}] ${log.activityType}: ${log.description}`;
      }).join('\n\n');

      // Update the pipeline item
      await prisma.pipelineItem.update({
        where: { id: item.id },
        data: { notes: timelineNotes }
      });

      console.log(`✅ Updated ${item.name} (ID: ${item.id}) - Value: £${item.value?.toFixed(0) || 'N/A'}`);
      updatedCount++;
    }

    console.log('\n📊 SUMMARY:');
    console.log('='.repeat(30));
    console.log(`Items processed: ${soldItemsNeedingUpdates.length}`);
    console.log(`Successfully updated: ${updatedCount}`);
    console.log(`Skipped (no activity logs): ${skippedCount}`);

    if (updatedCount > 0) {
      console.log('\n✅ Timeline updates completed successfully!');
    } else {
      console.log('\nℹ️  No updates were needed.');
    }

  } catch (error) {
    console.error('Error updating sold items timeline:', error);
  } finally {
    await prisma.$disconnect();
  }
}

updateSoldItemsTimeline()
  .catch(console.error); 