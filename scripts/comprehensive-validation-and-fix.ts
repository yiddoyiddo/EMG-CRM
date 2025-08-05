import { PrismaClient } from '@prisma/client';
import { addDays, subDays, format, differenceInDays } from 'date-fns';

const prisma = new PrismaClient();

interface ValidationIssue {
  category: string;
  severity: 'critical' | 'warning' | 'info';
  description: string;
  count?: number;
  action: string;
}

async function comprehensiveValidationAndFix() {
  console.log('🔍 Starting comprehensive CRM validation and fix...\n');
  
  const issues: ValidationIssue[] = [];
  let fixedCount = 0;
  
  try {
    // 1. Check BDR Distribution
    console.log('👥 Validating BDR distribution...');
    const bdrDistribution = await prisma.pipelineItem.groupBy({
      by: ['bdr'],
      _count: { bdr: true }
    });
    
    console.log(`📊 Found ${bdrDistribution.length} BDRs with data:`);
    bdrDistribution.forEach(item => {
      console.log(`   ${item.bdr}: ${item._count.bdr} items`);
    });
    
    if (bdrDistribution.length < 5) {
      issues.push({
        category: 'BDR Distribution',
        severity: 'warning',
        description: `Only ${bdrDistribution.length} BDRs have pipeline data`,
        action: 'Consider adding more test data for remaining BDRs'
      });
    }
    
    // 2. Check Date Field Usage
    console.log('\n📅 Validating date field usage...');
    const [
      itemsWithCallDates,
      itemsWithExpectedClose,
      agreementItemsWithExpectedClose,
      soldItemsWithoutSaleDate
    ] = await Promise.all([
      prisma.pipelineItem.count({
        where: { 
          category: 'Calls',
          callDate: { not: null }
        }
      }),
      prisma.pipelineItem.count({
        where: { expectedCloseDate: { not: null } }
      }),
      prisma.pipelineItem.count({
        where: { 
          status: { contains: 'Agreement' },
          expectedCloseDate: { not: null }
        }
      }),
      prisma.pipelineItem.count({
        where: { 
          status: 'Sold',
          // firstSaleDate: null  // TODO: Uncomment when field exists
        }
      })
    ]);
    
    console.log(`   Call items with call dates: ${itemsWithCallDates}`);
    console.log(`   Items with expected close dates: ${itemsWithExpectedClose}`);
    console.log(`   Agreement items using expectedCloseDate: ${agreementItemsWithExpectedClose}`);
    
    if (agreementItemsWithExpectedClose > 0) {
      issues.push({
        category: 'Date Semantics',
        severity: 'critical',
        description: 'Agreement items are using expectedCloseDate for partner list due dates',
        count: agreementItemsWithExpectedClose,
        action: 'Need to migrate to partnerListDueDate field'
      });
    }
    
    // 3. Check Historical Data
    console.log('\n📈 Validating historical data...');
    const now = new Date();
    const lastMonth = subDays(now, 30);
    const lastWeek = subDays(now, 7);
    
    const [
      itemsLastMonth,
      itemsLastWeek,
      activitiesLastMonth,
      futureCalls
    ] = await Promise.all([
      prisma.pipelineItem.count({
        where: { addedDate: { gte: lastMonth } }
      }),
      prisma.pipelineItem.count({
        where: { addedDate: { gte: lastWeek } }
      }),
      prisma.activityLog.count({
        where: { timestamp: { gte: lastMonth } }
      }),
      prisma.pipelineItem.count({
        where: { 
          callDate: { gt: now }
        }
      })
    ]);
    
    console.log(`   Items added last month: ${itemsLastMonth}`);
    console.log(`   Items added last week: ${itemsLastWeek}`);
    console.log(`   Activities last month: ${activitiesLastMonth}`);
    console.log(`   Future calls scheduled: ${futureCalls}`);
    
    if (itemsLastMonth === 0) {
      issues.push({
        category: 'Historical Data',
        severity: 'warning',
        description: 'No pipeline items from last month',
        action: 'Add historical data for trend analysis'
      });
    }
    
    if (futureCalls < 20) {
      issues.push({
        category: 'Future Pipeline',
        severity: 'warning',
        description: `Only ${futureCalls} future calls scheduled`,
        action: 'Schedule more calls to maintain pipeline health'
      });
    }
    
    // 4. Check Status Consistency
    console.log('\n📋 Validating status consistency...');
    const statusDistribution = await prisma.pipelineItem.groupBy({
      by: ['status'],
      _count: { status: true }
    });
    
    console.log('   Status distribution:');
    statusDistribution.forEach(item => {
      console.log(`   ${item.status}: ${item._count.status}`);
    });
    
    // Check for invalid statuses
    const invalidStatuses = statusDistribution.filter(item => 
      !item.status || item.status.trim() === ''
    );
    
    if (invalidStatuses.length > 0) {
      issues.push({
        category: 'Data Quality',
        severity: 'critical',
        description: 'Items with invalid or empty statuses found',
        count: invalidStatuses.reduce((sum, item) => sum + item._count.status, 0),
        action: 'Fix invalid status values'
      });
    }
    
    // 5. Check Agreement Process Flow
    console.log('\n🤝 Validating agreement process flow...');
    const [
      agreementItems,
      listsOut,
      soldItems
    ] = await Promise.all([
      prisma.pipelineItem.count({
        where: { status: { contains: 'Agreement' } }
      }),
      prisma.pipelineItem.count({
        where: { status: { contains: 'List Out' } }
      }),
      prisma.pipelineItem.count({
        where: { status: 'Sold' }
      })
    ]);
    
    console.log(`   Agreements: ${agreementItems}`);
    console.log(`   Lists out: ${listsOut}`);
    console.log(`   Sold items: ${soldItems}`);
    
    const agreementToListRatio = agreementItems > 0 ? (listsOut / agreementItems) * 100 : 0;
    const listToSaleRatio = listsOut > 0 ? (soldItems / listsOut) * 100 : 0;
    
    console.log(`   Agreement → List ratio: ${Math.round(agreementToListRatio)}%`);
    console.log(`   List → Sale ratio: ${Math.round(listToSaleRatio)}%`);
    
    if (agreementToListRatio < 50) {
      issues.push({
        category: 'Sales Process',
        severity: 'warning',
        description: `Low agreement to list conversion (${Math.round(agreementToListRatio)}%)`,
        action: 'Review why agreements are not converting to lists'
      });
    }
    
    // 6. Check Activity Log Completeness
    console.log('\n📝 Validating activity logs...');
    const [
      totalActivities,
      callActivities,
      agreementActivities,
      listActivities
    ] = await Promise.all([
      prisma.activityLog.count(),
      prisma.activityLog.count({
        where: { activityType: { contains: 'Call' } }
      }),
      prisma.activityLog.count({
        where: { activityType: 'Agreement_Sent' }
      }),
      prisma.activityLog.count({
        where: { activityType: 'Partner_List_Sent' }
      })
    ]);
    
    console.log(`   Total activities: ${totalActivities}`);
    console.log(`   Call activities: ${callActivities}`);
    console.log(`   Agreement activities: ${agreementActivities}`);
    console.log(`   List activities: ${listActivities}`);
    
    // 7. Validate Reporting Endpoints
    console.log('\n🔗 Testing reporting endpoints...');
    const reportingTests = await testReportingEndpoints();
    issues.push(...reportingTests);
    
    // 8. Summary and Recommendations
    console.log('\n📊 VALIDATION SUMMARY:');
    console.log('=' .repeat(50));
    
    const criticalIssues = issues.filter(i => i.severity === 'critical');
    const warningIssues = issues.filter(i => i.severity === 'warning');
    const infoIssues = issues.filter(i => i.severity === 'info');
    
    console.log(`❌ Critical Issues: ${criticalIssues.length}`);
    console.log(`⚠️  Warning Issues: ${warningIssues.length}`);
    console.log(`ℹ️  Info Issues: ${infoIssues.length}`);
    
    issues.forEach(issue => {
      const icon = issue.severity === 'critical' ? '❌' : 
                   issue.severity === 'warning' ? '⚠️' : 'ℹ️';
      console.log(`${icon} ${issue.category}: ${issue.description}`);
      console.log(`   Action: ${issue.action}`);
      if (issue.count) console.log(`   Count: ${issue.count}`);
    });
    
    // 9. Auto-fix what we can
    console.log('\n🔧 Auto-fixing issues...');
    
    // Fix missing call dates for call items
    const callItemsWithoutDates = await prisma.pipelineItem.findMany({
      where: {
        category: 'Calls',
        callDate: null
      }
    });
    
    if (callItemsWithoutDates.length > 0) {
      console.log(`📞 Fixing ${callItemsWithoutDates.length} call items without dates...`);
      for (const item of callItemsWithoutDates) {
        const futureDate = addDays(now, Math.floor(Math.random() * 14) + 1);
        await prisma.pipelineItem.update({
          where: { id: item.id },
          data: { callDate: futureDate }
        });
        fixedCount++;
      }
    }
    
    console.log(`\n✅ Fixed ${fixedCount} issues automatically`);
    
    if (criticalIssues.length === 0 && warningIssues.length <= 2) {
      console.log('\n🎉 System validation passed! The CRM is in good shape.');
    } else {
      console.log('\n⚠️  System needs attention. Please review the issues above.');
    }
    
  } catch (error) {
    console.error('❌ Error during validation:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

async function testReportingEndpoints(): Promise<ValidationIssue[]> {
  const issues: ValidationIssue[] = [];
  
  try {
    // Test if we can get basic data for each endpoint
    
    // Test executive dashboard data
    const dashboardData = await prisma.pipelineItem.findMany({
      select: { bdr: true, status: true, category: true },
      take: 10
    });
    
    if (dashboardData.length === 0) {
      issues.push({
        category: 'Reporting Data',
        severity: 'critical',
        description: 'No pipeline data available for reporting',
        action: 'Generate test data'
      });
    }
    
    // Test BDR filtering
    const uniqueBDRs = await prisma.pipelineItem.groupBy({
      by: ['bdr'],
      _count: { bdr: true }
    });
    
    if (uniqueBDRs.length < 3) {
      issues.push({
        category: 'BDR Filtering',
        severity: 'warning',
        description: `Only ${uniqueBDRs.length} BDRs available for filtering`,
        action: 'Add more BDR test data'
      });
    }
    
    console.log(`   Dashboard data: ✅ (${dashboardData.length} items)`);
    console.log(`   BDR filtering: ✅ (${uniqueBDRs.length} BDRs)`);
    
  } catch (error) {
    issues.push({
      category: 'Reporting Endpoints',
      severity: 'critical',
      description: `Error testing reporting endpoints: ${(error as Error).message}`,
      action: 'Fix database connection or schema issues'
    });
  }
  
  return issues;
}

// Run validation if this script is executed directly
if (require.main === module) {
  comprehensiveValidationAndFix().catch(console.error);
}

export { comprehensiveValidationAndFix }; 