import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkPipelineTimelineIntegrity() {
  try {
    console.log('🔍 Checking pipeline timeline integrity...\n');

    // Get all pipeline items
    const allPipelineItems = await prisma.pipelineItem.findMany({
      include: {
        activityLogs: {
          orderBy: { timestamp: 'asc' }
        }
      }
    });

    console.log(`📊 Total pipeline items: ${allPipelineItems.length}`);

    // Check for items that should have timeline updates
    const itemsNeedingTimelineUpdates = allPipelineItems.filter(item => {
      // Items with activity logs but no notes
      return item.activityLogs.length > 0 && (!item.notes || item.notes.trim() === '');
    });

    console.log(`\n⚠️  Items with activity logs but no timeline notes: ${itemsNeedingTimelineUpdates.length}`);

    if (itemsNeedingTimelineUpdates.length > 0) {
      console.log('\n📋 Items needing timeline updates:');
      console.log('='.repeat(60));
      
      for (const item of itemsNeedingTimelineUpdates) {
        console.log(`\n📋 Item: ${item.name} (ID: ${item.id})`);
        console.log(`   Company: ${item.company || 'N/A'}`);
        console.log(`   BDR: ${item.bdr || 'N/A'}`);
        console.log(`   Status: ${item.status}`);
        console.log(`   Category: ${item.category}`);
        console.log(`   Value: ${item.value || 'N/A'}`);
        console.log(`   Activity logs: ${item.activityLogs.length}`);
        item.activityLogs.forEach((log, index) => {
          console.log(`      ${index + 1}. [${log.timestamp.toLocaleDateString()}] ${log.activityType}: ${log.description}`);
        });
      }
    }

    // Check for sold items specifically
    const soldItems = allPipelineItems.filter(item => 
      item.status.toLowerCase() === 'sold' || 
      item.category.toLowerCase() === 'sold'
    );

    console.log(`\n💰 Sold items: ${soldItems.length}`);
    
    const soldItemsWithoutNotes = soldItems.filter(item => 
      !item.notes || item.notes.trim() === ''
    );

    console.log(`   Items without timeline notes: ${soldItemsWithoutNotes.length}`);

    if (soldItemsWithoutNotes.length > 0) {
      console.log('\n💰 Sold items needing timeline updates:');
      console.log('='.repeat(60));
      
      for (const item of soldItemsWithoutNotes) {
        console.log(`\n💰 Item: ${item.name} (ID: ${item.id})`);
        console.log(`   Company: ${item.company || 'N/A'}`);
        console.log(`   BDR: ${item.bdr || 'N/A'}`);
        console.log(`   Value: ${item.value || 'N/A'}`);
        console.log(`   Activity logs: ${item.activityLogs.length}`);
        item.activityLogs.forEach((log, index) => {
          console.log(`      ${index + 1}. [${log.timestamp.toLocaleDateString()}] ${log.activityType}: ${log.description}`);
        });
      }
    }

    // Check for list out items
    const listOutItems = allPipelineItems.filter(item => 
      item.status.toLowerCase().includes('list out') || 
      item.category.toLowerCase().includes('list out') ||
      item.status.toLowerCase().includes('partner list') ||
      item.category.toLowerCase().includes('partner list')
    );

    console.log(`\n📋 List Out items: ${listOutItems.length}`);
    
    const listOutItemsWithoutNotes = listOutItems.filter(item => 
      !item.notes || item.notes.trim() === ''
    );

    console.log(`   Items without timeline notes: ${listOutItemsWithoutNotes.length}`);

    if (listOutItemsWithoutNotes.length > 0) {
      console.log('\n📋 List Out items needing timeline updates:');
      console.log('='.repeat(60));
      
      for (const item of listOutItemsWithoutNotes) {
        console.log(`\n📋 Item: ${item.name} (ID: ${item.id})`);
        console.log(`   Company: ${item.company || 'N/A'}`);
        console.log(`   BDR: ${item.bdr || 'N/A'}`);
        console.log(`   Status: ${item.status}`);
        console.log(`   Category: ${item.category}`);
        console.log(`   Activity logs: ${item.activityLogs.length}`);
        item.activityLogs.forEach((log, index) => {
          console.log(`      ${index + 1}. [${log.timestamp.toLocaleDateString()}] ${log.activityType}: ${log.description}`);
        });
      }
    }

    // Summary
    console.log('\n📊 SUMMARY:');
    console.log('='.repeat(50));
    console.log(`Total pipeline items: ${allPipelineItems.length}`);
    console.log(`Items needing timeline updates: ${itemsNeedingTimelineUpdates.length}`);
    console.log(`Sold items without notes: ${soldItemsWithoutNotes.length}`);
    console.log(`List out items without notes: ${listOutItemsWithoutNotes.length}`);

    if (itemsNeedingTimelineUpdates.length === 0) {
      console.log('\n✅ All pipeline items have proper timeline notes!');
    } else {
      console.log('\n❌ Timeline updates needed for some items.');
    }

  } catch (error) {
    console.error('Error checking pipeline timeline integrity:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkPipelineTimelineIntegrity()
  .catch(console.error); 