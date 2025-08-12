const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function fixDataIssues() {
  try {
    console.log('=== FIXING DATA ISSUES ===\n');
    
    // Step 1: Remove duplicate pipeline items
    console.log('Step 1: Removing duplicate pipeline items...');
    
    // Get all duplicate emails in pipeline
    const duplicateEmails = await prisma.pipelineItem.groupBy({
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
    
    console.log(`Found ${duplicateEmails.length} emails with duplicates in pipeline`);
    
    let totalDeleted = 0;
    
    // For each duplicate email, keep only the oldest one
    for (const duplicate of duplicateEmails) {
      const items = await prisma.pipelineItem.findMany({
        where: {
          email: duplicate.email
        },
        orderBy: {
          addedDate: 'asc'
        }
      });
      
      // Keep the first (oldest) item, delete the rest
      const itemsToDelete = items.slice(1);
      
      if (itemsToDelete.length > 0) {
        console.log(`Deleting ${itemsToDelete.length} duplicate entries for ${duplicate.email}`);
        
        // Delete activity logs for the items to be deleted
        await prisma.activityLog.deleteMany({
          where: {
            pipelineItemId: {
              in: itemsToDelete.map(item => item.id)
            }
          }
        });
        
        // Delete editorial board items for the items to be deleted
        await prisma.editorialBoardItem.deleteMany({
          where: {
            pipelineItemId: {
              in: itemsToDelete.map(item => item.id)
            }
          }
        });
        
        // Delete the duplicate pipeline items
        const deleteResult = await prisma.pipelineItem.deleteMany({
          where: {
            id: {
              in: itemsToDelete.map(item => item.id)
            }
          }
        });
        
        totalDeleted += deleteResult.count;
      }
    }
    
    console.log(`Total duplicate pipeline items deleted: ${totalDeleted}`);
    
    // Step 2: Clean up company names - remove parentheses and industry suffixes
    console.log('\nStep 2: Cleaning up company names...');
    
    // Function to clean company name
    function cleanCompanyName(companyName) {
      if (!companyName) return companyName;
      
      // Remove everything from the first opening parenthesis onwards
      const cleanName = companyName.replace(/\s*\([^)]*\).*$/, '').trim();
      return cleanName;
    }
    
    // Update leads
    const leadsToUpdate = await prisma.lead.findMany({
      where: {
        company: {
          contains: '('
        }
      }
    });
    
    console.log(`Updating ${leadsToUpdate.length} lead company names...`);
    
    for (const lead of leadsToUpdate) {
      const cleanName = cleanCompanyName(lead.company);
      if (cleanName !== lead.company) {
        await prisma.lead.update({
          where: { id: lead.id },
          data: { company: cleanName }
        });
      }
    }
    
    // Update pipeline items
    const pipelineToUpdate = await prisma.pipelineItem.findMany({
      where: {
        company: {
          contains: '('
        }
      }
    });
    
    console.log(`Updating ${pipelineToUpdate.length} pipeline company names...`);
    
    for (const item of pipelineToUpdate) {
      const cleanName = cleanCompanyName(item.company);
      if (cleanName !== item.company) {
        await prisma.pipelineItem.update({
          where: { id: item.id },
          data: { company: cleanName }
        });
      }
    }
    
    // Update finance entries
    const financeToUpdate = await prisma.financeEntry.findMany({
      where: {
        company: {
          contains: '('
        }
      }
    });
    
    console.log(`Updating ${financeToUpdate.length} finance company names...`);
    
    for (const entry of financeToUpdate) {
      const cleanName = cleanCompanyName(entry.company);
      if (cleanName !== entry.company) {
        await prisma.financeEntry.update({
          where: { id: entry.id },
          data: { company: cleanName }
        });
      }
    }
    
    // Update editorial board items
    const editorialToUpdate = await prisma.editorialBoardItem.findMany({
      where: {
        company: {
          contains: '('
        }
      }
    });
    
    console.log(`Updating ${editorialToUpdate.length} editorial board company names...`);
    
    for (const item of editorialToUpdate) {
      const cleanName = cleanCompanyName(item.company);
      if (cleanName !== item.company) {
        await prisma.editorialBoardItem.update({
          where: { id: item.id },
          data: { company: cleanName }
        });
      }
    }
    
    // Step 3: Check for finance duplicates (though there shouldn't be many based on our investigation)
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
    console.log(`\nItems deleted:`);
    console.log(`- Pipeline duplicates: ${totalDeleted}`);
    console.log(`- Finance duplicates: ${financeDeleted}`);
    
    // Verify no more duplicates
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

fixDataIssues();