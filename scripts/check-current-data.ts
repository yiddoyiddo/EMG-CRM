import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkCurrentData() {
  try {
    console.log('📊 Current Database State');
    console.log('=' .repeat(40));
    
    const leadCount = await prisma.lead.count();
    const pipelineCount = await prisma.pipelineItem.count();
    const activityCount = await prisma.activityLog.count();
    
    console.log(`Leads: ${leadCount}`);
    console.log(`Pipeline Items: ${pipelineCount}`);
    console.log(`Activity Logs: ${activityCount}`);
    
    // Check for sold/agreement leads
    const soldLeads = await prisma.pipelineItem.findMany({
      where: {
        OR: [
          { category: { contains: 'Agreement' } },
          { category: { contains: 'Closed' } },
          { status: { contains: 'Won' } }
        ]
      },
      select: { id: true, name: true, category: true, status: true, company: true }
    });
    
    console.log(`\n🏆 Sold/Agreement leads: ${soldLeads.length}`);
    soldLeads.forEach(p => console.log(`  ${p.id}: ${p.name} @ ${p.company} - ${p.category} (${p.status})`));
    
    // Check for sublists
    const sublists = await prisma.pipelineItem.findMany({
      where: { isSublist: true },
      select: { id: true, sublistName: true, parentId: true }
    });
    
    console.log(`\n📋 Sublists: ${sublists.length}`);
    sublists.forEach(s => console.log(`  ${s.id}: ${s.sublistName} (parent: ${s.parentId})`));
    
    // Check categories
    const categories = await prisma.pipelineItem.groupBy({
      by: ['category'],
      _count: { category: true }
    });
    
    console.log(`\n📈 Categories:`);
    categories.forEach(c => console.log(`  ${c.category}: ${c._count.category}`));
    
    await prisma.$disconnect();
  } catch (error) {
    console.error('Error:', error);
    await prisma.$disconnect();
  }
}

checkCurrentData(); 