import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testSalesReporting() {
  try {
    console.log('=== Testing Sales Reporting ===\n');

    // Get all finance entries
    const allFinanceEntries = await prisma.financeEntry.findMany();
    console.log(`Total Finance Entries: ${allFinanceEntries.length}`);

    // Filter for actual sales
    const actualSales = allFinanceEntries.filter(entry => 
      ['Paid', 'Invoiced', 'Partial Payment'].includes(entry.status)
    );
    console.log(`Actual Sales (Paid/Invoiced/Partial Payment): ${actualSales.length}`);

    // Show breakdown by status
    const statusBreakdown = allFinanceEntries.reduce((acc: {[key: string]: number}, entry) => {
      acc[entry.status] = (acc[entry.status] || 0) + 1;
      return acc;
    }, {});
    
    console.log('\nStatus Breakdown:');
    Object.entries(statusBreakdown).forEach(([status, count]) => {
      const isSalesStatus = ['Paid', 'Invoiced', 'Partial Payment'].includes(status);
      console.log(`  ${status}: ${count} ${isSalesStatus ? '(SALES)' : '(NOT SALES)'}`);
    });

    // Calculate total revenue from actual sales
    const totalRevenue = actualSales.reduce((sum, entry) => sum + (entry.gbpAmount || 0), 0);
    console.log(`\nTotal Revenue from Actual Sales: £${totalRevenue.toLocaleString()}`);

    // Show BDR performance for actual sales
    const bdrSalesPerformance = actualSales.reduce((acc: {[key: string]: {count: number, revenue: number}}, entry) => {
      if (!acc[entry.bdr]) {
        acc[entry.bdr] = { count: 0, revenue: 0 };
      }
      acc[entry.bdr].count++;
      acc[entry.bdr].revenue += entry.gbpAmount || 0;
      return acc;
    }, {});

    console.log('\nBDR Sales Performance:');
    Object.entries(bdrSalesPerformance)
      .sort(([,a], [,b]) => b.revenue - a.revenue)
      .forEach(([bdr, data]) => {
        console.log(`  ${bdr}: ${data.count} sales, £${data.revenue.toLocaleString()}`);
      });

    // Test monthly sales
    const currentMonth = new Date().toISOString().slice(0, 7);
    const currentMonthSales = actualSales.filter(entry => entry.month === currentMonth);
    const currentMonthRevenue = currentMonthSales.reduce((sum, entry) => sum + (entry.gbpAmount || 0), 0);
    
    console.log(`\nCurrent Month (${currentMonth}) Sales:`);
    console.log(`  Sales Count: ${currentMonthSales.length}`);
    console.log(`  Revenue: £${currentMonthRevenue.toLocaleString()}`);

    // Test quarterly sales
    const currentQuarter = Math.floor((new Date().getMonth() + 3) / 3);
    const currentYear = new Date().getFullYear();
    const quarterlySales = actualSales.filter(entry => {
      if (!entry.createdAt) return false;
      const entryDate = new Date(entry.createdAt);
      const entryQuarter = Math.floor((entryDate.getMonth() + 3) / 3);
      return entryDate.getFullYear() === currentYear && entryQuarter === currentQuarter;
    });
    const quarterlyRevenue = quarterlySales.reduce((sum, entry) => sum + (entry.gbpAmount || 0), 0);
    
    console.log(`\nCurrent Quarter (Q${currentQuarter} ${currentYear}) Sales:`);
    console.log(`  Sales Count: ${quarterlySales.length}`);
    console.log(`  Revenue: £${quarterlyRevenue.toLocaleString()}`);

    console.log('\n✅ Sales reporting test complete');
    console.log('\nExpected Results:');
    console.log('- Sales numbers should now only include Paid, Invoiced, and Partial Payment entries');
    console.log('- Revenue calculations should be more accurate');
    console.log('- BDR performance should reflect actual sales, not all finance entries');

  } catch (error) {
    console.error('Error testing sales reporting:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testSalesReporting(); 