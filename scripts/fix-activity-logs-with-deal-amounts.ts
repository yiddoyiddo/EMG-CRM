import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixActivityLogsWithDealAmounts() {
  try {
    console.log('🔍 Fixing activity logs to include deal amounts...\n');

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
        // Update the activity log description to include the deal amount
        const updatedDescription = `Deal closed: ${dealClosedLog.description.replace('Deal closed: ', '')} - £${item.value.toFixed(0)}`;
        
        await prisma.activityLog.update({
          where: { id: dealClosedLog.id },
          data: { 
            description: updatedDescription
          }
        });

        console.log(`✅ Updated activity log description: "${updatedDescription}"`);
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
      console.log('\n✅ Activity log updates completed successfully!');
      console.log('✅ Deal amounts now included in activity log descriptions');
      console.log('✅ These will now show up in Last Update column and Activity History popup');
    } else {
      console.log('\nℹ️  No updates were needed.');
    }

  } catch (error) {
    console.error('Error fixing activity logs with deal amounts:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixActivityLogsWithDealAmounts()
  .catch(console.error); 