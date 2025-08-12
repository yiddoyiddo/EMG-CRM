const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function finalCleanup() {
  try {
    console.log('=== FINAL CLEANUP OF COMPANY NAMES ===\n');
    
    // Function to clean company name
    function cleanCompanyName(companyName) {
      if (!companyName) return companyName;
      
      // Remove everything from the first opening parenthesis onwards
      const cleanName = companyName.replace(/\s*\([^)]*\).*$/, '').trim();
      return cleanName;
    }
    
    // Clean ALL leads with parentheses - using transaction for efficiency
    console.log('1. Cleaning ALL leads with parentheses...');
    
    const leadsWithParens = await prisma.lead.findMany({
      where: {
        company: {
          contains: '('
        }
      },
      select: {
        id: true,
        company: true
      }
    });
    
    console.log(`Found ${leadsWithParens.length} leads to clean`);
    
    // Process in batches using transactions
    const BATCH_SIZE = 50;
    let processed = 0;
    
    for (let i = 0; i < leadsWithParens.length; i += BATCH_SIZE) {
      const batch = leadsWithParens.slice(i, i + BATCH_SIZE);
      
      await prisma.$transaction(async (tx) => {
        for (const lead of batch) {
          const cleanName = cleanCompanyName(lead.company);
          if (cleanName !== lead.company) {
            await tx.lead.update({
              where: { id: lead.id },
              data: { company: cleanName }
            });
            processed++;
          }
        }
      });
      
      console.log(`   Processed ${Math.min(i + BATCH_SIZE, leadsWithParens.length)} / ${leadsWithParens.length} leads`);
    }
    
    console.log(`Cleaned ${processed} lead company names`);
    
    // Clean ALL pipeline items with parentheses
    console.log('\n2. Cleaning ALL pipeline items with parentheses...');
    
    const pipelineWithParens = await prisma.pipelineItem.findMany({
      where: {
        company: {
          contains: '('
        }
      },
      select: {
        id: true,
        company: true
      }
    });
    
    console.log(`Found ${pipelineWithParens.length} pipeline items to clean`);
    
    let pipelineProcessed = 0;
    
    for (let i = 0; i < pipelineWithParens.length; i += BATCH_SIZE) {
      const batch = pipelineWithParens.slice(i, i + BATCH_SIZE);
      
      await prisma.$transaction(async (tx) => {
        for (const item of batch) {
          const cleanName = cleanCompanyName(item.company);
          if (cleanName !== item.company) {
            await tx.pipelineItem.update({
              where: { id: item.id },
              data: { company: cleanName }
            });
            pipelineProcessed++;
          }
        }
      });
      
      console.log(`   Processed ${Math.min(i + BATCH_SIZE, pipelineWithParens.length)} / ${pipelineWithParens.length} pipeline items`);
    }
    
    console.log(`Cleaned ${pipelineProcessed} pipeline company names`);
    
    // Verify the cleanup
    console.log('\n3. Verifying final cleanup...');
    
    const remainingLeads = await prisma.lead.count({
      where: {
        company: {
          contains: '('
        }
      }
    });
    
    const remainingPipeline = await prisma.pipelineItem.count({
      where: {
        company: {
          contains: '('
        }
      }
    });
    
    console.log(`   Remaining leads with parentheses: ${remainingLeads}`);
    console.log(`   Remaining pipeline items with parentheses: ${remainingPipeline}`);
    
    // Show final samples
    const finalSamples = await prisma.lead.findMany({
      select: {
        company: true
      },
      take: 10
    });
    
    console.log('\nFinal sample company names:');
    finalSamples.forEach((lead, index) => {
      console.log(`   ${index + 1}. "${lead.company}"`);
    });
    
    if (remainingLeads === 0 && remainingPipeline === 0) {
      console.log('\n🎉 Final cleanup completed successfully!');
    } else {
      console.log('\n⚠️  Some records still have parentheses');
    }
    
  } catch (error) {
    console.error('Error during final cleanup:', error);
  } finally {
    await prisma.$disconnect();
  }
}

finalCleanup();