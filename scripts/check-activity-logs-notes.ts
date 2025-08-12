import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkActivityLogsNotes() {
  try {
    console.log('🔍 Checking activity logs for notes that might override descriptions...\n');

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

    let itemsWithNotes = 0;
    let itemsWithoutNotes = 0;

    for (const item of soldItems) {
      console.log(`\n💰 Item: ${item.name} (ID: ${item.id})`);
      console.log(`   Value: £${item.value?.toFixed(0) || 'N/A'}`);
      
      // Find the deal closed activity log
      const dealClosedLog = item.activityLogs.find(log => 
        log.activityType === 'Deal_Closed' && log.description.includes('Deal closed:')
      );

      if (dealClosedLog) {
        console.log(`   Activity log description: "${dealClosedLog.description}"`);
        console.log(`   Activity log notes: "${dealClosedLog.notes || 'null'}"`);
        
        if (dealClosedLog.notes) {
          console.log(`   ⚠️  Has notes - this will override description in frontend`);
          itemsWithNotes++;
        } else {
          console.log(`   ✅ No notes - description will be used`);
          itemsWithoutNotes++;
        }
      } else {
        console.log(`   ⚠️  No deal closed activity log found`);
      }
    }

    console.log('\n📊 SUMMARY:');
    console.log('='.repeat(30));
    console.log(`Total sold items: ${soldItems.length}`);
    console.log(`Items with notes in activity logs: ${itemsWithNotes}`);
    console.log(`Items without notes in activity logs: ${itemsWithoutNotes}`);

    if (itemsWithNotes > 0) {
      console.log('\n⚠️  Some items have notes that will override descriptions in frontend');
      console.log('This means the deal amounts won\'t show in Last Update column');
    } else {
      console.log('\n✅ All items should show deal amounts in Last Update column');
    }

  } catch (error) {
    console.error('Error checking activity logs notes:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkActivityLogsNotes()
  .catch(console.error); 