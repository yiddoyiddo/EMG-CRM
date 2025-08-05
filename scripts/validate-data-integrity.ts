import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function validateDataIntegrity() {
  console.log('🔍 Validating data integrity...');

  // Check for orphaned activity logs
  const orphanedLogs = await prisma.activityLog.findMany({
    where: {
      pipelineItemId: { not: null },
      pipelineItem: null,
    },
  });
  if (orphanedLogs.length > 0) {
    console.warn(`⚠️  Found ${orphanedLogs.length} orphaned activity logs`);
  }

  // Check for pipeline items without BDR  
  const itemsWithoutBDR = await prisma.pipelineItem.count({
    where: { bdr: '' },
  });
  if (itemsWithoutBDR > 0) {
    console.warn(`⚠️  Found ${itemsWithoutBDR} pipeline items without BDR`);
  }

  // Check for sublists with invalid parent references
  const invalidSublists = await prisma.pipelineItem.findMany({
    where: {
      parentId: { not: null },
      parent: null,
    },
  });
  if (invalidSublists.length > 0) {
    console.warn(`⚠️  Found ${invalidSublists.length} sublists with invalid parent references`);
  }

  console.log('✅ Data integrity validation complete');
}

validateDataIntegrity()
  .catch(console.error)
  .finally(() => prisma.$disconnect()); 