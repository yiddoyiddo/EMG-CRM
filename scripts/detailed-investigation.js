const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function detailedInvestigation() {
  try {
    console.log('=== DETAILED INVESTIGATION ===\n');
    
    // Look at actual duplicate pipeline items
    console.log('=== PIPELINE DUPLICATES ANALYSIS ===');
    
    const duplicateEmails = await prisma.pipelineItem.findMany({
      where: {
        email: 'Robin39@gmail.com'
      },
      select: {
        id: true,
        name: true,
        company: true,
        email: true,
        status: true,
        category: true,
        addedDate: true,
        bdrId: true
      },
      orderBy: {
        addedDate: 'asc'
      }
    });
    
    console.log(`Found ${duplicateEmails.length} pipeline items with email Robin39@gmail.com:`);
    duplicateEmails.forEach((item, index) => {
      console.log(`${index + 1}. ID: ${item.id}, Name: "${item.name}", Company: "${item.company}", Status: "${item.status}", Category: "${item.category}", Added: ${item.addedDate.toISOString().split('T')[0]}, BDR: ${item.bdrId}`);
    });
    
    // Check for patterns in company names (even without brackets)
    console.log('\n=== COMPANY NAME PATTERNS ===');
    
    const sampleLeads = await prisma.lead.findMany({
      select: {
        id: true,
        company: true
      },
      take: 20
    });
    
    console.log('Sample Lead company names:');
    sampleLeads.forEach(lead => {
      console.log(`  "${lead.company}"`);
    });
    
    const samplePipeline = await prisma.pipelineItem.findMany({
      select: {
        id: true,
        company: true,
        status: true,
        name: true
      },
      take: 20
    });
    
    console.log('\nSample Pipeline company names and statuses:');
    samplePipeline.forEach(item => {
      console.log(`  Company: "${item.company}", Status: "${item.status}", Name: "${item.name}"`);
    });
    
    // Check for emails that exist in both leads and pipeline
    console.log('\n=== CROSS-TABLE DUPLICATES ===');
    
    const leadEmails = await prisma.lead.findMany({
      where: {
        email: {
          not: null
        }
      },
      select: {
        email: true
      }
    });
    
    const leadEmailSet = new Set(leadEmails.map(l => l.email));
    
    const pipelineEmailsInLeads = await prisma.pipelineItem.findMany({
      where: {
        email: {
          in: Array.from(leadEmailSet)
        }
      },
      select: {
        email: true,
        id: true,
        name: true,
        company: true
      }
    });
    
    console.log(`Pipeline items with emails that also exist in leads: ${pipelineEmailsInLeads.length}`);
    
    // Check all unique statuses in pipeline to understand the simple board issue
    console.log('\n=== PIPELINE STATUS ANALYSIS ===');
    
    const statusGroups = await prisma.pipelineItem.groupBy({
      by: ['status'],
      _count: {
        status: true
      },
      orderBy: {
        _count: {
          status: 'desc'
        }
      }
    });
    
    console.log('Pipeline statuses and counts:');
    statusGroups.forEach(group => {
      console.log(`  "${group.status}": ${group._count.status} items`);
    });
    
  } catch (error) {
    console.error('Error in detailed investigation:', error);
  } finally {
    await prisma.$disconnect();
  }
}

detailedInvestigation();