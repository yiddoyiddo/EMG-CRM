import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkNames() {
  try {
    console.log('Checking names with potential encoding issues...\n');

    const namesToCheck = [
      'João',
      'Joao',
      'Jo?o',
      'Jo�o',
      'Brönnimann',
      'Bronnimann',
      'Br?nnimann',
      'Br�nnimann',
      'Sébastien',
      'Sebastien',
      'S?bastien',
      'S�bastien',
      'Gutiérrez',
      'Gutierrez',
      'Guti?rrez',
      'Guti�rrez',
      'Kızıltunç',
      'Kiziltunc',
      'K?z?ltun?',
      'K?z?ltun�',
      'González',
      'Gonzalez',
      'Gonz?lez',
      'Gonz�lez',
      'Gönenç',
      'Gonenc',
      'G?nen?',
      'G�nen�'
    ];

    for (const nameFragment of namesToCheck) {
      const leads = await prisma.lead.findMany({
        where: {
          name: {
            contains: nameFragment
          }
        }
      });

      if (leads.length > 0) {
        console.log(`Found leads containing "${nameFragment}":`);
        leads.forEach(lead => {
          console.log(`  - ${lead.name}`);
        });
        console.log('');
      }
    }

  } catch (error) {
    console.error('Error checking names:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkNames(); 