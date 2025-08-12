import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testPipelineApi() {
  try {
    console.log('Testing pipeline API logic...');
    
    // Simulate the API logic for admin user
    const where = {
      parentId: null // Only top-level items
    };
    
    console.log('📋 WHERE clause:', JSON.stringify(where, null, 2));
    
    // Get total count
    const total = await prisma.pipelineItem.count({ where });
    console.log(`📊 Total pipeline items: ${total}`);
    
    // Get sample items
    const items = await prisma.pipelineItem.findMany({
      where,
      take: 10,
      orderBy: { lastUpdated: 'desc' },
      select: {
        id: true,
        name: true,
        bdr: true,
        category: true,
        status: true,
        company: true,
        lastUpdated: true
      }
    });
    
    console.log('\n📋 Sample pipeline items:');
    items.forEach((item, index) => {
      console.log(`${index + 1}. ${item.name} (${item.company || 'No company'}) - BDR: ${item.bdr} - ${item.category}/${item.status}`);
    });
    
    // Test filtering by BDR
    const danReevesItems = await prisma.pipelineItem.findMany({
      where: {
        ...where,
        bdr: 'Dan Reeves'
      },
      take: 5,
      select: {
        id: true,
        name: true,
        bdr: true,
        category: true,
        status: true
      }
    });
    
    console.log(`\n📋 Dan Reeves pipeline items (${danReevesItems.length} found):`);
    danReevesItems.forEach((item, index) => {
      console.log(`${index + 1}. ${item.name} - ${item.category}/${item.status}`);
    });
    
  } catch (error) {
    console.error('❌ Error testing pipeline API:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testPipelineApi();
