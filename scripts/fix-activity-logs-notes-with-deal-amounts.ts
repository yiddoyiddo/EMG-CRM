import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixActivityLogsNotesWithDealAmounts() {
  try {
    console.log('🔍 Fixing activity log notes to include deal amounts...\n');

    // Get all sold pipeline items
    const soldItems = await prisma.pipelineItem.findMany({
      where: {
        OR: [
          { status: 'Sold' },
          { status: 'sold' },
          { status: 'SOLD' }
        ]
      },
      include: {
        activityLogs: {
          orderBy: { timestamp: 'asc' }
        }
      }
    });

    console.log(`📊 Found ${soldItems.length} sold items`);

    let updatedCount = 0;

    for (const item of soldItems) {
      console.log(`\n💰 Processing: ${item.name} (ID: ${item.id})`);
      console.log(`   Value: £${item.value?.toFixed(0) || 'N/A'}`);
      
      // Find the deal closed activity log
      const dealClosedLog = item.activityLogs.find(log => 
        log.activityType === 'Deal_Closed' && log.description.includes('Deal closed:')
      );

      if (dealClosedLog && item.value) {
        // Update the activity log notes to include the deal amount
        const updatedNotes = `${dealClosedLog.notes} - Deal Amount: £${item.value.toFixed(0)}`;
        
        await prisma.activityLog.update({
          where: { id: dealClosedLog.id },
          data: { 
            notes: updatedNotes
          }
        });

        console.log(`✅ Updated activity log notes: "${updatedNotes}"`);
        updatedCount++;
      } else {
        console.log(`⚠️  No deal closed activity log or value found for ${item.name}`);
      }
    }

    console.log('\n📊 SUMMARY:');
    console.log('='.repeat(30));
    console.log(`Total sold items processed: ${soldItems.length}`);
    console.log(`Successfully updated: ${updatedCount}`);

    if (updatedCount > 0) {
      console.log('\n✅ Activity log notes updates completed successfully!');
      console.log('✅ Deal amounts now included in activity log notes');
      console.log('✅ These will now show up in Last Update column');
      console.log('✅ These will now show up in Activity History popup');
    } else {
      console.log('\nℹ️  No updates were needed.');
    }

  } catch (error) {
    console.error('Error fixing activity logs notes with deal amounts:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixActivityLogsNotesWithDealAmounts()
  .catch(console.error); 