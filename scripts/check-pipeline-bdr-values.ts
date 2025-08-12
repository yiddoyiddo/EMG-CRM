import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkPipelineBdrValues() {
  try {
    console.log('Checking pipeline BDR values...');
    
    // Get unique BDR values from pipeline items
    const bdrValues = await prisma.pipelineItem.findMany({
      select: {
        bdr: true
      },
      distinct: ['bdr']
    });
    
    console.log('📋 Unique BDR values in pipeline:');
    bdrValues.forEach((item, index) => {
      console.log(`${index + 1}. "${item.bdr}"`);
    });
    
    // Get sample pipeline items
    const sampleItems = await prisma.pipelineItem.findMany({
      take: 5,
      select: {
        id: true,
        name: true,
        bdr: true,
        category: true,
        status: true
      }
    });
    
    console.log('\n📋 Sample pipeline items:');
    sampleItems.forEach((item, index) => {
      console.log(`${index + 1}. ${item.name} (${item.company || 'No company'}) - BDR: ${item.bdr} - ${item.category}/${item.status}`);
    });
    
    // Count items by BDR
    const bdrCounts = await prisma.pipelineItem.groupBy({
      by: ['bdr'],
      _count: {
        id: true
      }
    });
    
    console.log('\n📊 Pipeline items by BDR:');
    bdrCounts.forEach((item) => {
      console.log(`- ${item.bdr}: ${item._count.id} items`);
    });
    
  } catch (error) {
    console.error('❌ Error checking pipeline BDR values:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkPipelineBdrValues();
