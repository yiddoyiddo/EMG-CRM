import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const targets = [
    // Weekly targets for individual BDRs
    { name: 'weeklyCalls', value: 10 },
    { name: 'weeklyAgreements', value: 3 },
    { name: 'weeklyListsOut', value: 1 },
    { name: 'weeklySales', value: 0.5 },
    
    // Monthly targets for individual BDRs
    { name: 'monthlyCalls', value: 40 },
    { name: 'monthlyAgreements', value: 12 },
    { name: 'monthlyListsOut', value: 4 },
    { name: 'monthlySales', value: 2 },
    
    // Legacy targets (keeping for backward compatibility)
    { name: 'steadyCallVolume', value: 40 },
    { name: 'agreementRate', value: 12 },
    { name: 'listsOut', value: 4 },
  ];

  for (const target of targets) {
    await prisma.kpiTarget.upsert({
      where: { name: target.name },
      update: {
        value: target.value,
      },
      create: {
        name: target.name,
        value: target.value,
      },
    });
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 