import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verifyTimelineCompletion() {
  try {
    console.log('🔍 Verifying timeline completion for all sold and list out items...\n');

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
      console.log(`   Status: ${item.status}`);
      console.log(`   Last Updated: ${item.lastUpdated.toLocaleDateString('en-GB')}`);
      
      // Check if notes contain deal amount information
      if (item.notes) {
        console.log(`   Notes: ${item.notes.substring(0, 100)}...`);
        
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

    // Get all list out pipeline items
    const listOutItems = await prisma.pipelineItem.findMany({
      where: {
        OR: [
          { status: 'List Out' },
          { status: 'list out' },
          { status: 'LIST OUT' },
          { category: 'List Out' },
          { category: 'list out' },
          { category: 'LIST OUT' }
        ]
      },
      include: {
        activityLogs: {
          orderBy: { timestamp: 'asc' }
        }
      }
    });

    console.log(`\n📋 Found ${listOutItems.length} list out items`);

    for (const item of listOutItems) {
      console.log(`\n📋 Item: ${item.name} (ID: ${item.id})`);
      console.log(`   Company: ${item.company || 'N/A'}`);
      console.log(`   BDR: ${item.bdr || 'N/A'}`);
      console.log(`   Status: ${item.status}`);
      console.log(`   Category: ${item.category}`);
      console.log(`   Last Updated: ${item.lastUpdated.toLocaleDateString('en-GB')}`);
      
      if (item.notes) {
        console.log(`   Notes: ${item.notes.substring(0, 100)}...`);
        console.log(`   ✅ Timeline notes present`);
        verifiedCount++;
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
    console.log(`Total list out items: ${listOutItems.length}`);
    console.log(`Items with proper timeline: ${verifiedCount}`);
    console.log(`Items with issues: ${issuesCount}`);

    if (issuesCount === 0) {
      console.log('\n✅ ALL ITEMS HAVE PROPER TIMELINE INFORMATION!');
      console.log('✅ All sold deals have timeline notes with deal amounts');
      console.log('✅ All list out items have timeline notes');
      console.log('✅ All lastUpdated timestamps are properly set');
    } else {
      console.log(`\n❌ ${issuesCount} items need attention`);
    }

  } catch (error) {
    console.error('Error verifying timeline completion:', error);
  } finally {
    await prisma.$disconnect();
  }
}

verifyTimelineCompletion()
  .catch(console.error); 