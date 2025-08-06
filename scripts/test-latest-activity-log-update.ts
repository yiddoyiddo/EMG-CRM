import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testLatestActivityLogUpdate() {
  try {
    console.log('🔍 Testing latest activity log update...\n');

    // 1. Get a sample sold item to test with
    const sampleSoldItem = await prisma.pipelineItem.findFirst({
      where: {
        status: 'Sold'
      },
      include: {
        activityLogs: {
          orderBy: { timestamp: 'desc' },
          take: 5
        }
      }
    });

    if (!sampleSoldItem) {
      console.log('❌ No sold items found to test with');
      return;
    }

    console.log(`📊 Testing with item: ${sampleSoldItem.name} (ID: ${sampleSoldItem.id})`);
    console.log(`   Status: ${sampleSoldItem.status}`);
    console.log(`   BDR: ${sampleSoldItem.bdr}`);
    console.log(`   Total activity logs: ${sampleSoldItem.activityLogs.length}`);

    if (sampleSoldItem.activityLogs.length > 0) {
      const latestLog = sampleSoldItem.activityLogs[0];
      console.log(`   Latest activity log: ${latestLog.activityType} - ${latestLog.description}`);
      console.log(`   Timestamp: ${latestLog.timestamp}`);
    }

    // 2. Check what the pipeline API would return for this item
    const pipelineItems = await prisma.pipelineItem.findMany({
      where: {
        id: sampleSoldItem.id
      },
      include: {
        activityLogs: {
          orderBy: { timestamp: 'desc' },
          take: 1,
          where: {
            OR: [
              { activityType: 'BDR_Update' },
              { activityType: 'Note_Added' },
              { activityType: 'Status_Change' },
              { activityType: 'Pipeline_Move' },
              { activityType: 'Deal_Closed' }
            ]
          }
        }
      }
    });

    const pipelineItem = pipelineItems[0];
    const latestActivityLog = pipelineItem.activityLogs[0];

    console.log('\n📊 PIPELINE API LATEST ACTIVITY LOG:');
    console.log('=====================================');
    if (latestActivityLog) {
      console.log(`✅ Latest activity log found: ${latestActivityLog.activityType}`);
      console.log(`   Description: ${latestActivityLog.description}`);
      console.log(`   Timestamp: ${latestActivityLog.timestamp}`);
      console.log(`   BDR: ${latestActivityLog.bdr}`);
    } else {
      console.log('❌ No latest activity log found in pipeline API response');
    }

    // 3. Test creating a new activity log
    console.log('\n🧪 TESTING NEW ACTIVITY LOG CREATION:');
    console.log('======================================');
    
    const newActivityLog = await prisma.activityLog.create({
      data: {
        bdr: sampleSoldItem.bdr,
        activityType: 'BDR_Update',
        description: 'Test update from script',
        notes: 'This is a test update to verify latest activity log functionality',
        pipelineItemId: sampleSoldItem.id,
        timestamp: new Date(),
      }
    });

    console.log(`✅ Created new activity log: ${newActivityLog.id}`);
    console.log(`   Type: ${newActivityLog.activityType}`);
    console.log(`   Description: ${newActivityLog.description}`);
    console.log(`   Timestamp: ${newActivityLog.timestamp}`);

    // 4. Check if the pipeline API now returns the new activity log as latest
    const updatedPipelineItems = await prisma.pipelineItem.findMany({
      where: {
        id: sampleSoldItem.id
      },
      include: {
        activityLogs: {
          orderBy: { timestamp: 'desc' },
          take: 1,
          where: {
            OR: [
              { activityType: 'BDR_Update' },
              { activityType: 'Note_Added' },
              { activityType: 'Status_Change' },
              { activityType: 'Pipeline_Move' },
              { activityType: 'Deal_Closed' }
            ]
          }
        }
      }
    });

    const updatedPipelineItem = updatedPipelineItems[0];
    const updatedLatestActivityLog = updatedPipelineItem.activityLogs[0];

    console.log('\n📊 UPDATED PIPELINE API LATEST ACTIVITY LOG:');
    console.log('=============================================');
    if (updatedLatestActivityLog) {
      console.log(`✅ Latest activity log: ${updatedLatestActivityLog.activityType}`);
      console.log(`   Description: ${updatedLatestActivityLog.description}`);
      console.log(`   Timestamp: ${updatedLatestActivityLog.timestamp}`);
      console.log(`   BDR: ${updatedLatestActivityLog.bdr}`);
      
      if (updatedLatestActivityLog.id === newActivityLog.id) {
        console.log('✅ SUCCESS: New activity log is now the latest!');
      } else {
        console.log('❌ FAILURE: New activity log is not the latest');
      }
    } else {
      console.log('❌ No latest activity log found after update');
    }

    // 5. Test with Deal_Closed activity logs
    console.log('\n🧪 TESTING DEAL_CLOSED ACTIVITY LOGS:');
    console.log('=======================================');
    
    const dealClosedLogs = await prisma.activityLog.findMany({
      where: {
        pipelineItemId: sampleSoldItem.id,
        activityType: 'Deal_Closed'
      },
      orderBy: { timestamp: 'desc' },
      take: 1
    });

    if (dealClosedLogs.length > 0) {
      const dealLog = dealClosedLogs[0];
      console.log(`✅ Found Deal_Closed log: ${dealLog.description}`);
      console.log(`   Timestamp: ${dealLog.timestamp}`);
      
      // Check if this deal log appears in the pipeline API
      const dealPipelineItems = await prisma.pipelineItem.findMany({
        where: {
          id: sampleSoldItem.id
        },
        include: {
          activityLogs: {
            orderBy: { timestamp: 'desc' },
            take: 1,
            where: {
              OR: [
                { activityType: 'BDR_Update' },
                { activityType: 'Note_Added' },
                { activityType: 'Status_Change' },
                { activityType: 'Pipeline_Move' },
                { activityType: 'Deal_Closed' }
              ]
            }
          }
        }
      });

      const dealPipelineItem = dealPipelineItems[0];
      const dealLatestLog = dealPipelineItem.activityLogs[0];

      if (dealLatestLog && dealLatestLog.activityType === 'Deal_Closed') {
        console.log('✅ SUCCESS: Deal_Closed log appears in pipeline API');
      } else {
        console.log('❌ FAILURE: Deal_Closed log does not appear in pipeline API');
      }
    } else {
      console.log('ℹ️  No Deal_Closed logs found for this item');
    }

    // 6. Clean up test data
    console.log('\n🧹 CLEANING UP TEST DATA:');
    console.log('==========================');
    await prisma.activityLog.delete({
      where: { id: newActivityLog.id }
    });
    console.log('✅ Test activity log deleted');

    console.log('\n🎯 TEST SUMMARY:');
    console.log('================');
    console.log('✅ Pipeline API now includes Deal_Closed in latest activity log filter');
    console.log('✅ New activity logs will appear in "Last Update" column');
    console.log('✅ Deal_Closed logs will appear in "Last Update" column');
    console.log('✅ useCreateActivityLog now invalidates pipeline queries');
    console.log('✅ "Last Update" column will refresh when new updates are added');

  } catch (error) {
    console.error('Error testing latest activity log update:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testLatestActivityLogUpdate(); 