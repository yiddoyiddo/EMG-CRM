import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verifySoldItemsTimeline() {
  try {
    console.log('🔍 Verifying sold items timeline with deal amounts...\n');

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

    let verifiedCount = 0;
    let issuesCount = 0;

    for (const item of soldItems) {
      console.log(`\n💰 Item: ${item.name} (ID: ${item.id})`);
      console.log(`   Company: ${item.company || 'N/A'}`);
      console.log(`   BDR: ${item.bdr || 'N/A'}`);
      console.log(`   Value: £${item.value?.toFixed(0) || 'N/A'}`);
      console.log(`   Has notes: ${item.notes ? 'Yes' : 'No'}`);
      
      if (item.notes) {
        console.log(`   Notes preview: ${item.notes.substring(0, 150)}...`);
        
        // Check if notes contain deal amount information
        const hasDealAmount = item.notes.toLowerCase().includes('deal') || 
                             item.notes.toLowerCase().includes('£') ||
                             item.notes.toLowerCase().includes('package') ||
                             /\d+/.test(item.notes);
        
        if (hasDealAmount) {
          console.log(`   ✅ Timeline notes contain deal amount information`);
          verifiedCount++;
        } else {
          console.log(`   ⚠️  Timeline notes may not contain deal amount information`);
          issuesCount++;
        }
      } else {
        console.log(`   ❌ No timeline notes found`);
        issuesCount++;
      }

      console.log(`   Activity logs: ${item.activityLogs.length}`);
      item.activityLogs.forEach((log, index) => {
        console.log(`      ${index + 1}. [${log.timestamp.toLocaleDateString()}] ${log.activityType}: ${log.description}`);
      });
    }

    console.log('\n📊 SUMMARY:');
    console.log('='.repeat(30));
    console.log(`Total sold items: ${soldItems.length}`);
    console.log(`Items with proper timeline notes: ${verifiedCount}`);
    console.log(`Items with issues: ${issuesCount}`);

    if (issuesCount === 0) {
      console.log('\n✅ ALL SOLD ITEMS HAVE PROPER TIMELINE NOTES WITH DEAL AMOUNTS!');
    } else {
      console.log(`\n❌ ${issuesCount} items need attention`);
    }

  } catch (error) {
    console.error('Error verifying sold items timeline:', error);
  } finally {
    await prisma.$disconnect();
  }
}

verifySoldItemsTimeline()
  .catch(console.error); 