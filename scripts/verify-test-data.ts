import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verifyTestData() {
  try {
    console.log('=== VERIFYING TEST DATA ===\n');
    
    // Get total counts
    const totalPipelineItems = await prisma.pipelineItem.count();
    const totalActivityLogs = await prisma.activityLog.count();
    const totalSublists = await prisma.pipelineItem.count({
      where: { isSublist: true }
    });
    const totalSubitems = await prisma.pipelineItem.count({
      where: { parentId: { not: null } }
    });
    
    console.log(`📊 TOTAL COUNTS:`);
    console.log(`- Pipeline Items: ${totalPipelineItems}`);
    console.log(`- Activity Logs: ${totalActivityLogs}`);
    console.log(`- Sublists: ${totalSublists}`);
    console.log(`- Subitems: ${totalSubitems}\n`);
    
    // Count by category
    console.log(`📈 BY CATEGORY:`);
    const categoryCounts = await prisma.pipelineItem.groupBy({
      by: ['category'],
      _count: { id: true }
    });
    
    for (const cat of categoryCounts) {
      console.log(`- ${cat.category}: ${cat._count.id} items`);
    }
    console.log();
    
    // Count by status
    console.log(`📋 BY STATUS:`);
    const statusCounts = await prisma.pipelineItem.groupBy({
      by: ['status'],
      _count: { id: true }
    });
    
    for (const status of statusCounts) {
      console.log(`- ${status.status}: ${status._count.id} items`);
    }
    console.log();
    
    // Count by BDR
    console.log(`👥 BY BDR:`);
    const bdrCounts = await prisma.pipelineItem.groupBy({
      by: ['bdr'],
      _count: { id: true }
    });
    
    for (const bdr of bdrCounts) {
      console.log(`- ${bdr.bdr}: ${bdr._count.id} items`);
    }
    console.log();
    
    // Check call dates
    console.log(`📞 CALL DATES:`);
    const callBookedCount = await prisma.pipelineItem.count({
      where: { 
        status: "Call Booked",
        callDate: { not: null }
      }
    });
    
    const callConductedCount = await prisma.pipelineItem.count({
      where: { 
        status: "Call Conducted",
        callDate: { not: null }
      }
    });
    
    const callProposedCount = await prisma.pipelineItem.count({
      where: { 
        status: "Call Proposed",
        callDate: null
      }
    });
    
    console.log(`- Call Booked (future dates): ${callBookedCount}`);
    console.log(`- Call Conducted (past dates): ${callConductedCount}`);
    console.log(`- Call Proposed (no call date): ${callProposedCount}\n`);
    
    // Check sold items
    console.log(`💰 SOLD ITEMS:`);
    const soldItems = await prisma.pipelineItem.findMany({
      where: { status: "Sold" },
      select: {
        id: true,
        name: true,
        value: true,
        bdr: true,
        isSublist: true,
        totalSalesFromList: true
      }
    });
    
    console.log(`- Total sold items: ${soldItems.length}`);
    console.log(`- Sold sublists: ${soldItems.filter(item => item.isSublist).length}`);
    console.log(`- Sold regular items: ${soldItems.filter(item => !item.isSublist).length}`);
    
    const totalValue = soldItems.reduce((sum, item) => sum + (item.value || 0), 0);
    console.log(`- Total value: £${totalValue.toLocaleString()}\n`);
    
    // Check sublists
    console.log(`📋 SUBLISTS:`);
    const sublists = await prisma.pipelineItem.findMany({
      where: { isSublist: true },
      include: {
        children: {
          select: { id: true, status: true, value: true }
        }
      }
    });
    
    for (const sublist of sublists) {
      const soldSubitems = sublist.children.filter(child => child.status === "Sold");
      const totalSubitemValue = sublist.children.reduce((sum, child) => sum + (child.value || 0), 0);
      
      console.log(`- ${sublist.name} (${sublist.status}): ${sublist.children.length} subitems, ${soldSubitems.length} sold, £${totalSubitemValue.toLocaleString()} total value`);
    }
    console.log();
    
    // Check activity logs
    console.log(`📝 ACTIVITY LOGS:`);
    const activityTypeCounts = await prisma.activityLog.groupBy({
      by: ['activityType'],
      _count: { id: true }
    });
    
    for (const activity of activityTypeCounts) {
      console.log(`- ${activity.activityType}: ${activity._count.id} logs`);
    }
    console.log();
    
    console.log('✅ Test data verification completed!');
    
  } catch (error) {
    console.error('Error verifying test data:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the verification
verifyTestData()
  .then(() => {
    console.log('Verification completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Failed to verify test data:', error);
    process.exit(1);
  }); 