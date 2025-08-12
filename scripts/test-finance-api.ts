import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testFinanceApi() {
  try {
    console.log('Testing finance API...');
    
    // Test direct database query
    const financeEntries = await prisma.financeEntry.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        company: true,
        bdr: true,
        status: true,
        soldAmount: true,
        gbpAmount: true,
        month: true,
        createdAt: true
      }
    });
    
    console.log('📊 Finance entries found:', financeEntries.length);
    
    financeEntries.forEach((entry, index) => {
      console.log(`${index + 1}. ${entry.company} - BDR: ${entry.bdr} - Status: ${entry.status} - Amount: $${entry.soldAmount || 0}`);
    });
    
    // Test BDR filtering
    const danReevesEntries = await prisma.financeEntry.findMany({
      where: { bdr: 'Dan Reeves' },
      take: 5,
      select: {
        id: true,
        company: true,
        bdr: true,
        status: true,
        soldAmount: true
      }
    });
    
    console.log(`\n📋 Dan Reeves finance entries: ${danReevesEntries.length} found`);
    danReevesEntries.forEach((entry, index) => {
      console.log(`${index + 1}. ${entry.company} - Status: ${entry.status} - Amount: $${entry.soldAmount || 0}`);
    });
    
    // Test analytics query
    const allEntries = await prisma.financeEntry.findMany({
      select: {
        bdr: true,
        soldAmount: true,
        status: true
      }
    });
    
    const bdrPerformance = Object.entries(
      allEntries.reduce((acc: {[key: string]: {revenue: number, deals: number}}, entry) => {
        const bdrName = entry.bdr || 'Unassigned';
        if (!acc[bdrName]) {
          acc[bdrName] = { revenue: 0, deals: 0 };
        }
        if (entry.soldAmount) {
          acc[bdrName].revenue += entry.soldAmount;
          acc[bdrName].deals += 1;
        }
        return acc;
      }, {})
    ).sort(([,a], [,b]) => b.revenue - a.revenue);
    
    console.log('\n📊 BDR Performance:');
    bdrPerformance.forEach(([bdr, stats]) => {
      console.log(`- ${bdr}: $${stats.revenue.toFixed(2)} (${stats.deals} deals)`);
    });
    
    console.log('\n✅ Finance API should now be working!');
    
  } catch (error) {
    console.error('❌ Error testing finance API:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testFinanceApi();
