import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Company name fixes
const companyFixes: Record<string, string> = {
  '3 Cora��es': '3 Corações',
  'Azul Linhas A�reas Brasileiras': 'Azul Linhas Aéreas Brasileiras'
};

// BDR assignments for leads with no BDR
const bdrAssignments: Record<string, string> = {
  'Abhishek Gaurav': 'Jennifer Davies',
  'Alaa Abu Zaytoon': 'Mark Cawston',
  'Alex Broadbent': 'Naeem Patel',
  'Ali Moghaddam': 'Jennifer Davies',
  'Andrea Macchia': 'Stephen Vivian',
  'Bill Radtke': 'Jennifer Davies',
  'Brian Timmeny': 'Stephen Vivian',
  'Derek Taylor': 'Jennifer Davies',
  'Ganesh Kaupannan': 'Jennifer Davies',
  'Gopal Bhat': 'Jennifer Davies',
  'Ian Hood': 'Jennifer Davies',
  'Jaime Smeke': 'Jennifer Davies',
  'Laura Kendrick': 'Stephen Vivian',
  'Mary Beth Green': 'Stephen Vivian',
  'Ram Shenoy': 'Jennifer Davies',
  'Rogerio Braz': 'Stephen Vivian',
  'Tommi Tuovila': 'Jennifer Davies',
  'Veronica Gidstedt': 'Jennifer Davies'
};

async function fixBdrAndCompanies() {
  try {
    console.log('Starting BDR and company name fixes...\n');

    // Fix company names
    console.log('Fixing company names...');
    for (const [incorrectName, correctName] of Object.entries(companyFixes)) {
      const updated = await prisma.lead.updateMany({
        where: { company: incorrectName },
        data: { company: correctName }
      });
      if (updated.count > 0) {
        console.log(`Fixed company name: "${incorrectName}" -> "${correctName}"`);
      }
    }

    // Fix missing BDR assignments
    console.log('\nFixing missing BDR assignments...');
    for (const [name, bdr] of Object.entries(bdrAssignments)) {
      const updated = await prisma.lead.updateMany({
        where: { 
          name,
          OR: [
            { bdr: null },
            { bdr: '' }
          ]
        },
        data: { bdr }
      });
      if (updated.count > 0) {
        console.log(`Assigned BDR for ${name}: ${bdr}`);
      }
    }

    // Fix multiple BDR assignments - keep only the last assigned BDR
    console.log('\nFixing multiple BDR assignments...');
    const leads = await prisma.lead.findMany({
      where: {
        bdr: {
          contains: ','
        }
      }
    });

    for (const lead of leads) {
      const bdrs = lead.bdr?.split(',').map(b => b.trim()) || [];
      const lastBdr = bdrs[bdrs.length - 1];
      
      if (lastBdr) {
        await prisma.lead.update({
          where: { id: lead.id },
          data: { bdr: lastBdr }
        });
        console.log(`Updated ${lead.name}: ${lead.bdr} -> ${lastBdr}`);
      }
    }

    console.log('\nAll fixes completed!');

  } catch (error) {
    console.error('Error fixing BDR and companies:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixBdrAndCompanies(); 