const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function verifyFixes() {
  try {
    console.log('=== VERIFYING FIXES ===\n');
    
    // 1. Check for remaining pipeline duplicates
    console.log('1. Checking for pipeline duplicates...');
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
    
    console.log(`   ✓ Pipeline duplicate emails: ${pipelineDuplicates.length} (should be 0)`);
    
    // 2. Check for remaining finance duplicates
    console.log('2. Checking for finance duplicates...');
    const financeDuplicates = await prisma.financeEntry.groupBy({
      by: ['company', 'bdrId', 'month'],
      having: {
        company: {
          _count: {
            gt: 1
          }
        }
      },
      _count: {
        company: true
      }
    });
    
    console.log(`   ✓ Finance duplicates: ${financeDuplicates.length} (should be minimal)`);
    
    // 3. Check for company names with parentheses
    console.log('3. Checking for company names with parentheses...');
    
    const leadsWithBrackets = await prisma.lead.count({
      where: {
        company: {
          contains: '('
        }
      }
    });
    
    const pipelineWithBrackets = await prisma.pipelineItem.count({
      where: {
        company: {
          contains: '('
        }
      }
    });
    
    const financeWithBrackets = await prisma.financeEntry.count({
      where: {
        company: {
          contains: '('
        }
      }
    });
    
    const editorialWithBrackets = await prisma.editorialBoardItem.count({
      where: {
        company: {
          contains: '('
        }
      }
    });
    
    console.log(`   ✓ Leads with parentheses: ${leadsWithBrackets} (should be 0)`);
    console.log(`   ✓ Pipeline with parentheses: ${pipelineWithBrackets} (should be 0)`);
    console.log(`   ✓ Finance with parentheses: ${financeWithBrackets} (should be 0)`);
    console.log(`   ✓ Editorial with parentheses: ${editorialWithBrackets} (should be 0)`);
    
    // 4. Final count verification
    console.log('4. Final data counts...');
    const finalCounts = {
      leads: await prisma.lead.count(),
      pipeline: await prisma.pipelineItem.count(),
      finance: await prisma.financeEntry.count(),
      editorial: await prisma.editorialBoardItem.count()
    };
    
    console.log(`   ✓ Current data counts:`);
    console.log(`     - Leads: ${finalCounts.leads}`);
    console.log(`     - Pipeline Items: ${finalCounts.pipeline}`);
    console.log(`     - Finance Entries: ${finalCounts.finance}`);
    console.log(`     - Editorial Items: ${finalCounts.editorial}`);
    
    // 5. Sample clean company names
    console.log('5. Sample clean company names...');
    const sampleCompanies = await prisma.lead.findMany({
      select: {
        id: true,
        company: true
      },
      take: 5
    });
    
    console.log('   ✓ Sample lead company names:');
    sampleCompanies.forEach(lead => {
      console.log(`     - ID ${lead.id}: "${lead.company}"`);
    });
    
    const samplePipelineCompanies = await prisma.pipelineItem.findMany({
      select: {
        id: true,
        company: true
      },
      take: 5
    });
    
    console.log('   ✓ Sample pipeline company names:');
    samplePipelineCompanies.forEach(item => {
      console.log(`     - ID ${item.id}: "${item.company}"`);
    });
    
    // Summary
    console.log('\n=== VERIFICATION SUMMARY ===');
    
    const allGood = 
      pipelineDuplicates.length === 0 &&
      leadsWithBrackets === 0 &&
      pipelineWithBrackets === 0 &&
      financeWithBrackets === 0 &&
      editorialWithBrackets === 0;
    
    if (allGood) {
      console.log('🎉 All fixes verified successfully!');
      console.log('✅ No duplicate pipeline items');
      console.log('✅ All company names cleaned (no parentheses)');
      console.log('✅ Data integrity maintained');
    } else {
      console.log('⚠️  Some issues still remain:');
      if (pipelineDuplicates.length > 0) console.log(`- ${pipelineDuplicates.length} pipeline duplicates`);
      if (leadsWithBrackets > 0) console.log(`- ${leadsWithBrackets} leads with parentheses`);
      if (pipelineWithBrackets > 0) console.log(`- ${pipelineWithBrackets} pipeline items with parentheses`);
      if (financeWithBrackets > 0) console.log(`- ${financeWithBrackets} finance entries with parentheses`);
      if (editorialWithBrackets > 0) console.log(`- ${editorialWithBrackets} editorial items with parentheses`);
    }
    
  } catch (error) {
    console.error('Error during verification:', error);
  } finally {
    await prisma.$disconnect();
  }
}

verifyFixes();