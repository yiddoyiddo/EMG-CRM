import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verifyFixes() {
  try {
    console.log('Verifying data fixes...\n');

    // Check specific leads mentioned in the issues
    const specificLeads = [
      'Abel Sa',
      'Abhijeet Prabhune', 
      'Sébastien Page',
      'Andrea Macchia'
    ];

    for (const leadName of specificLeads) {
      const lead = await prisma.lead.findFirst({
        where: {
          name: {
            contains: leadName
          }
        }
      });

      if (lead) {
        console.log(`${lead.name}:`);
        console.log(`  - BDR: ${lead.bdr || 'null'}`);
        console.log(`  - Company: ${lead.company || 'null'}`);
        console.log(`  - Notes: ${lead.notes ? lead.notes.substring(0, 100) + '...' : 'null'}`);
        console.log('');
      } else {
        console.log(`${leadName}: Not found`);
        console.log('');
      }
    }

    // Check for leads with multiple BDRs that should be cleaned up
    const leadsWithMultipleBDRs = await prisma.lead.findMany({
      where: {
        bdr: {
          contains: ','
        }
      }
    });

    if (leadsWithMultipleBDRs.length > 0) {
      console.log('Leads with multiple BDRs (should be cleaned up):');
      leadsWithMultipleBDRs.forEach(lead => {
        console.log(`  - ${lead.name}: ${lead.bdr}`);
      });
      console.log('');
    } else {
      console.log('No leads with multiple BDRs found - all cleaned up!');
      console.log('');
    }

    // Check for encoding issues in company names
    const leadsWithEncodingIssues = await prisma.lead.findMany({
      where: {
        OR: [
          { company: { contains: '?' } },
          { company: { contains: '' } },
          { name: { contains: '?' } },
          { name: { contains: '' } }
        ]
      }
    });

    if (leadsWithEncodingIssues.length > 0) {
      console.log('Leads with potential encoding issues:');
      leadsWithEncodingIssues.forEach(lead => {
        console.log(`  - ${lead.name}: Company: ${lead.company}`);
      });
      console.log('');
    } else {
      console.log('No encoding issues found!');
      console.log('');
    }

    // Summary statistics
    const totalLeads = await prisma.lead.count();
    const leadsWithBDR = await prisma.lead.count({
      where: {
        bdr: {
          not: null
        }
      }
    });

    console.log('Summary:');
    console.log(`  - Total leads: ${totalLeads}`);
    console.log(`  - Leads with BDR assigned: ${leadsWithBDR}`);
    console.log(`  - Leads without BDR: ${totalLeads - leadsWithBDR}`);

  } catch (error) {
    console.error('Error verifying fixes:', error);
  } finally {
    await prisma.$disconnect();
  }
}

verifyFixes(); 