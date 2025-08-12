import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkActivityLogs() {
  try {
    console.log('🔍 Checking extracted activity logs and dates...\n');
    
    // Get some pipeline items with activity logs
    const itemsWithLogs = await prisma.pipelineItem.findMany({
      where: {
        activityLogs: { some: {} }
      },
      include: { activityLogs: true },
      take: 10
    });
    
    console.log(`Found ${itemsWithLogs.length} items with activity logs:\n`);
    
    itemsWithLogs.forEach(item => {
      console.log(`📋 ${item.name} @ ${item.company} (${item.category})`);
      console.log(`   Call Date: ${item.callDate?.toLocaleDateString() || 'Not set'}`);
      console.log(`   Notes: ${item.notes?.substring(0, 150) || 'No notes'}...`);
      
      item.activityLogs.forEach(log => {
        console.log(`   📝 ${log.activityType}: ${log.description}`);
        console.log(`      Scheduled: ${log.scheduledDate?.toLocaleDateString() || 'Not scheduled'}`);
        console.log(`      Created: ${log.timestamp.toLocaleDateString()}`);
      });
      console.log('');
    });
    
    // Check for different types of activities
    console.log('\n📊 Activity Log Summary:');
    const activityTypes = await prisma.activityLog.groupBy({
      by: ['activityType'],
      _count: { activityType: true }
    });
    
    activityTypes.forEach(type => {
      console.log(`   ${type.activityType}: ${type._count.activityType}`);
    });
    
    // Check call booking dates
    const callBookedItems = await prisma.pipelineItem.findMany({
      where: { 
        callDate: { not: null },
        category: 'Calls'
      },
      select: { name: true, company: true, callDate: true },
      take: 5
    });
    
    console.log('\n📞 Sample Call Bookings (Date field used for call booking dates):');
    callBookedItems.forEach(item => {
      console.log(`   ${item.name} @ ${item.company}: ${item.callDate?.toLocaleDateString()}`);
    });
    
    // Check sold/agreement leads
    const soldLeads = await prisma.pipelineItem.findMany({
      where: { category: 'Agreement' },
      select: { name: true, company: true, category: true, status: true },
      take: 5
    });
    
    console.log('\n🏆 Sample Sold/Agreement Leads:');
    soldLeads.forEach(lead => {
      console.log(`   ${lead.name} @ ${lead.company}: ${lead.category} (${lead.status})`);
    });
    
    await prisma.$disconnect();
  } catch (error) {
    console.error('Error:', error);
    await prisma.$disconnect();
  }
}

checkActivityLogs(); 