import { PrismaClient } from '@prisma/client';
import { startOfWeek, endOfWeek, subWeeks } from 'date-fns';

const prisma = new PrismaClient();

async function testInvoiceDateSalesReporting() {
  try {
    console.log('=== Testing Sales Reporting with Invoice Dates ===\n');

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

    // Check how many entries have invoice dates
    const entriesWithInvoiceDate = allFinanceEntries.filter(entry => entry.invoiceDate);
    console.log(`Entries with Invoice Date: ${entriesWithInvoiceDate.length}`);
    console.log(`Entries without Invoice Date: ${allFinanceEntries.length - entriesWithInvoiceDate.length}`);

    // Calculate sales for this week using invoice date
    const thisWeekSalesByInvoice = allFinanceEntries.filter(entry => 
      entry.invoiceDate && 
      entry.invoiceDate >= thisWeekStart && 
      entry.invoiceDate <= thisWeekEnd
    );
    console.log(`\nThis Week Sales (by Invoice Date): ${thisWeekSalesByInvoice.length}`);

    // Calculate sales for last week using invoice date
    const lastWeekSalesByInvoice = allFinanceEntries.filter(entry => 
      entry.invoiceDate && 
      entry.invoiceDate >= lastWeekStart && 
      entry.invoiceDate <= lastWeekEnd
    );
    console.log(`Last Week Sales (by Invoice Date): ${lastWeekSalesByInvoice.length}`);

    // For comparison, calculate using createdAt (old method)
    const thisWeekSalesByCreated = allFinanceEntries.filter(entry => 
      entry.createdAt >= thisWeekStart && 
      entry.createdAt <= thisWeekEnd
    );
    console.log(`\nThis Week Sales (by Created Date - OLD): ${thisWeekSalesByCreated.length}`);

    const lastWeekSalesByCreated = allFinanceEntries.filter(entry => 
      entry.createdAt >= lastWeekStart && 
      entry.createdAt <= lastWeekEnd
    );
    console.log(`Last Week Sales (by Created Date - OLD): ${lastWeekSalesByCreated.length}`);

    // Show breakdown by status for this week (invoice date)
    console.log('\nThis Week Sales by Status (Invoice Date):');
    const thisWeekByStatus = thisWeekSalesByInvoice.reduce((acc: {[key: string]: number}, entry) => {
      acc[entry.status] = (acc[entry.status] || 0) + 1;
      return acc;
    }, {});
    Object.entries(thisWeekByStatus).forEach(([status, count]) => {
      console.log(`  ${status}: ${count}`);
    });

    // Show breakdown by status for last week (invoice date)
    console.log('\nLast Week Sales by Status (Invoice Date):');
    const lastWeekByStatus = lastWeekSalesByInvoice.reduce((acc: {[key: string]: number}, entry) => {
      acc[entry.status] = (acc[entry.status] || 0) + 1;
      return acc;
    }, {});
    Object.entries(lastWeekByStatus).forEach(([status, count]) => {
      console.log(`  ${status}: ${count}`);
    });

    // Show BDR breakdown for this week (invoice date)
    console.log('\nThis Week Sales by BDR (Invoice Date):');
    const thisWeekByBDR = thisWeekSalesByInvoice.reduce((acc: {[key: string]: number}, entry) => {
      acc[entry.bdr] = (acc[entry.bdr] || 0) + 1;
      return acc;
    }, {});
    Object.entries(thisWeekByBDR)
      .sort(([,a], [,b]) => b - a)
      .forEach(([bdr, count]) => {
        console.log(`  ${bdr}: ${count} sales`);
      });

    // Show BDR breakdown for last week (invoice date)
    console.log('\nLast Week Sales by BDR (Invoice Date):');
    const lastWeekByBDR = lastWeekSalesByInvoice.reduce((acc: {[key: string]: number}, entry) => {
      acc[entry.bdr] = (acc[entry.bdr] || 0) + 1;
      return acc;
    }, {});
    Object.entries(lastWeekByBDR)
      .sort(([,a], [,b]) => b - a)
      .forEach(([bdr, count]) => {
        console.log(`  ${bdr}: ${count} sales`);
      });

    // Calculate revenue for each week (invoice date)
    const thisWeekRevenue = thisWeekSalesByInvoice.reduce((sum, entry) => sum + (entry.gbpAmount || 0), 0);
    const lastWeekRevenue = lastWeekSalesByInvoice.reduce((sum, entry) => sum + (entry.gbpAmount || 0), 0);

    console.log('\nRevenue Summary (Invoice Date):');
    console.log(`This Week Revenue: £${thisWeekRevenue.toLocaleString()}`);
    console.log(`Last Week Revenue: £${lastWeekRevenue.toLocaleString()}`);

    // Show some sample entries with invoice dates
    console.log('\nSample Entries with Invoice Dates:');
    const sampleEntries = allFinanceEntries
      .filter(entry => entry.invoiceDate)
      .slice(0, 5);
    
    sampleEntries.forEach(entry => {
      console.log(`  Company: ${entry.company}, BDR: ${entry.bdr}, Invoice Date: ${entry.invoiceDate}, Status: ${entry.status}, Amount: £${entry.gbpAmount || 0}`);
    });

    // Show entries without invoice dates
    const entriesWithoutInvoice = allFinanceEntries.filter(entry => !entry.invoiceDate);
    if (entriesWithoutInvoice.length > 0) {
      console.log(`\n⚠️  ${entriesWithoutInvoice.length} entries without invoice dates:`);
      entriesWithoutInvoice.slice(0, 3).forEach(entry => {
        console.log(`  Company: ${entry.company}, BDR: ${entry.bdr}, Created: ${entry.createdAt}, Status: ${entry.status}`);
      });
      if (entriesWithoutInvoice.length > 3) {
        console.log(`  ... and ${entriesWithoutInvoice.length - 3} more`);
      }
    }

    console.log('\n✅ Invoice date sales reporting test complete');
    console.log('\nExpected Results:');
    console.log(`- This Week Sales should show: ${thisWeekSalesByInvoice.length} (based on invoice dates)`);
    console.log(`- Last Week Sales should show: ${lastWeekSalesByInvoice.length} (based on invoice dates)`);
    console.log('- Sales numbers should now reflect when invoices were actually generated');
    console.log('- This provides more accurate sales reporting based on actual invoice timing');

  } catch (error) {
    console.error('Error testing invoice date sales reporting:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testInvoiceDateSalesReporting(); 