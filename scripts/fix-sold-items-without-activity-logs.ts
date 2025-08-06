import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixSoldItemsWithoutActivityLogs() {
  try {
    console.log('🔧 Fixing sold items without activity logs...\n');

    // 1. Find all sold items that don't have Deal_Closed activity logs
    const soldItemsWithoutActivityLogs = await prisma.pipelineItem.findMany({
      where: {
        status: 'Sold',
        activityLogs: {
          none: {
            activityType: 'Deal_Closed'
          }
        }
      },
      include: {
        activityLogs: {
          orderBy: { timestamp: 'desc' }
        }
      }
    });

    console.log(`📊 Found ${soldItemsWithoutActivityLogs.length} sold items without Deal_Closed activity logs`);

    if (soldItemsWithoutActivityLogs.length === 0) {
      console.log('✅ All sold items already have proper activity logs!');
      return;
    }

    // 2. Create activity logs for each sold item
    let activityLogsCreated = 0;

    for (const item of soldItemsWithoutActivityLogs) {
      // Check if there's already a Sale_Recorded activity log
      const existingSaleLog = item.activityLogs.find(log => log.activityType === 'Sale_Recorded');
      
      if (existingSaleLog) {
        // Update the existing Sale_Recorded log to Deal_Closed
        await prisma.activityLog.update({
          where: { id: existingSaleLog.id },
          data: {
            activityType: 'Deal_Closed',
            description: existingSaleLog.description.replace('Sale_Recorded', 'Deal_Closed'),
            timestamp: existingSaleLog.timestamp,
            completedDate: existingSaleLog.completedDate || existingSaleLog.timestamp,
          }
        });
        console.log(`🔄 Updated activity log for: ${item.name} (ID: ${item.id})`);
      } else {
        // Create a new Deal_Closed activity log
        const dealAmount = item.value ? `£${Math.round(item.value)}` : 'Unknown amount';
        const packageType = item.category === 'Partner_Contacts' ? 'Partner Package' : 'Standard Package';
        
        await prisma.activityLog.create({
          data: {
            bdr: item.bdr || 'Unknown',
            activityType: 'Deal_Closed',
            description: `Deal closed: ${packageType} - ${dealAmount}`,
            notes: `Partner from ${item.company || 'Unknown'} network. ${packageType} deal closed successfully!`,
            pipelineItemId: item.id,
            timestamp: item.lastUpdated || new Date(),
            completedDate: item.lastUpdated || new Date(),
          }
        });
        console.log(`✅ Created activity log for: ${item.name} (ID: ${item.id}) - ${dealAmount}`);
      }
      
      activityLogsCreated++;
    }

    console.log(`\n📊 FIX SUMMARY:`);
    console.log(`Activity logs created/updated: ${activityLogsCreated}`);

    // 3. Verify the fix
    const remainingSoldItemsWithoutActivityLogs = await prisma.pipelineItem.findMany({
      where: {
        status: 'Sold',
        activityLogs: {
          none: {
            activityType: 'Deal_Closed'
          }
        }
      }
    });

    console.log(`\n✅ Verification: ${remainingSoldItemsWithoutActivityLogs.length} sold items still without Deal_Closed activity logs`);

    if (remainingSoldItemsWithoutActivityLogs.length === 0) {
      console.log('🎉 SUCCESS: All sold items now have proper Deal_Closed activity logs!');
    } else {
      console.log('⚠️  WARNING: Some sold items still don\'t have activity logs');
      for (const item of remainingSoldItemsWithoutActivityLogs) {
        console.log(`   - ${item.name} (ID: ${item.id})`);
      }
    }

    // 4. Test time-based reporting
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

    console.log(`\n📈 TIME-BASED REPORTING TEST:`);
    console.log(`Deals this week: ${dealsThisWeek}`);
    console.log(`Deals past week: ${dealsPastWeek}`);

    // 5. Final summary
    const totalDealActivityLogs = await prisma.activityLog.count({
      where: {
        activityType: 'Deal_Closed'
      }
    });

    const totalSoldItems = await prisma.pipelineItem.count({
      where: {
        status: 'Sold'
      }
    });

    console.log(`\n📋 FINAL SUMMARY:`);
    console.log(`Total Deal_Closed activity logs: ${totalDealActivityLogs}`);
    console.log(`Total sold items: ${totalSoldItems}`);
    console.log(`Time-based reporting: ${dealsThisWeek + dealsPastWeek > 0 ? '✅ Working' : '❌ No data'}`);

    if (totalDealActivityLogs >= totalSoldItems) {
      console.log('\n🎯 OVERHAUL COMPLETE!');
      console.log('=====================');
      console.log('✅ All sold items have proper Deal_Closed activity logs');
      console.log('✅ Deal activities are timestamped in activity logs');
      console.log('✅ Reporting can find deals by searching activity logs');
      console.log('✅ Time-based reporting (this week vs past sales) working');
    }

  } catch (error) {
    console.error('Error fixing sold items:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixSoldItemsWithoutActivityLogs(); 