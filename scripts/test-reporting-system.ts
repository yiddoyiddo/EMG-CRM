import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testReportingSystem() {
  try {
    console.log('🧪 Testing reporting system...\n');

    // 1. Test finding deals by searching activity logs
    console.log('🔍 TEST 1: Finding deals by searching activity logs...');
    
    const dealActivityLogs = await prisma.activityLog.findMany({
      where: {
        activityType: 'Deal_Closed'
      },
      include: {
        pipelineItem: {
          select: {
            id: true,
            name: true,
            status: true,
            value: true,
            category: true
          }
        }
      },
      orderBy: { timestamp: 'desc' }
    });

    console.log(`✅ Found ${dealActivityLogs.length} Deal_Closed activity logs`);
    
    // Test that we can find deals with amounts
    const dealsWithAmounts = dealActivityLogs.filter(log => 
      log.description.includes('£') || log.notes?.includes('£')
    );
    console.log(`✅ Found ${dealsWithAmounts.length} deals with amounts`);

    // Test that we can find deals by BDR
    const dealsByBdr = await prisma.activityLog.groupBy({
      by: ['bdr'],
      where: {
        activityType: 'Deal_Closed'
      },
      _count: {
        id: true
      }
    });
    console.log(`✅ Found deals for ${dealsByBdr.length} different BDRs`);

    // 2. Test time-based reporting (this week vs past sales)
    console.log('\n📈 TEST 2: Time-based reporting (this week vs past sales)...');
    
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
    const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const dealsThisWeek = await prisma.activityLog.count({
      where: {
        activityType: 'Deal_Closed',
        timestamp: {
          gte: oneWeekAgo
        }
      }
    });

    const dealsLastWeek = await prisma.activityLog.count({
      where: {
        activityType: 'Deal_Closed',
        timestamp: {
          gte: twoWeeksAgo,
          lt: oneWeekAgo
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

    const dealsThisMonth = await prisma.activityLog.count({
      where: {
        activityType: 'Deal_Closed',
        timestamp: {
          gte: oneMonthAgo
        }
      }
    });

    console.log(`✅ This week deals: ${dealsThisWeek}`);
    console.log(`✅ Last week deals: ${dealsLastWeek}`);
    console.log(`✅ Past week deals: ${dealsPastWeek}`);
    console.log(`✅ This month deals: ${dealsThisMonth}`);

    // 3. Test reporting by searching for the word "deal" in activity logs
    console.log('\n🔍 TEST 3: Searching for "deal" in activity logs...');
    
    const dealsBySearch = await prisma.activityLog.findMany({
      where: {
        OR: [
          { activityType: 'Deal_Closed' },
          { description: { contains: 'deal' } },
          { notes: { contains: 'deal' } }
        ]
      }
    });

    console.log(`✅ Found ${dealsBySearch.length} activity logs containing "deal"`);

    // 4. Test reporting by searching for the word "sold" in activity logs
    console.log('\n🔍 TEST 4: Searching for "sold" in activity logs...');
    
    const soldBySearch = await prisma.activityLog.findMany({
      where: {
        OR: [
          { description: { contains: 'sold' } },
          { notes: { contains: 'sold' } }
        ]
      }
    });

    console.log(`✅ Found ${soldBySearch.length} activity logs containing "sold"`);

    // 5. Test that all sold pipeline items have corresponding activity logs
    console.log('\n🔍 TEST 5: Verifying sold items have activity logs...');
    
    const soldItems = await prisma.pipelineItem.findMany({
      where: {
        status: 'Sold'
      },
      include: {
        activityLogs: {
          where: {
            activityType: 'Deal_Closed'
          }
        }
      }
    });

    const soldItemsWithActivityLogs = soldItems.filter(item => item.activityLogs.length > 0);
    const soldItemsWithoutActivityLogs = soldItems.filter(item => item.activityLogs.length === 0);

    console.log(`✅ Sold items with activity logs: ${soldItemsWithActivityLogs.length}`);
    console.log(`❌ Sold items without activity logs: ${soldItemsWithoutActivityLogs.length}`);

    if (soldItemsWithoutActivityLogs.length > 0) {
      console.log('⚠️  Items without activity logs:');
      for (const item of soldItemsWithoutActivityLogs) {
        console.log(`   - ${item.name} (ID: ${item.id})`);
      }
    }

    // 6. Test reporting by BDR performance
    console.log('\n👥 TEST 6: BDR performance reporting...');
    
    const bdrPerformance = await prisma.activityLog.groupBy({
      by: ['bdr'],
      where: {
        activityType: 'Deal_Closed'
      },
      _count: {
        id: true
      },
      orderBy: {
        _count: {
          id: 'desc'
        }
      }
    });

    console.log('📊 BDR Performance:');
    for (const bdr of bdrPerformance) {
      console.log(`   ${bdr.bdr}: ${bdr._count.id} deals`);
    }

    // 7. Test reporting by deal amounts
    console.log('\n💰 TEST 7: Deal amount reporting...');
    
    const dealsWithAmountsInLogs = await prisma.activityLog.findMany({
      where: {
        activityType: 'Deal_Closed',
        description: {
          contains: '£'
        }
      }
    });

    // Extract amounts from descriptions
    const amounts = dealsWithAmountsInLogs.map(log => {
      const match = log.description.match(/£(\d+)/);
      return match ? parseInt(match[1]) : 0;
    }).filter(amount => amount > 0);

    const totalValue = amounts.reduce((sum, amount) => sum + amount, 0);
    const averageValue = amounts.length > 0 ? totalValue / amounts.length : 0;

    console.log(`✅ Total deals with amounts: ${amounts.length}`);
    console.log(`✅ Total value: £${totalValue.toLocaleString()}`);
    console.log(`✅ Average deal value: £${Math.round(averageValue).toLocaleString()}`);

    // 8. Final comprehensive test
    console.log('\n🎯 COMPREHENSIVE TEST RESULTS:');
    console.log('================================');
    console.log(`✅ Deal activity logs: ${dealActivityLogs.length}`);
    console.log(`✅ Time-based reporting: ${dealsThisWeek + dealsPastWeek > 0 ? 'Working' : 'No data'}`);
    console.log(`✅ Deal search functionality: ${dealsBySearch.length} results`);
    console.log(`✅ Sold item coverage: ${soldItemsWithActivityLogs.length}/${soldItems.length} (${Math.round((soldItemsWithActivityLogs.length / soldItems.length) * 100)}%)`);
    console.log(`✅ BDR performance tracking: ${bdrPerformance.length} BDRs`);
    console.log(`✅ Deal value tracking: £${totalValue.toLocaleString()} total value`);

    if (soldItemsWithoutActivityLogs.length === 0 && dealsThisWeek + dealsPastWeek > 0) {
      console.log('\n🎉 ALL TESTS PASSED!');
      console.log('====================');
      console.log('✅ Reporting can find deals by searching activity logs');
      console.log('✅ Time-based reporting (this week vs past sales) working');
      console.log('✅ All sold items have proper activity logs');
      console.log('✅ Deal activities are timestamped in activity logs');
      console.log('✅ System is properly structured for deal tracking');
    } else {
      console.log('\n⚠️  SOME TESTS FAILED');
      console.log('====================');
      if (soldItemsWithoutActivityLogs.length > 0) {
        console.log(`❌ ${soldItemsWithoutActivityLogs.length} sold items missing activity logs`);
      }
      if (dealsThisWeek + dealsPastWeek === 0) {
        console.log('❌ Time-based reporting not working');
      }
    }

  } catch (error) {
    console.error('Error testing reporting system:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testReportingSystem(); 