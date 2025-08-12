import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function debugPipelineData() {
  try {
    console.log('🔍 Debugging pipeline data...');

    // Get all pipeline items with their BDR information
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
      take: 10
    });

    console.log(`\n📊 Found ${pipelineItems.length} pipeline items (showing first 10):`);
    
    pipelineItems.forEach((item, index) => {
      console.log(`\n${index + 1}. ${item.name} (${item.company})`);
      console.log(`   - Category: ${item.category}`);
      console.log(`   - Status: ${item.status}`);
      console.log(`   - BDR ID: ${item.bdrId}`);
      console.log(`   - BDR Name: ${item.bdr?.name || 'None'}`);
      console.log(`   - BDR Email: ${item.bdr?.email || 'None'}`);
    });

    // Get all users
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true
      }
    });

    console.log(`\n👥 Users in system:`);
    users.forEach(user => {
      console.log(`   - ${user.name} (${user.email}) - Role: ${user.role} - ID: ${user.id}`);
    });

    // Check for items without BDR
    const allItems = await prisma.pipelineItem.findMany({
      include: {
        bdr: {
          select: {
            name: true,
            email: true
          }
        }
      }
    });

    const itemsWithoutBdr = allItems.filter(item => !item.bdrId || item.bdrId === '');

    console.log(`\n⚠️  Items without BDR: ${itemsWithoutBdr.length}`);
    if (itemsWithoutBdr.length > 0) {
      itemsWithoutBdr.slice(0, 5).forEach(item => {
        console.log(`   - ${item.name} (${item.company}) - Category: ${item.category} - Status: ${item.status}`);
      });
    }

    // Check category and status distribution
    const categoryStats = await prisma.pipelineItem.groupBy({
      by: ['category'],
      _count: { category: true }
    });

    console.log(`\n📈 Category distribution:`);
    categoryStats.forEach(stat => {
      console.log(`   - ${stat.category}: ${stat._count.category}`);
    });

    const statusStats = await prisma.pipelineItem.groupBy({
      by: ['status'],
      _count: { status: true }
    });

    console.log(`\n📊 Status distribution:`);
    statusStats.forEach(stat => {
      console.log(`   - ${stat.status}: ${stat._count.status}`);
    });

  } catch (error) {
    console.error('❌ Error debugging pipeline data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugPipelineData();
