import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkRemainingSoldItems() {
  try {
    console.log('🔍 Checking remaining sold items that weren\'t updated...\n');

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

    console.log(`📊 Found ${soldItems.length} total sold items`);

    // Find items that already had notes (weren't updated by our script)
    const itemsWithExistingNotes = soldItems.filter(item => 
      item.notes && item.notes.trim() !== '' && 
      !item.notes.includes('[05/08/2025] Deal_Closed: Deal closed: Partner Package')
    );

    console.log(`\n📝 Items with existing notes (not updated by our script): ${itemsWithExistingNotes.length}`);

    for (const item of itemsWithExistingNotes) {
      console.log(`\n💰 Item: ${item.name} (ID: ${item.id})`);
      console.log(`   Company: ${item.company || 'N/A'}`);
      console.log(`   BDR: ${item.bdr || 'N/A'}`);
      console.log(`   Value: £${item.value?.toFixed(0) || 'N/A'}`);
      console.log(`   Notes preview: ${item.notes.substring(0, 200)}...`);
      
      // Check if existing notes contain deal amount information
      const hasDealAmount = item.notes.toLowerCase().includes('deal') || 
                           item.notes.toLowerCase().includes('£') ||
                           item.notes.toLowerCase().includes('package') ||
                           item.notes.toLowerCase().includes('amount') ||
                           item.notes.toLowerCase().includes('value') ||
                           /\d+/.test(item.notes);
      
      if (hasDealAmount) {
        console.log(`   ✅ Existing notes contain deal amount information`);
      } else {
        console.log(`   ⚠️  Existing notes may not contain deal amount information`);
      }

      console.log(`   Activity logs: ${item.activityLogs.length}`);
      item.activityLogs.forEach((log, index) => {
        console.log(`      ${index + 1}. [${log.timestamp.toLocaleDateString()}] ${log.activityType}: ${log.description}`);
      });
    }

    // Find items that were updated by our script
    const itemsUpdatedByScript = soldItems.filter(item => 
      item.notes && item.notes.includes('[05/08/2025] Deal_Closed: Deal closed: Partner Package')
    );

    console.log(`\n✅ Items updated by our script: ${itemsUpdatedByScript.length}`);

    // Summary
    console.log('\n📊 SUMMARY:');
    console.log('='.repeat(30));
    console.log(`Total sold items: ${soldItems.length}`);
    console.log(`Items with existing notes: ${itemsWithExistingNotes.length}`);
    console.log(`Items updated by script: ${itemsUpdatedByScript.length}`);
    console.log(`Items without notes: ${soldItems.filter(item => !item.notes || item.notes.trim() === '').length}`);

    const itemsWithDealAmounts = itemsWithExistingNotes.filter(item => {
      const hasDealAmount = item.notes.toLowerCase().includes('deal') || 
                           item.notes.toLowerCase().includes('£') ||
                           item.notes.toLowerCase().includes('package') ||
                           item.notes.toLowerCase().includes('amount') ||
                           item.notes.toLowerCase().includes('value') ||
                           /\d+/.test(item.notes);
      return hasDealAmount;
    });

    console.log(`Items with existing notes containing deal amounts: ${itemsWithDealAmounts.length}`);

    if (itemsWithExistingNotes.length === itemsWithDealAmounts.length) {
      console.log('\n✅ ALL SOLD ITEMS HAVE PROPER TIMELINE NOTES WITH DEAL AMOUNTS!');
    } else {
      console.log(`\n❌ ${itemsWithExistingNotes.length - itemsWithDealAmounts.length} items may need attention`);
    }

  } catch (error) {
    console.error('Error checking remaining sold items:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkRemainingSoldItems()
  .catch(console.error); 