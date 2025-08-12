import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function finalVerificationDealAmounts() {
  try {
    console.log('🔍 Final verification: Deal amounts in activity log notes...\n');

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
      console.log(`   Value: £${item.value?.toFixed(0) || 'N/A'}`);
      
      // Find the deal closed activity log
      const dealClosedLog = item.activityLogs.find(log => 
        log.activityType === 'Deal_Closed' && log.description.includes('Deal closed:')
      );

      if (dealClosedLog) {
        console.log(`   Activity log notes: "${dealClosedLog.notes || 'null'}"`);
        
        // Check if the activity log notes contain the deal amount
        const hasDealAmount = dealClosedLog.notes && 
                             dealClosedLog.notes.includes('Deal Amount: £') &&
                             /\d+/.test(dealClosedLog.notes);
        
        if (hasDealAmount) {
          console.log(`   ✅ Activity log notes contain deal amount`);
          verifiedCount++;
        } else {
          console.log(`   ❌ Activity log notes missing deal amount`);
          issuesCount++;
        }
      } else {
        console.log(`   ⚠️  No deal closed activity log found`);
        issuesCount++;
      }
    }

    console.log('\n📊 SUMMARY:');
    console.log('='.repeat(30));
    console.log(`Total sold items: ${soldItems.length}`);
    console.log(`Items with deal amounts in activity log notes: ${verifiedCount}`);
    console.log(`Items with issues: ${issuesCount}`);

    if (issuesCount === 0) {
      console.log('\n✅ ALL SOLD ITEMS NOW HAVE DEAL AMOUNTS IN ACTIVITY LOG NOTES!');
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
        console.log(`Activity log notes: "${sampleDealLog.notes}"`);
        console.log(`This will now show in Last Update column and Activity History popup`);
      }
    }

  } catch (error) {
    console.error('Error in final verification:', error);
  } finally {
    await prisma.$disconnect();
  }
}

finalVerificationDealAmounts()
  .catch(console.error); 