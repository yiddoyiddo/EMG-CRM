import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixEncodingWithSQL() {
  try {
    console.log('Starting encoding fixes with SQL...\n');

    // Fix João Costa Madureira
    await prisma.$executeRaw`UPDATE "Lead" SET name = 'João Costa Madureira' WHERE name LIKE '%Jo_o Costa Madureira%' OR name LIKE '%Joao Costa Madureira%'`;
    console.log('Fixed João Costa Madureira');

    // Fix Christoph Brönnimann
    await prisma.$executeRaw`UPDATE "Lead" SET name = 'Christoph Brönnimann' WHERE name LIKE '%Br_nnimann%' OR name LIKE '%Bronnimann%'`;
    console.log('Fixed Christoph Brönnimann');

    // Fix Sébastien Page
    await prisma.$executeRaw`UPDATE "Lead" SET name = 'Sébastien Page' WHERE name LIKE '%S_bastien Page%' OR name LIKE '%Sebastien Page%'`;
    console.log('Fixed Sébastien Page');

    // Fix Emmanuel Gutiérrez-Cortés
    await prisma.$executeRaw`UPDATE "Lead" SET name = 'Emmanuel Gutiérrez-Cortés' WHERE name LIKE '%Guti_rrez%' OR name LIKE '%Gutierrez%'`;
    console.log('Fixed Emmanuel Gutiérrez-Cortés');

    // Fix Kerem Kızıltunç
    await prisma.$executeRaw`UPDATE "Lead" SET name = 'Kerem Kızıltunç' WHERE name LIKE '%K_z_ltun_%' OR name LIKE '%Kiziltunc%'`;
    console.log('Fixed Kerem Kızıltunç');

    // Fix Iván González Vallejo
    await prisma.$executeRaw`UPDATE "Lead" SET name = 'Iván González Vallejo' WHERE name LIKE '%Gonz_lez%' OR name LIKE '%Gonzalez%' AND name LIKE '%Iv_n%'`;
    console.log('Fixed Iván González Vallejo');

    // Fix Gönenç Sener
    await prisma.$executeRaw`UPDATE "Lead" SET name = 'Gönenç Sener' WHERE name LIKE '%G_nen_%' OR name LIKE '%Gonenc%'`;
    console.log('Fixed Gönenç Sener');

    console.log('\nEncoding fixes completed!');

  } catch (error) {
    console.error('Error fixing encoding:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixEncodingWithSQL(); 