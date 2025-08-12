const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function fixDataIssuesBatch() {
  try {
    console.log('=== FIXING DATA ISSUES IN BATCHES ===\n');
    
    // Function to clean company name
    function cleanCompanyName(companyName) {
      if (!companyName) return companyName;
      
      // Remove everything from the first opening parenthesis onwards
      const cleanName = companyName.replace(/\s*\([^)]*\).*$/, '').trim();
      return cleanName;
    }
    
    // Step 2: Clean up company names - remove parentheses and industry suffixes
    console.log('Step 2: Cleaning up company names in batches...');
    
    // Update leads in batches
    const BATCH_SIZE = 100;
    let offset = 0;
    let leadsUpdated = 0;
    
    while (true) {
      const leadsToUpdate = await prisma.lead.findMany({
        where: {
          company: {
            contains: '('
          }
        },
        take: BATCH_SIZE,
        skip: offset
      });
      
      if (leadsToUpdate.length === 0) break;
      
      console.log(`Processing leads batch ${offset / BATCH_SIZE + 1} (${leadsToUpdate.length} items)...`);
      
      for (const lead of leadsToUpdate) {
        const cleanName = cleanCompanyName(lead.company);
        if (cleanName !== lead.company) {
          await prisma.lead.update({
            where: { id: lead.id },
            data: { company: cleanName }
          });
          leadsUpdated++;
        }
      }
      
      offset += BATCH_SIZE;
    }
    
    console.log(`Updated ${leadsUpdated} lead company names`);
    
    // Update pipeline items in batches
    offset = 0;
    let pipelineUpdated = 0;
    
    while (true) {
      const pipelineToUpdate = await prisma.pipelineItem.findMany({
        where: {
          company: {
            contains: '('
          }
        },
        take: BATCH_SIZE,
        skip: offset
      });
      
      if (pipelineToUpdate.length === 0) break;
      
      console.log(`Processing pipeline batch ${offset / BATCH_SIZE + 1} (${pipelineToUpdate.length} items)...`);
      
      for (const item of pipelineToUpdate) {
        const cleanName = cleanCompanyName(item.company);
        if (cleanName !== item.company) {
          await prisma.pipelineItem.update({
            where: { id: item.id },
            data: { company: cleanName }
          });
          pipelineUpdated++;
        }
      }
      
      offset += BATCH_SIZE;
    }
    
    console.log(`Updated ${pipelineUpdated} pipeline company names`);
    
    // Update finance entries in batches
    offset = 0;
    let financeUpdated = 0;
    
    while (true) {
      const financeToUpdate = await prisma.financeEntry.findMany({
        where: {
          company: {
            contains: '('
          }
        },
        take: BATCH_SIZE,
        skip: offset
      });
      
      if (financeToUpdate.length === 0) break;
      
      console.log(`Processing finance batch ${offset / BATCH_SIZE + 1} (${financeToUpdate.length} items)...`);
      
      for (const entry of financeToUpdate) {
        const cleanName = cleanCompanyName(entry.company);
        if (cleanName !== entry.company) {
          await prisma.financeEntry.update({
            where: { id: entry.id },
            data: { company: cleanName }
          });
          financeUpdated++;
        }
      }
      
      offset += BATCH_SIZE;
    }
    
    console.log(`Updated ${financeUpdated} finance company names`);
    
    // Update editorial board items in batches
    offset = 0;
    let editorialUpdated = 0;
    
    while (true) {
      const editorialToUpdate = await prisma.editorialBoardItem.findMany({
        where: {
          company: {
            contains: '('
          }
        },
        take: BATCH_SIZE,
        skip: offset
      });
      
      if (editorialToUpdate.length === 0) break;
      
      console.log(`Processing editorial batch ${offset / BATCH_SIZE + 1} (${editorialToUpdate.length} items)...`);
      
      for (const item of editorialToUpdate) {
        const cleanName = cleanCompanyName(item.company);
        if (cleanName !== item.company) {
          await prisma.editorialBoardItem.update({
            where: { id: item.id },
            data: { company: cleanName }
          });
          editorialUpdated++;
        }
      }
      
      offset += BATCH_SIZE;
    }
    
    console.log(`Updated ${editorialUpdated} editorial board company names`);
    
    // Step 3: Check for remaining finance duplicates
    console.log('\nStep 3: Checking for finance duplicates...');
    
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
    
    console.log(`Found ${financeDuplicates.length} potential finance duplicates`);
    
    // For finance duplicates, keep the most recent one
    let financeDeleted = 0;
    
    for (const duplicate of financeDuplicates) {
      const entries = await prisma.financeEntry.findMany({
        where: {
          company: duplicate.company,
          bdrId: duplicate.bdrId,
          month: duplicate.month
        },
        orderBy: {
          createdAt: 'desc'
        }
      });
      
      // Keep the first (most recent) entry, delete the rest
      const entriesToDelete = entries.slice(1);
      
      if (entriesToDelete.length > 0) {
        console.log(`Deleting ${entriesToDelete.length} duplicate finance entries for ${duplicate.company} - ${duplicate.bdrId} - ${duplicate.month}`);
        
        const deleteResult = await prisma.financeEntry.deleteMany({
          where: {
            id: {
              in: entriesToDelete.map(entry => entry.id)
            }
          }
        });
        
        financeDeleted += deleteResult.count;
      }
    }
    
    console.log(`Total duplicate finance entries deleted: ${financeDeleted}`);
    
    // Final summary
    console.log('\n=== SUMMARY ===');
    const finalLeadCount = await prisma.lead.count();
    const finalPipelineCount = await prisma.pipelineItem.count();
    const finalFinanceCount = await prisma.financeEntry.count();
    
    console.log(`Final counts:`);
    console.log(`- Leads: ${finalLeadCount}`);
    console.log(`- Pipeline Items: ${finalPipelineCount}`);
    console.log(`- Finance Entries: ${finalFinanceCount}`);
    console.log(`\nCompany names updated:`);
    console.log(`- Leads: ${leadsUpdated}`);
    console.log(`- Pipeline: ${pipelineUpdated}`);
    console.log(`- Finance: ${financeUpdated}`);
    console.log(`- Editorial: ${editorialUpdated}`);
    console.log(`- Finance duplicates deleted: ${financeDeleted}`);
    
    // Verify no more pipeline duplicates (previous script already fixed this)
    const remainingPipelineDuplicates = await prisma.pipelineItem.groupBy({
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
    
    console.log(`\nRemaining pipeline duplicates: ${remainingPipelineDuplicates.length}`);
    
    // Sample cleaned company names
    const sampleCleanedCompanies = await prisma.lead.findMany({
      select: {
        company: true
      },
      take: 10
    });
    
    console.log('\nSample cleaned company names:');
    sampleCleanedCompanies.forEach(lead => {
      console.log(`  "${lead.company}"`);
    });
    
    console.log('\n✅ Data cleanup completed successfully!');
    
  } catch (error) {
    console.error('Error fixing data issues:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

fixDataIssuesBatch();