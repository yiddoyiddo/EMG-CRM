import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkBdrAndCompanies() {
  try {
    console.log('Checking BDR assignments and company names...\n');

    // Get all leads
    const leads = await prisma.lead.findMany({
      orderBy: { name: 'asc' }
    });

    // Check for multiple BDRs
    console.log('Leads with multiple BDRs:');
    leads.forEach(lead => {
      if (lead.bdr && lead.bdr.includes(',')) {
        console.log(`- ${lead.name}: BDRs = ${lead.bdr}`);
      }
    });

    // Check for missing BDRs
    console.log('\nLeads with no BDR assigned:');
    leads.forEach(lead => {
      if (!lead.bdr || lead.bdr.trim() === '') {
        console.log(`- ${lead.name} (Company: ${lead.company || 'N/A'})`);
      }
    });

    // Check for encoding issues in company names
    console.log('\nCompany names with potential encoding issues:');
    leads.forEach(lead => {
      if (lead.company && (
        lead.company.includes('?') ||
        lead.company.includes('�') ||
        lead.company.includes('3 Cora') ||
        lead.company.includes('Linhas A') ||
        lead.company.includes('Guti') ||
        lead.company.includes('Gonz')
      )) {
        console.log(`- ${lead.name}: Company = "${lead.company}"`);
      }
    });

  } catch (error) {
    console.error('Error checking BDR and companies:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkBdrAndCompanies(); 