const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function investigateDataIssues() {
  try {
    console.log('=== DATA INVESTIGATION ===\n');
    
    // Count totals
    const leadCount = await prisma.lead.count();
    const pipelineCount = await prisma.pipelineItem.count();
    const financeCount = await prisma.financeEntry.count();
    
    console.log(`Total Leads: ${leadCount}`);
    console.log(`Total Pipeline Items: ${pipelineCount}`);
    console.log(`Total Finance Entries: ${financeCount}\n`);
    
    // Check for duplicates by email in leads
    console.log('=== DUPLICATE ANALYSIS ===');
    
    // Leads with duplicate emails
    const leadDuplicates = await prisma.lead.groupBy({
      by: ['email'],
      having: {
        email: {
          _count: {
            gt: 1
          }
        }
      },
      _count: {
        email: true
      },
      where: {
        email: {
          not: null
        }
      }
    });
    
    console.log(`Leads with duplicate emails: ${leadDuplicates.length}`);
    if (leadDuplicates.length > 0) {
      console.log('Sample duplicate emails:', leadDuplicates.slice(0, 5));
    }
    
    // Pipeline items with duplicate emails
    const pipelineDuplicates = await prisma.pipelineItem.groupBy({
      by: ['email'],
      having: {
        email: {
          _count: {
            gt: 1
          }
        }
      },
      _count: {
        email: true
      },
      where: {
        email: {
          not: null
        }
      }
    });
    
    console.log(`Pipeline items with duplicate emails: ${pipelineDuplicates.length}`);
    if (pipelineDuplicates.length > 0) {
      console.log('Sample pipeline duplicate emails:', pipelineDuplicates.slice(0, 5));
    }
    
    // Check for company names with brackets
    console.log('\n=== COMPANY NAME ANALYSIS ===');
    
    const leadsWithBrackets = await prisma.lead.findMany({
      where: {
        company: {
          contains: '['
        }
      },
      select: {
        id: true,
        company: true
      },
      take: 10
    });
    
    console.log(`Leads with brackets in company names: ${leadsWithBrackets.length}`);
    if (leadsWithBrackets.length > 0) {
      console.log('Sample company names with brackets:');
      leadsWithBrackets.forEach(lead => {
        console.log(`  ID: ${lead.id}, Company: "${lead.company}"`);
      });
    }
    
    const pipelineWithBrackets = await prisma.pipelineItem.findMany({
      where: {
        company: {
          contains: '['
        }
      },
      select: {
        id: true,
        company: true
      },
      take: 10
    });
    
    console.log(`\nPipeline items with brackets in company names: ${pipelineWithBrackets.length}`);
    if (pipelineWithBrackets.length > 0) {
      console.log('Sample pipeline company names with brackets:');
      pipelineWithBrackets.forEach(item => {
        console.log(`  ID: ${item.id}, Company: "${item.company}"`);
      });
    }
    
    const financeWithBrackets = await prisma.financeEntry.findMany({
      where: {
        company: {
          contains: '['
        }
      },
      select: {
        id: true,
        company: true
      },
      take: 10
    });
    
    console.log(`\nFinance entries with brackets in company names: ${financeWithBrackets.length}`);
    if (financeWithBrackets.length > 0) {
      console.log('Sample finance company names with brackets:');
      financeWithBrackets.forEach(entry => {
        console.log(`  ID: ${entry.id}, Company: "${entry.company}"`);
      });
    }
    
  } catch (error) {
    console.error('Error investigating data issues:', error);
  } finally {
    await prisma.$disconnect();
  }
}

investigateDataIssues();