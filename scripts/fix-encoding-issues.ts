import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Comprehensive mapping of encoding issues
const nameFixes: Record<string, string> = {
  'Joo Costa Madureira': 'João Costa Madureira',
  'Christoph Brnnimann': 'Christoph Brönnimann',
  'Sbastien Page': 'Sébastien Page',
  'Emmanuel Gutirrez-Corts': 'Emmanuel Gutiérrez-Cortés',
  'Kerem K?z?ltun': 'Kerem Kızıltunç',
  'Ivn Gonzlez Vallejo': 'Iván González Vallejo',
  'Gnen Sener': 'Gönenç Sener',
  'Kerem K?z?ltunç': 'Kerem Kızıltunç',
  'Ivan Gonzalez Vallejo': 'Iván González Vallejo',
  'Gonenç Sener': 'Gönenç Sener',
  'João Costa Madureira': 'João Costa Madureira',
  'Christoph Brönnimann': 'Christoph Brönnimann',
  'Sébastien Page': 'Sébastien Page',
  'Emmanuel Gutiérrez-Cortés': 'Emmanuel Gutiérrez-Cortés',
  'Kerem Kızıltunç': 'Kerem Kızıltunç',
  'Iván González Vallejo': 'Iván González Vallejo',
  'Gönenç Sener': 'Gönenç Sener',
};

// Company name fixes
const companyFixes: Record<string, string> = {
  '3 Coraes': '3 Corações',
  '3 Coraões': '3 Corações',
  'Kofola ?eskoSlovensko': 'Kofola ČeskoSlovensko',
  'Kofola ČeskoSlovensko': 'Kofola ČeskoSlovensko',
  'Corpuls': 'Corpuls',
  'Christoph Brnnimann': 'Christoph Brönnimann',
  'Christoph Brönnimann': 'Christoph Brönnimann',
  'Kerem K?z?ltun': 'Kerem Kızıltunç',
  'Kerem Kızıltunç': 'Kerem Kızıltunç',
  'Kerem K?z?ltunç': 'Kerem Kızıltunç',
  'Emmanuel Gutirrez-Corts': 'Emmanuel Gutiérrez-Cortés',
  'Emmanuel Gutiérrez-Cortés': 'Emmanuel Gutiérrez-Cortés',
  'Joo Costa Madureira': 'João Costa Madureira',
  'João Costa Madureira': 'João Costa Madureira',
  'Sbastien Page': 'Sébastien Page',
  'Sébastien Page': 'Sébastien Page',
  'Gudmundur Sigurdsson': 'Gudmundur Sigurdsson',
  'Alain Lachapelle': 'Alain Lachapelle',
  'Soren Petsch': 'Soren Petsch',
  'Jairo Cesar': 'Jairo Cesar',
  'Fernando Bosch': 'Fernando Bosch',
  'Anish Azeez': 'Anish Azeez',
  'Adeel Abbasi': 'Adeel Abbasi',
  'Soumendu S': 'Soumendu S',
  'Arik Spitzer': 'Arik Spitzer',
  'Amy Aguirre': 'Amy Aguirre',
  'Jacob Harrison': 'Jacob Harrison',
  'Vivian Wu': 'Vivian Wu',
  'Joel Klooster': 'Joel Klooster',
  'Ali Rashed': 'Ali Rashed',
  'Thomas Scott': 'Thomas Scott',
  'Jussi Lemola': 'Jussi Lemola',
  'Ankit Dalal': 'Ankit Dalal',
  'Nishant Deep': 'Nishant Deep',
  'Claire Phillips': 'Claire Phillips',
  'Andrea Macchia': 'Andrea Macchia',
};

async function fixEncodingIssues() {
  try {
    console.log('Fixing encoding issues...');

    // Get all leads
    const leads = await prisma.lead.findMany();

    for (const lead of leads) {
      let updatedName = lead.name;
      let updatedCompany = lead.company;

      // Fix name encoding issues
      if (nameFixes[lead.name]) {
        updatedName = nameFixes[lead.name];
        console.log(`Fixed name: "${lead.name}" -> "${updatedName}"`);
      }

      // Fix company encoding issues
      if (lead.company && companyFixes[lead.company]) {
        updatedCompany = companyFixes[lead.company];
        console.log(`Fixed company: "${lead.company}" -> "${updatedCompany}"`);
      }

      // Update the lead if there were changes
      if (updatedName !== lead.name || updatedCompany !== lead.company) {
        await prisma.lead.update({
          where: { id: lead.id },
          data: {
            name: updatedName,
            company: updatedCompany
          }
        });
      }
    }

    console.log('All encoding issues fixed successfully');
  } catch (error) {
    console.error('Error fixing encoding issues:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixEncodingIssues(); 