import { PrismaClient } from '@prisma/client';
import { startOfWeek, endOfWeek } from 'date-fns';

const prisma = new PrismaClient();

async function finalWeeklyAdjustment() {
  console.log('🎯 Final adjustment to get weekly performance closer to targets...\n');
  
  const now = new Date();
  const thisWeekStart = startOfWeek(now, { weekStartsOn: 1 });
  
  // Get current weekly activities
  const thisWeekActivities = await prisma.activityLog.findMany({
    where: {
      timestamp: {
        gte: thisWeekStart,
        lte: now
      }
    }
  });
  
  const thisWeekCalls = thisWeekActivities.filter(a => a.activityType === 'Call_Completed');
  const thisWeekAgreements = thisWeekActivities.filter(a => a.activityType === 'Agreement_Sent');
  const thisWeekLists = thisWeekActivities.filter(a => a.activityType === 'Partner_List_Sent');
  
  console.log(`Current weekly: ${thisWeekCalls.length} calls, ${thisWeekAgreements.length} agreements, ${thisWeekLists.length} lists`);
  console.log(`Targets: 130 calls, 39 agreements, 13 lists`);
  
  // Target: Keep calls around 140 (slightly above 130), agreements around 45 (slightly above 39), lists around 15 (slightly above 13)
  const callsToRemove = Math.max(0, thisWeekCalls.length - 140);
  const agreementsToRemove = Math.max(0, thisWeekAgreements.length - 45);
  const listsToRemove = Math.max(0, thisWeekLists.length - 15);
  
  console.log(`Need to remove: ${callsToRemove} calls, ${agreementsToRemove} agreements, ${listsToRemove} lists`);
  
  // Remove excess activities
  if (callsToRemove > 0) {
    const callsToDelete = thisWeekCalls.slice(0, callsToRemove).map(a => a.id);
    await prisma.activityLog.deleteMany({
      where: { id: { in: callsToDelete } }
    });
    console.log(`🗑️ Removed ${callsToRemove} excessive weekly calls`);
  }
  
  if (agreementsToRemove > 0) {
    const agreementsToDelete = thisWeekAgreements.slice(0, agreementsToRemove).map(a => a.id);
    await prisma.activityLog.deleteMany({
      where: { id: { in: agreementsToDelete } }
    });
    console.log(`🗑️ Removed ${agreementsToRemove} excessive weekly agreements`);
  }
  
  if (listsToRemove > 0) {
    const listsToDelete = thisWeekLists.slice(0, listsToRemove).map(a => a.id);
    await prisma.activityLog.deleteMany({
      where: { id: { in: listsToDelete } }
    });
    console.log(`🗑️ Removed ${listsToRemove} excessive weekly lists`);
  }
  
  // Also remove some corresponding pipeline items that may no longer make sense
  const thisWeekPipeline = await prisma.pipelineItem.findMany({
    where: {
      addedDate: {
        gte: thisWeekStart,
        lte: now
      }
    }
  });
  
  const pipelineToRemove = Math.max(0, thisWeekPipeline.length - 60); // Keep around 60 this week items
  if (pipelineToRemove > 0) {
    const pipelineToDelete = thisWeekPipeline.slice(0, pipelineToRemove).map(p => p.id);
    await prisma.pipelineItem.deleteMany({
      where: { id: { in: pipelineToDelete } }
    });
    console.log(`🗑️ Removed ${pipelineToRemove} excessive weekly pipeline items`);
  }
  
  // Final counts
  const finalCalls = await prisma.activityLog.count({
    where: {
      activityType: 'Call_Completed',
      timestamp: { gte: thisWeekStart, lte: now }
    }
  });
  
  const finalAgreements = await prisma.activityLog.count({
    where: {
      activityType: 'Agreement_Sent',
      timestamp: { gte: thisWeekStart, lte: now }
    }
  });
  
  const finalLists = await prisma.activityLog.count({
    where: {
      activityType: 'Partner_List_Sent',
      timestamp: { gte: thisWeekStart, lte: now }
    }
  });
  
  console.log('\n✅ Final weekly adjustment complete!');
  console.log(`📊 Final weekly: ${finalCalls} calls, ${finalAgreements} agreements, ${finalLists} lists`);
  console.log(`🎯 Target weekly: 130 calls, 39 agreements, 13 lists`);
  console.log(`📈 Performance: ${(finalCalls/130*100).toFixed(1)}% calls, ${(finalAgreements/39*100).toFixed(1)}% agreements, ${(finalLists/13*100).toFixed(1)}% lists`);
}

async function main() {
  try {
    await finalWeeklyAdjustment();
  } catch (error) {
    console.error('Error with final weekly adjustment:', error);
    throw error;
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());