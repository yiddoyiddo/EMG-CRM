import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkFinanceData() {
  try {
    console.log('=== Finance Data Analysis ===\n');

    // Check total finance entries
    const totalEntries = await prisma.financeEntry.count();
    console.log(`Total Finance Entries: ${totalEntries}`);

    if (totalEntries === 0) {
      console.log('\n❌ NO FINANCE DATA FOUND!');
      console.log('This explains why sales numbers are not showing in reporting.');
      console.log('\nTo fix this:');
      console.log('1. Add finance entries through the Finance page');
      console.log('2. Ensure entries have gbpAmount values');
      console.log('3. Set appropriate status values (Paid, Pending, etc.)');
      return;
    }

    // Check entries with actual revenue data
    const entriesWithRevenue = await prisma.financeEntry.count({
      where: {
        gbpAmount: {
          not: null
        }
      }
    });
    console.log(`Entries with Revenue Data: ${entriesWithRevenue}`);

    // Check status distribution
    const statusDistribution = await prisma.financeEntry.groupBy({
      by: ['status'],
      _count: {
        status: true
      }
    });
    console.log('\nStatus Distribution:');
    statusDistribution.forEach(status => {
      console.log(`  ${status.status}: ${status._count.status}`);
    });

    // Check BDR distribution
    const bdrDistribution = await prisma.financeEntry.groupBy({
      by: ['bdr'],
      _count: {
        bdr: true
      },
      _sum: {
        gbpAmount: true
      }
    });
    console.log('\nBDR Revenue Distribution:');
    bdrDistribution.forEach(bdr => {
      console.log(`  ${bdr.bdr}: ${bdr._count.bdr} deals, £${bdr._sum.gbpAmount || 0}`);
    });

    // Check monthly distribution
    const monthlyDistribution = await prisma.financeEntry.groupBy({
      by: ['month'],
      _count: {
        month: true
      },
      _sum: {
        gbpAmount: true
      }
    });
    console.log('\nMonthly Revenue Distribution:');
    monthlyDistribution.forEach(month => {
      console.log(`  ${month.month}: ${month._count.month} deals, £${month._sum.gbpAmount || 0}`);
    });

    // Sample recent entries
    const recentEntries = await prisma.financeEntry.findMany({
      take: 5,
      orderBy: {
        createdAt: 'desc'
      }
    });
    console.log('\nRecent Entries:');
    recentEntries.forEach(entry => {
      console.log(`  ${entry.company} - ${entry.bdr} - £${entry.gbpAmount || 0} - ${entry.status}`);
    });

    // Check for entries that might be missing data
    const entriesWithoutRevenue = await prisma.financeEntry.count({
      where: {
        gbpAmount: null
      }
    });
    if (entriesWithoutRevenue > 0) {
      console.log(`\n⚠️  ${entriesWithoutRevenue} entries without revenue data`);
    }

    // Check for entries with empty BDR
    const allEntries = await prisma.financeEntry.findMany({
      select: {
        bdr: true
      }
    });
    const entriesWithoutBDR = allEntries.filter(entry => !entry.bdr || entry.bdr.trim() === '').length;
    if (entriesWithoutBDR > 0) {
      console.log(`⚠️  ${entriesWithoutBDR} entries without BDR assignment`);
    }

    console.log('\n✅ Finance data analysis complete');

  } catch (error) {
    console.error('Error analyzing finance data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkFinanceData(); 