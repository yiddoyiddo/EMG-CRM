import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface NameFix {
  variants: string[];
  correct: string;
}

const nameEncodingFixes: NameFix[] = [
  {
    variants: ['Joo Costa Madureira'],
    correct: 'João Costa Madureira'
  },
  {
    variants: ['Christoph Brnnimann'],
    correct: 'Christoph Brönnimann'
  },
  {
    variants: ['Sbastien Page'],
    correct: 'Sébastien Page'
  },
  {
    variants: ['Emmanuel Gutirrez-Corts'],
    correct: 'Emmanuel Gutiérrez-Cortés'
  },
  {
    variants: ['Kerem K?z?ltun'],
    correct: 'Kerem Kızıltunç'
  },
  {
    variants: ['Ivn Gonzlez Vallejo'],
    correct: 'Iván González Vallejo'
  },
  {
    variants: ['Gnen Sener'],
    correct: 'Gönenç Sener'
  }
];

async function fixNameEncoding() {
  try {
    console.log('Starting name encoding fixes...');

    // Get all leads
    const leads = await prisma.lead.findMany();
    let fixedCount = 0;

    for (const lead of leads) {
      // Check each name fix
      for (const fix of nameEncodingFixes) {
        // Check if the lead name matches any of the incorrect variants
        const matchesVariant = fix.variants.some(variant => lead.name === variant);

        if (matchesVariant) {
          console.log(`Fixing name encoding: "${lead.name}" -> "${fix.correct}"`);
          
          await prisma.lead.update({
            where: { id: lead.id },
            data: { name: fix.correct }
          });
          
          fixedCount++;
          break;
        }
      }
    }

    console.log(`\nName encoding fixes completed!`);
    console.log(`Fixed ${fixedCount} names with encoding issues.`);

  } catch (error) {
    console.error('Error fixing name encoding:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixNameEncoding(); 