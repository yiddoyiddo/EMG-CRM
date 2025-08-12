import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixDuplicates() {
  try {
    console.log('Checking for and fixing duplicate entries...\n');

    // Get all leads with the same name
    const duplicates = await prisma.$queryRaw`
      SELECT name, COUNT(*) as count
      FROM "Lead"
      GROUP BY name
      HAVING COUNT(*) > 1
    `;

    console.log('Found duplicates:', duplicates);

    // For each duplicate name
    for (const duplicate of duplicates as any[]) {
      const name = duplicate.name;
      console.log(`\nFixing duplicates for: ${name}`);

      // Get all leads with this name
      const leads = await prisma.lead.findMany({
        where: { name },
        orderBy: { id: 'asc' }
      });

      // Keep the first one (lowest ID) and delete the rest
      if (leads.length > 1) {
        const [keep, ...remove] = leads;
        console.log(`Keeping lead ID ${keep.id}, removing ${remove.length} duplicate(s)`);

        // Delete duplicates
        await prisma.lead.deleteMany({
          where: {
            id: {
              in: remove.map(l => l.id)
            }
          }
        });
      }
    }

    console.log('\nDuplicate fixes completed!');

  } catch (error) {
    console.error('Error fixing duplicates:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixDuplicates(); 