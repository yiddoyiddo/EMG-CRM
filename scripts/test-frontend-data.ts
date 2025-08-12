import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testFrontendData() {
  try {
    console.log('🧪 Testing frontend data flow...');

    // Simulate what the API would return
    const pipelineItems = await prisma.pipelineItem.findMany({
      include: {
        bdr: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      take: 5
    });

    console.log('\n📊 API Response (first 5 items):');
    pipelineItems.forEach((item, index) => {
      console.log(`\n${index + 1}. ${item.name}`);
      console.log(`   - BDR Name: ${item.bdr?.name || 'None'}`);
      console.log(`   - Category: ${item.category}`);
      console.log(`   - Status: ${item.status}`);
    });

    // Test the filtering logic that the frontend uses
    const testBdrs = ['Jennifer Davies', 'Mark Cawston', 'Rupert Kay', 'Verity Kay', 'Naeem Patel'];
    
    testBdrs.forEach(bdrName => {
      const filteredItems = pipelineItems.filter(item => item.bdr?.name === bdrName);
      console.log(`\n🔍 Filtering for "${bdrName}": ${filteredItems.length} items`);
      filteredItems.forEach(item => {
        console.log(`   - ${item.name} (${item.category}/${item.status})`);
      });
    });

    // Test with empty BDR
    const emptyBdrItems = pipelineItems.filter(item => !item.bdr?.name);
    console.log(`\n🔍 Items with no BDR: ${emptyBdrItems.length}`);

    // Test with admin (should see all)
    console.log(`\n🔍 Admin view (all items): ${pipelineItems.length} items`);

  } catch (error) {
    console.error('❌ Error testing frontend data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testFrontendData();
