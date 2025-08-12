import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkAllStatuses() {
  try {
    console.log('🔍 Checking all statuses in the database...\n');

    // Check leads statuses
    const leadStatuses = await prisma.lead.groupBy({
      by: ['status'],
      _count: {
        status: true
      }
    });

    console.log('📋 Lead Statuses:');
    console.log('='.repeat(30));
    leadStatuses.forEach(status => {
      console.log(`${status.status}: ${status._count.status} leads`);
    });

    // Check pipeline statuses
    const pipelineStatuses = await prisma.pipelineItem.groupBy({
      by: ['status'],
      _count: {
        status: true
      }
    });

    console.log('\n📊 Pipeline Statuses:');
    console.log('='.repeat(30));
    pipelineStatuses.forEach(status => {
      console.log(`${status.status}: ${status._count.status} items`);
    });

    // Check pipeline categories
    const pipelineCategories = await prisma.pipelineItem.groupBy({
      by: ['category'],
      _count: {
        category: true
      }
    });

    console.log('\n📁 Pipeline Categories:');
    console.log('='.repeat(30));
    pipelineCategories.forEach(category => {
      console.log(`${category.category}: ${category._count.category} items`);
    });

    // Look for sold deals in pipeline
    const soldPipelineItems = await prisma.pipelineItem.findMany({
      where: {
        OR: [
          { status: 'Sold' },
          { status: 'sold' },
          { status: 'SOLD' },
          { category: 'Sold' },
          { category: 'sold' },
          { category: 'SOLD' }
        ]
      },
      include: {
        activityLogs: {
          orderBy: { timestamp: 'asc' }
        }
      }
    });

    console.log(`\n💰 Found ${soldPipelineItems.length} pipeline items that might be sold deals:`);
    console.log('='.repeat(50));
    
    for (const item of soldPipelineItems) {
      console.log(`\n💰 Pipeline Item: ${item.name} (ID: ${item.id})`);
      console.log(`   Company: ${item.company || 'N/A'}`);
      console.log(`   BDR: ${item.bdr || 'N/A'}`);
      console.log(`   Status: ${item.status}`);
      console.log(`   Category: ${item.category}`);
      console.log(`   Value: ${item.value || 'N/A'}`);
      console.log(`   Notes: ${item.notes ? item.notes.substring(0, 100) + '...' : 'No notes'}`);
      
      if (item.activityLogs.length === 0) {
        console.log(`   ❌ NO ACTIVITY LOGS FOUND`);
      } else {
        console.log(`   ✅ Activity logs: ${item.activityLogs.length}`);
        item.activityLogs.forEach((log, index) => {
          console.log(`      ${index + 1}. [${log.timestamp.toLocaleDateString()}] ${log.activityType}: ${log.description}`);
        });
      }
    }

    // Look for list out items in pipeline
    const listOutPipelineItems = await prisma.pipelineItem.findMany({
      where: {
        OR: [
          { status: 'List Out' },
          { status: 'list out' },
          { status: 'LIST OUT' },
          { category: 'List Out' },
          { category: 'list out' },
          { category: 'LIST OUT' }
        ]
      },
      include: {
        activityLogs: {
          orderBy: { timestamp: 'asc' }
        }
      }
    });

    console.log(`\n📋 Found ${listOutPipelineItems.length} pipeline items that might be list out:`);
    console.log('='.repeat(50));
    
    for (const item of listOutPipelineItems) {
      console.log(`\n📋 Pipeline Item: ${item.name} (ID: ${item.id})`);
      console.log(`   Company: ${item.company || 'N/A'}`);
      console.log(`   BDR: ${item.bdr || 'N/A'}`);
      console.log(`   Status: ${item.status}`);
      console.log(`   Category: ${item.category}`);
      console.log(`   Notes: ${item.notes ? item.notes.substring(0, 100) + '...' : 'No notes'}`);
      
      if (item.activityLogs.length === 0) {
        console.log(`   ❌ NO ACTIVITY LOGS FOUND`);
      } else {
        console.log(`   ✅ Activity logs: ${item.activityLogs.length}`);
        item.activityLogs.forEach((log, index) => {
          console.log(`      ${index + 1}. [${log.timestamp.toLocaleDateString()}] ${log.activityType}: ${log.description}`);
        });
      }
    }

  } catch (error) {
    console.error('Error checking statuses:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkAllStatuses()
  .catch(console.error); 