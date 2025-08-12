import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verifyActivityLogsForDeals() {
  try {
    console.log('🔍 Verifying activity logs for deals...\n');

    // 1. Check for any activity logs with deal-related content
    const dealActivityLogs = await prisma.activityLog.findMany({
      where: {
        OR: [
          { activityType: 'Deal_Closed' },
          { activityType: 'Sale_Completed' },
          { description: { contains: 'deal' } },
          { description: { contains: 'sold' } },
          { notes: { contains: 'deal' } },
          { notes: { contains: 'sold' } },
        ]
      },
      include: {
        pipelineItem: {
          select: {
            id: true,
            name: true,
            status: true,
            category: true,
            value: true
          }
        }
      },
      orderBy: { timestamp: 'desc' }
    });

    console.log(`📊 Found ${dealActivityLogs.length} activity logs related to deals`);

    if (dealActivityLogs.length > 0) {
      console.log('\n📋 DEAL ACTIVITY LOGS:');
      console.log('======================');
      
      for (const log of dealActivityLogs.slice(0, 10)) { // Show first 10
        console.log(`\n📝 Activity Log ID: ${log.id}`);
        console.log(`   Type: ${log.activityType}`);
        console.log(`   Description: ${log.description}`);
        console.log(`   Notes: ${log.notes}`);
        console.log(`   Timestamp: ${log.timestamp}`);
        console.log(`   BDR: ${log.bdr}`);
        if (log.pipelineItem) {
          console.log(`   Pipeline Item: ${log.pipelineItem.name} (${log.pipelineItem.status})`);
        }
      }

      if (dealActivityLogs.length > 10) {
        console.log(`\n... and ${dealActivityLogs.length - 10} more activity logs`);
      }
    }

    // 2. Check for pipeline items with "Sold" status
    const soldPipelineItems = await prisma.pipelineItem.findMany({
      where: {
        status: 'Sold'
      },
      include: {
        activityLogs: {
          orderBy: { timestamp: 'desc' }
        }
      }
    });

    console.log(`\n📊 Found ${soldPipelineItems.length} pipeline items with "Sold" status`);

    // 3. Check for items with values (indicating deals)
    const itemsWithValues = await prisma.pipelineItem.findMany({
      where: {
        value: {
          not: null
        }
      },
      include: {
        activityLogs: {
          orderBy: { timestamp: 'desc' }
        }
      }
    });

    console.log(`📊 Found ${itemsWithValues.length} pipeline items with values (indicating deals)`);

    // 4. Analyze the relationship between sold items and activity logs
    let soldItemsWithActivityLogs = 0;
    let soldItemsWithoutActivityLogs = 0;

    for (const item of soldPipelineItems) {
      const hasDealActivityLog = item.activityLogs.some(log => 
        log.activityType === 'Deal_Closed' || 
        log.activityType === 'Sale_Completed' ||
        log.description.toLowerCase().includes('deal') ||
        log.description.toLowerCase().includes('sold')
      );

      if (hasDealActivityLog) {
        soldItemsWithActivityLogs++;
      } else {
        soldItemsWithoutActivityLogs++;
        console.log(`⚠️  Sold item without activity log: ${item.name} (ID: ${item.id})`);
      }
    }

    console.log(`\n📊 ANALYSIS:`);
    console.log(`Sold items with activity logs: ${soldItemsWithActivityLogs}`);
    console.log(`Sold items without activity logs: ${soldItemsWithoutActivityLogs}`);

    // 5. Test time-based reporting
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const dealsThisWeek = await prisma.activityLog.count({
      where: {
        activityType: 'Deal_Closed',
        timestamp: {
          gte: oneWeekAgo
        }
      }
    });

    const dealsPastWeek = await prisma.activityLog.count({
      where: {
        activityType: 'Deal_Closed',
        timestamp: {
          lt: oneWeekAgo
        }
      }
    });

    console.log(`\n📈 TIME-BASED REPORTING:`);
    console.log(`Deals this week: ${dealsThisWeek}`);
    console.log(`Deals past week: ${dealsPastWeek}`);

    // 6. Summary and recommendations
    console.log('\n📋 SUMMARY:');
    console.log('===========');
    console.log(`Total deal activity logs: ${dealActivityLogs.length}`);
    console.log(`Sold pipeline items: ${soldPipelineItems.length}`);
    console.log(`Items with values: ${itemsWithValues.length}`);
    console.log(`Time-based reporting: ${dealsThisWeek + dealsPastWeek > 0 ? '✅ Working' : '❌ No data'}`);

    if (soldItemsWithoutActivityLogs > 0) {
      console.log('\n⚠️  ISSUES FOUND:');
      console.log('================');
      console.log(`${soldItemsWithoutActivityLogs} sold items don't have proper activity logs`);
      console.log('These items need to be migrated to use activity logs instead of notes');
    } else {
      console.log('\n✅ SYSTEM STATUS:');
      console.log('================');
      console.log('All sold items have proper activity logs');
      console.log('Time-based reporting is working');
      console.log('System is properly structured for deal tracking');
    }

  } catch (error) {
    console.error('Error verifying activity logs:', error);
  } finally {
    await prisma.$disconnect();
  }
}

verifyActivityLogsForDeals(); 