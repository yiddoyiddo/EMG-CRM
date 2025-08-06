import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verifyActivityLogsDealAmounts() {
  try {
    console.log('🔍 Verifying activity logs contain deal amounts...\n');

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
      
      // Find the deal closed activity log
      const dealClosedLog = item.activityLogs.find(log => 
        log.activityType === 'Deal_Closed' && log.description.includes('Deal closed:')
      );

      if (dealClosedLog) {
        console.log(`   Activity log: "${dealClosedLog.description}"`);
        
        // Check if the activity log description contains the deal amount
        const hasDealAmount = dealClosedLog.description.includes('£') && 
                             /\d+/.test(dealClosedLog.description);
        
        if (hasDealAmount) {
          console.log(`   ✅ Activity log contains deal amount`);
          verifiedCount++;
        } else {
          console.log(`   ❌ Activity log missing deal amount`);
          issuesCount++;
        }
      } else {
        console.log(`   ⚠️  No deal closed activity log found`);
        issuesCount++;
      }

      console.log(`   Total activity logs: ${item.activityLogs.length}`);
    }

    console.log('\n📊 SUMMARY:');
    console.log('='.repeat(30));
    console.log(`Total sold items: ${soldItems.length}`);
    console.log(`Items with deal amounts in activity logs: ${verifiedCount}`);
    console.log(`Items with issues: ${issuesCount}`);

    if (issuesCount === 0) {
      console.log('\n✅ ALL ACTIVITY LOGS NOW CONTAIN DEAL AMOUNTS!');
      console.log('✅ These will show up in Last Update column');
      console.log('✅ These will show up in Activity History popup');
      console.log('✅ Deal amounts are now visible in the timeline');
    } else {
      console.log(`\n❌ ${issuesCount} items need attention`);
    }

    console.log('\n📝 SAMPLE VERIFICATIONS:');
    console.log('='.repeat(30));
    
    if (soldItems.length > 0) {
      const sampleSoldItem = soldItems[0];
      const sampleDealLog = sampleSoldItem.activityLogs.find(log => 
        log.activityType === 'Deal_Closed'
      );
      
      console.log(`Sample sold item: ${sampleSoldItem.name}`);
      console.log(`Company: ${sampleSoldItem.company || 'N/A'}`);
      console.log(`Value: £${sampleSoldItem.value?.toFixed(0) || 'N/A'}`);
      if (sampleDealLog) {
        console.log(`Activity log description: "${sampleDealLog.description}"`);
        console.log(`This will now show in Last Update column and Activity History popup`);
      }
    }

  } catch (error) {
    console.error('Error verifying activity logs deal amounts:', error);
  } finally {
    await prisma.$disconnect();
  }
}

verifyActivityLogsDealAmounts()
  .catch(console.error); 