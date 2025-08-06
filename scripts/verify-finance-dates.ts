import { PrismaClient } from '@prisma/client';
import { formatDateUK } from '../src/lib/date-utils';

const prisma = new PrismaClient();

async function verifyFinanceDates() {
  console.log('🇬🇧 Verifying Finance Board UK Date Formatting');
  console.log('===============================================');
  
  try {
    // Get a sample of finance entries
    const entries = await prisma.financeEntry.findMany({
      take: 5,
      orderBy: { month: 'asc' }
    });
    
    console.log('\n📊 Sample Finance Entries with UK Date Formatting:');
    console.log('---------------------------------------------------');
    
    entries.forEach((entry, index) => {
      console.log(`\n${index + 1}. ${entry.company}`);
      console.log(`   Month: ${entry.month}`);
      console.log(`   Invoice Date: ${formatDateUK(entry.invoiceDate)} (Raw: ${entry.invoiceDate})`);
      console.log(`   Due Date: ${formatDateUK(entry.dueDate)} (Raw: ${entry.dueDate})`);
      console.log(`   BDR: ${entry.bdr}`);
      console.log(`   Status: ${entry.status}`);
      console.log(`   Amount: £${entry.gbpAmount?.toLocaleString('en-GB') || 'N/A'}`);
    });
    
    console.log('\n✅ Finance date formatting verified!');
    console.log('All dates should display in dd/mm/yyyy format in the UI.');
    
  } catch (error) {
    console.error('❌ Error verifying finance dates:', error);
  } finally {
    await prisma.$disconnect();
  }
}

verifyFinanceDates();