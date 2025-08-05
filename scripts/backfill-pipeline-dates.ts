import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔄 Backfilling pipeline item date fields…');

  const batchSize = 100; // process in chunks
  let skip = 0;
  let processed = 0;

  while (true) {
    const items = await prisma.pipelineItem.findMany({
      skip,
      take: batchSize,
      select: {
        id: true,
        agreementDate: true,
        partnerListSentDate: true,
        firstSaleDate: true,
        status: true,
      },
    });

    if (items.length === 0) break;

    for (const item of items) {
      const logs = await prisma.activityLog.findMany({
        where: { pipelineItemId: item.id },
        select: { activityType: true, timestamp: true },
        orderBy: { timestamp: 'asc' },
      });

      let agreementDate = item.agreementDate;
      let partnerListSentDate = item.partnerListSentDate;
      let firstSaleDate = item.firstSaleDate;

      for (const log of logs) {
        switch (log.activityType) {
          case 'Agreement_Sent':
            agreementDate = agreementDate ?? log.timestamp;
            break;
          case 'Partner_List_Sent':
            partnerListSentDate = partnerListSentDate ?? log.timestamp;
            break;
          case 'Status_Change':
            if (item.status === 'Sold') {
              firstSaleDate = firstSaleDate ?? log.timestamp;
            }
            break;
          default:
            break;
        }
      }

      if (agreementDate || partnerListSentDate || firstSaleDate) {
        await prisma.pipelineItem.update({
          where: { id: item.id },
          data: {
            agreementDate,
            partnerListSentDate,
            firstSaleDate,
          },
        });
      }
      processed += 1;
      if (processed % 200 === 0) console.log(`Processed ${processed} items…`);
    }

    skip += items.length;
  }

  console.log(`✅ Backfill complete. Updated ${processed} pipeline items.`);
}

main()
  .catch((e) => {
    console.error('❌ Backfill error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 