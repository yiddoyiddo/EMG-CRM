import { PrismaClient } from '@prisma/client';
import { startOfWeek, endOfWeek, subWeeks } from 'date-fns';

const prisma = new PrismaClient();

async function testExecutiveDashboardSales() {
  try {
    console.log('=== Testing Executive Dashboard Sales ===\n');

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

    // Filter for actual sales
    const actualSales = allFinanceEntries.filter(entry => 
      ['Paid', 'Invoiced', 'Partial Payment'].includes(entry.status)
    );
    console.log(`Actual Sales (Paid/Invoiced/Partial Payment): ${actualSales.length}`);

    // Calculate sales for this week
    const thisWeekSales = actualSales.filter(entry => 
      entry.createdAt >= thisWeekStart && entry.createdAt <= thisWeekEnd
    );
    console.log(`This Week Sales: ${thisWeekSales.length}`);

    // Calculate sales for last week
    const lastWeekSales = actualSales.filter(entry => 
      entry.createdAt >= lastWeekStart && entry.createdAt <= lastWeekEnd
    );
    console.log(`Last Week Sales: ${lastWeekSales.length}`);

    // Show breakdown of sales by status
    console.log('\nThis Week Sales Breakdown:');
    const thisWeekByStatus = thisWeekSales.reduce((acc: {[key: string]: number}, entry) => {
      acc[entry.status] = (acc[entry.status] || 0) + 1;
      return acc;
    }, {});
    Object.entries(thisWeekByStatus).forEach(([status, count]) => {
      console.log(`  ${status}: ${count}`);
    });

    console.log('\nLast Week Sales Breakdown:');
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

    console.log('\n✅ Executive Dashboard sales test complete');
    console.log('\nExpected Results:');
    console.log(`- This Week Sales should show: ${thisWeekSales.length} (not 119)`);
    console.log(`- Last Week Sales should show: ${lastWeekSales.length} (not 7)`);
    console.log('- Sales numbers should now be accurate and based on actual finance entries');

  } catch (error) {
    console.error('Error testing executive dashboard sales:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testExecutiveDashboardSales(); 