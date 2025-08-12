import { PrismaClient } from '@prisma/client';
import { startOfWeek, endOfWeek, subWeeks } from 'date-fns';

const prisma = new PrismaClient();

async function testUpdatedSalesReporting() {
  try {
    console.log('=== Testing Updated Sales Reporting (All Sales Generated) ===\n');

    const now = new Date();
    const thisWeekStart = startOfWeek(now, { weekStartsOn: 1 });
    const thisWeekEnd = endOfWeek(now, { weekStartsOn: 1 });
    const lastWeekStart = startOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });
    const lastWeekEnd = endOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });

    console.log(`This Week: ${thisWeekStart.toISOString()} to ${thisWeekEnd.toISOString()}`);
    console.log(`Last Week: ${lastWeekStart.toISOString()} to ${lastWeekEnd.toISOString()}\n`);

    // Get all finance entries
    const allFinanceEntries = await prisma.financeEntry.findMany();
    console.log(`Total Finance Entries: ${allFinanceEntries.length}`);

    // Calculate sales for this week (all entries, regardless of payment status)
    const thisWeekSales = allFinanceEntries.filter(entry => 
      entry.createdAt >= thisWeekStart && entry.createdAt <= thisWeekEnd
    );
    console.log(`This Week Sales Generated: ${thisWeekSales.length}`);

    // Calculate sales for last week (all entries, regardless of payment status)
    const lastWeekSales = allFinanceEntries.filter(entry => 
      entry.createdAt >= lastWeekStart && entry.createdAt <= lastWeekEnd
    );
    console.log(`Last Week Sales Generated: ${lastWeekSales.length}`);

    // Show breakdown by status for this week
    console.log('\nThis Week Sales by Status:');
    const thisWeekByStatus = thisWeekSales.reduce((acc: {[key: string]: number}, entry) => {
      acc[entry.status] = (acc[entry.status] || 0) + 1;
      return acc;
    }, {});
    Object.entries(thisWeekByStatus).forEach(([status, count]) => {
      console.log(`  ${status}: ${count}`);
    });

    // Show breakdown by status for last week
    console.log('\nLast Week Sales by Status:');
    const lastWeekByStatus = lastWeekSales.reduce((acc: {[key: string]: number}, entry) => {
      acc[entry.status] = (acc[entry.status] || 0) + 1;
      return acc;
    }, {});
    Object.entries(lastWeekByStatus).forEach(([status, count]) => {
      console.log(`  ${status}: ${count}`);
    });

    // Show BDR breakdown for this week
    console.log('\nThis Week Sales by BDR:');
    const thisWeekByBDR = thisWeekSales.reduce((acc: {[key: string]: number}, entry) => {
      acc[entry.bdr] = (acc[entry.bdr] || 0) + 1;
      return acc;
    }, {});
    Object.entries(thisWeekByBDR)
      .sort(([,a], [,b]) => b - a)
      .forEach(([bdr, count]) => {
        console.log(`  ${bdr}: ${count} sales`);
      });

    // Show BDR breakdown for last week
    console.log('\nLast Week Sales by BDR:');
    const lastWeekByBDR = lastWeekSales.reduce((acc: {[key: string]: number}, entry) => {
      acc[entry.bdr] = (acc[entry.bdr] || 0) + 1;
      return acc;
    }, {});
    Object.entries(lastWeekByBDR)
      .sort(([,a], [,b]) => b - a)
      .forEach(([bdr, count]) => {
        console.log(`  ${bdr}: ${count} sales`);
      });

    // Calculate revenue for each week
    const thisWeekRevenue = thisWeekSales.reduce((sum, entry) => sum + (entry.gbpAmount || 0), 0);
    const lastWeekRevenue = lastWeekSales.reduce((sum, entry) => sum + (entry.gbpAmount || 0), 0);

    console.log('\nRevenue Summary:');
    console.log(`This Week Revenue: £${thisWeekRevenue.toLocaleString()}`);
    console.log(`Last Week Revenue: £${lastWeekRevenue.toLocaleString()}`);

    // Show total status breakdown
    console.log('\nTotal Status Breakdown:');
    const totalByStatus = allFinanceEntries.reduce((acc: {[key: string]: number}, entry) => {
      acc[entry.status] = (acc[entry.status] || 0) + 1;
      return acc;
    }, {});
    Object.entries(totalByStatus).forEach(([status, count]) => {
      console.log(`  ${status}: ${count}`);
    });

    console.log('\n✅ Updated sales reporting test complete');
    console.log('\nExpected Results:');
    console.log(`- This Week Sales should show: ${thisWeekSales.length} (all sales generated this week)`);
    console.log(`- Last Week Sales should show: ${lastWeekSales.length} (all sales generated last week)`);
    console.log('- Sales numbers should now include all finance entries, regardless of payment status');
    console.log('- This reflects actual sales performance, not just paid sales');

  } catch (error) {
    console.error('Error testing updated sales reporting:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testUpdatedSalesReporting(); 