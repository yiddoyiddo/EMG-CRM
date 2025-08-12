const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  const [leadCount, pipelineCount, activityCount, financeCount, kpiCount] = await Promise.all([
    prisma.lead.count(),
    prisma.pipelineItem.count(),
    prisma.activityLog.count(),
    prisma.financeEntry.count(),
    prisma.kpiTarget.count(),
  ]);

  console.log('Counts:');
  console.log({ leadCount, pipelineCount, activityCount, financeCount, kpiCount });

  const unresolvedSublist = await prisma.pipelineItem.count({
    where: { isSublist: true, parentId: null },
  });
  console.log('Pipeline sublist items missing parentId:', unresolvedSublist);

  const itemsNeedingLead = await prisma.pipelineItem.count({
    where: { leadId: null, NOT: { email: null } },
  });
  console.log('Pipeline items with email but missing leadId:', itemsNeedingLead);

  const activityNoRefs = await prisma.activityLog.count({
    where: { leadId: null, pipelineItemId: null },
  });
  console.log('Activity logs with no lead or pipeline references:', activityNoRefs);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });



