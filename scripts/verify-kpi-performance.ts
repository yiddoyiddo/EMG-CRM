import { PrismaClient } from '@prisma/client';
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, subWeeks, subMonths } from 'date-fns';
import { getAllCallCompletions } from '../src/lib/reporting/call-analytics';

const prisma = new PrismaClient();

const bdrs = [
  "Naeem Patel", "Jennifer Davies", "Jamie Waite", "Verity Kay", "Thomas Hardy",
  "Dan Reeves", "Gary Smith", "Thomas Corcoran", "Jess Collins", "Mark Cawston",
  "Adel Mhiri", "Stephen Vivian", "Rupert Kay"
];

const weeklyTargets = {
  calls: 10,
  agreements: 3,
  lists: 1,
  sales: 0.5
};

const monthlyTargets = {
  calls: 40,
  agreements: 12,
  lists: 4,
  sales: 2
};

async function verifyKPIPerformance() {
  console.log('🎯 Verifying KPI Performance Against Targets\n');
  
  const now = new Date();
  const thisWeekStart = startOfWeek(now, { weekStartsOn: 1 });
  const thisWeekEnd = endOfWeek(now, { weekStartsOn: 1 });
  const lastWeekStart = startOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });
  const lastWeekEnd = endOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });
  const thisMonthStart = startOfMonth(now);
  const thisMonthEnd = endOfMonth(now);
  const lastMonthStart = startOfMonth(subMonths(now, 1));
  const lastMonthEnd = endOfMonth(subMonths(now, 1));
  
  // Get all data
  const pipelineItems = await prisma.pipelineItem.findMany();
  const activityLogs = await prisma.activityLog.findMany();
  
  console.log('📊 WEEKLY PERFORMANCE (Current Week)');
  console.log('====================================');
  
  let teamWeeklyCalls = 0;
  let teamWeeklyAgreements = 0;
  let teamWeeklyLists = 0;
  let teamWeeklySales = 0;
  
  for (const bdr of bdrs) {
    // Weekly metrics
    const weeklyCalls = getAllCallCompletions(pipelineItems, activityLogs, thisWeekStart, thisWeekEnd)
      .filter(call => call.bdr === bdr).length;
    
    const weeklyAgreements = activityLogs.filter(log => 
      log.bdr === bdr && 
      log.activityType === 'Agreement_Sent' && 
      log.timestamp >= thisWeekStart && 
      log.timestamp <= thisWeekEnd
    ).length;
    
    const weeklyLists = activityLogs.filter(log => 
      log.bdr === bdr && 
      log.activityType === 'Partner_List_Sent' && 
      log.timestamp >= thisWeekStart && 
      log.timestamp <= thisWeekEnd
    ).length;
    
    const weeklySales = pipelineItems.filter(item => 
      item.bdr === bdr && 
      item.status === 'Sold' && 
      item.lastUpdated >= thisWeekStart && 
      item.lastUpdated <= thisWeekEnd
    ).length;
    
    teamWeeklyCalls += weeklyCalls;
    teamWeeklyAgreements += weeklyAgreements;
    teamWeeklyLists += weeklyLists;
    teamWeeklySales += weeklySales;
    
    const callsStatus = weeklyCalls >= weeklyTargets.calls ? '✅' : weeklyCalls >= weeklyTargets.calls * 0.8 ? '⚠️' : '❌';
    const agreementsStatus = weeklyAgreements >= weeklyTargets.agreements ? '✅' : weeklyAgreements >= weeklyTargets.agreements * 0.8 ? '⚠️' : '❌';
    const listsStatus = weeklyLists >= weeklyTargets.lists ? '✅' : weeklyLists >= weeklyTargets.lists * 0.8 ? '⚠️' : '❌';
    const salesStatus = weeklySales >= weeklyTargets.sales ? '✅' : weeklySales >= weeklyTargets.sales * 0.8 ? '⚠️' : '❌';
    
    console.log(`${bdr}:`);
    console.log(`  Calls: ${weeklyCalls}/${weeklyTargets.calls} ${callsStatus}`);
    console.log(`  Agreements: ${weeklyAgreements}/${weeklyTargets.agreements} ${agreementsStatus}`);
    console.log(`  Lists: ${weeklyLists}/${weeklyTargets.lists} ${listsStatus}`);
    console.log(`  Sales: ${weeklySales}/${weeklyTargets.sales} ${salesStatus}`);
    console.log('');
  }
  
  const teamWeeklyTargets = {
    calls: bdrs.length * weeklyTargets.calls,
    agreements: bdrs.length * weeklyTargets.agreements,
    lists: bdrs.length * weeklyTargets.lists,
    sales: bdrs.length * weeklyTargets.sales
  };
  
  console.log('🏆 TEAM WEEKLY TOTALS:');
  console.log(`Calls: ${teamWeeklyCalls}/${teamWeeklyTargets.calls} (${((teamWeeklyCalls/teamWeeklyTargets.calls)*100).toFixed(1)}%)`);
  console.log(`Agreements: ${teamWeeklyAgreements}/${teamWeeklyTargets.agreements} (${((teamWeeklyAgreements/teamWeeklyTargets.agreements)*100).toFixed(1)}%)`);
  console.log(`Lists: ${teamWeeklyLists}/${teamWeeklyTargets.lists} (${((teamWeeklyLists/teamWeeklyTargets.lists)*100).toFixed(1)}%)`);
  console.log(`Sales: ${teamWeeklySales}/${teamWeeklyTargets.sales} (${((teamWeeklySales/teamWeeklyTargets.sales)*100).toFixed(1)}%)`);
  
  console.log('\n📈 MONTHLY PERFORMANCE (Current Month)');
  console.log('======================================');
  
  let teamMonthlyCalls = 0;
  let teamMonthlyAgreements = 0;
  let teamMonthlyLists = 0;
  let teamMonthlySales = 0;
  
  for (const bdr of bdrs) {
    // Monthly metrics
    const monthlyCalls = getAllCallCompletions(pipelineItems, activityLogs, thisMonthStart, thisMonthEnd)
      .filter(call => call.bdr === bdr).length;
    
    const monthlyAgreements = activityLogs.filter(log => 
      log.bdr === bdr && 
      log.activityType === 'Agreement_Sent' && 
      log.timestamp >= thisMonthStart && 
      log.timestamp <= thisMonthEnd
    ).length;
    
    const monthlyLists = activityLogs.filter(log => 
      log.bdr === bdr && 
      log.activityType === 'Partner_List_Sent' && 
      log.timestamp >= thisMonthStart && 
      log.timestamp <= thisMonthEnd
    ).length;
    
    const monthlySales = pipelineItems.filter(item => 
      item.bdr === bdr && 
      item.status === 'Sold' && 
      item.lastUpdated >= thisMonthStart && 
      item.lastUpdated <= thisMonthEnd
    ).length;
    
    teamMonthlyCalls += monthlyCalls;
    teamMonthlyAgreements += monthlyAgreements;
    teamMonthlyLists += monthlyLists;
    teamMonthlySales += monthlySales;
    
    const callsStatus = monthlyCalls >= monthlyTargets.calls ? '✅' : monthlyCalls >= monthlyTargets.calls * 0.8 ? '⚠️' : '❌';
    const agreementsStatus = monthlyAgreements >= monthlyTargets.agreements ? '✅' : monthlyAgreements >= monthlyTargets.agreements * 0.8 ? '⚠️' : '❌';
    const listsStatus = monthlyLists >= monthlyTargets.lists ? '✅' : monthlyLists >= monthlyTargets.lists * 0.8 ? '⚠️' : '❌';
    const salesStatus = monthlySales >= monthlyTargets.sales ? '✅' : monthlySales >= monthlyTargets.sales * 0.8 ? '⚠️' : '❌';
    
    console.log(`${bdr}:`);
    console.log(`  Calls: ${monthlyCalls}/${monthlyTargets.calls} ${callsStatus}`);
    console.log(`  Agreements: ${monthlyAgreements}/${monthlyTargets.agreements} ${agreementsStatus}`);
    console.log(`  Lists: ${monthlyLists}/${monthlyTargets.lists} ${listsStatus}`);
    console.log(`  Sales: ${monthlySales}/${monthlyTargets.sales} ${salesStatus}`);
    console.log('');
  }
  
  const teamMonthlyTargets = {
    calls: bdrs.length * monthlyTargets.calls,
    agreements: bdrs.length * monthlyTargets.agreements,
    lists: bdrs.length * monthlyTargets.lists,
    sales: bdrs.length * monthlyTargets.sales
  };
  
  console.log('🏆 TEAM MONTHLY TOTALS:');
  console.log(`Calls: ${teamMonthlyCalls}/${teamMonthlyTargets.calls} (${((teamMonthlyCalls/teamMonthlyTargets.calls)*100).toFixed(1)}%)`);
  console.log(`Agreements: ${teamMonthlyAgreements}/${teamMonthlyTargets.agreements} (${((teamMonthlyAgreements/teamMonthlyTargets.agreements)*100).toFixed(1)}%)`);
  console.log(`Lists: ${teamMonthlyLists}/${teamMonthlyTargets.lists} (${((teamMonthlyLists/teamMonthlyTargets.lists)*100).toFixed(1)}%)`);
  console.log(`Sales: ${teamMonthlySales}/${teamMonthlyTargets.sales} (${((teamMonthlySales/teamMonthlyTargets.sales)*100).toFixed(1)}%)`);
  
  // Overall performance summary
  const weeklyPerformance = (
    (teamWeeklyCalls/teamWeeklyTargets.calls) +
    (teamWeeklyAgreements/teamWeeklyTargets.agreements) +
    (teamWeeklyLists/teamWeeklyTargets.lists) +
    (teamWeeklySales/teamWeeklyTargets.sales)
  ) / 4;
  
  const monthlyPerformance = (
    (teamMonthlyCalls/teamMonthlyTargets.calls) +
    (teamMonthlyAgreements/teamMonthlyTargets.agreements) +
    (teamMonthlyLists/teamMonthlyTargets.lists) +
    (teamMonthlySales/teamMonthlyTargets.sales)
  ) / 4;
  
  console.log('\n🎯 OVERALL PERFORMANCE SUMMARY');
  console.log('==============================');
  console.log(`Weekly Performance: ${(weeklyPerformance * 100).toFixed(1)}% of targets`);
  console.log(`Monthly Performance: ${(monthlyPerformance * 100).toFixed(1)}% of targets`);
  
  if (weeklyPerformance >= 1.0 && monthlyPerformance >= 1.0) {
    console.log('🎉 EXCELLENT! All targets are being met or exceeded!');
  } else if (weeklyPerformance >= 0.9 && monthlyPerformance >= 0.9) {
    console.log('✅ GOOD! Performance is close to targets');
  } else {
    console.log('⚠️ NEEDS ATTENTION! Some targets are below expectations');
  }
  
  // Additional insights
  console.log('\n📊 ADDITIONAL INSIGHTS');
  console.log('======================');
  
  const totalSoldItems = pipelineItems.filter(item => item.status === 'Sold').length;
  const totalRevenue = pipelineItems
    .filter(item => item.status === 'Sold' && item.value)
    .reduce((sum, item) => sum + (item.value || 0), 0);
    
  const avgDealSize = totalSoldItems > 0 ? totalRevenue / totalSoldItems : 0;
  const conversionRate = teamMonthlyCalls > 0 ? (teamMonthlySales / teamMonthlyCalls) * 100 : 0;
  
  console.log(`Total Sold Items: ${totalSoldItems}`);
  console.log(`Total Revenue: £${totalRevenue.toLocaleString()}`);
  console.log(`Average Deal Size: £${avgDealSize.toLocaleString()}`);
  console.log(`Monthly Conversion Rate: ${conversionRate.toFixed(1)}%`);
  
  // Sublist analysis
  const sublists = pipelineItems.filter(item => item.isSublist);
  const sublistItems = pipelineItems.filter(item => item.parentId !== null);
  
  console.log(`\nSublists Created: ${sublists.length}`);
  console.log(`Sublist Items: ${sublistItems.length}`);
  console.log(`Avg Items per Sublist: ${sublists.length > 0 ? (sublistItems.length / sublists.length).toFixed(1) : 0}`);
}

async function main() {
  try {
    await verifyKPIPerformance();
  } catch (error) {
    console.error('Error verifying KPI performance:', error);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());