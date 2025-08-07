import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function wipeDatabase() {
  console.log('Starting database wipe (excluding Users)...');

  // Define models that use auto-incrementing IDs (adjust if you use CUID/UUID for IDs on some models)
  const sequencedModels = ['Lead', 'PipelineItem', 'ActivityLog', 'FinanceEntry', 'KpiTarget'];

  try {
    await prisma.$transaction(async (tx) => {
      // Delete in reverse order of dependency
      console.log("Deleting data...");
      await tx.activityLog.deleteMany({});
      await tx.financeEntry.deleteMany({});
      await tx.pipelineItem.deleteMany({});
      await tx.lead.deleteMany({});
      await tx.kpiTarget.deleteMany({});
      console.log('Transactional data deleted.');
    });

    // Reset sequences (PostgreSQL specific)
    console.log('Resetting sequences...');
    for (const modelName of sequencedModels) {
        try {
            // Find the sequence name
            const sequenceNameResult = await prisma.$queryRawUnsafe(
              `SELECT pg_get_serial_sequence('"${modelName}"', 'id');`
            );
            const sequenceName = sequenceNameResult[0]?.pg_get_serial_sequence;

            if (sequenceName) {
                // Reset sequence to 1
                await prisma.$executeRawUnsafe(`ALTER SEQUENCE ${sequenceName} RESTART WITH 1;`);
                console.log(`Sequence for ${modelName} reset to 1.`);
            }
        } catch (error) {
            // Log error but continue (e.g., if a model doesn't use sequences)
            console.error(`Could not reset sequence for ${modelName}:`, error.message);
        }
    }
    console.log('Database wipe completed.');
  } catch (error) {
    console.error('Critical error wiping database:', error);
  } finally {
    await prisma.$disconnect();
  }
}

wipeDatabase();
