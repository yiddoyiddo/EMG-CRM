import { PrismaClient } from '@prisma/client';
import fs from 'fs';

const prisma = new PrismaClient();

async function restoreRemainingData() {
  try {
    console.log('🔄 RESTORING REMAINING DATA (Pipeline Items & Activity Logs)');
    console.log('=' .repeat(60));
    
    const backupPath = 'backup/pre-import-backup-1753732530089.json';
    
    console.log('📁 Reading backup file...');
    const backupData = JSON.parse(fs.readFileSync(backupPath, 'utf8'));
    
    // Check current state
    const currentLeadCount = await prisma.lead.count();
    console.log(`✅ Current leads: ${currentLeadCount}`);
    
    // Restore pipeline items (handling foreign key constraints)
    if (backupData.pipelineItems && backupData.pipelineItems.length > 0) {
      console.log('\n🔄 Restoring pipeline items...');
      let restoredCount = 0;
      let errorCount = 0;
      
      for (const item of backupData.pipelineItems) {
        try {
          await prisma.pipelineItem.create({
            data: {
              id: item.id,
              name: item.name,
              title: item.title,
              addedDate: new Date(item.addedDate),
              lastUpdated: new Date(item.lastUpdated),
              bdr: item.bdr,
              company: item.company,
              category: item.category,
              status: item.status,
              value: item.value,
              probability: item.probability,
              expectedCloseDate: item.expectedCloseDate ? new Date(item.expectedCloseDate) : null,
              link: item.link,
              phone: item.phone,
              notes: item.notes,
              email: item.email,
              leadId: item.leadId && item.leadId !== null ? item.leadId : null, // Handle null leadId
              callDate: item.callDate ? new Date(item.callDate) : null,
              parentId: item.parentId && item.parentId !== null ? item.parentId : null, // Handle null parentId
              isSublist: item.isSublist || false,
              sublistName: item.sublistName,
              sortOrder: item.sortOrder
            }
          });
          restoredCount++;
        } catch (error) {
          console.log(`⚠️  Skipping pipeline item ${item.id} (${item.name}) due to constraint error`);
          errorCount++;
        }
      }
      console.log(`✅ Restored ${restoredCount} pipeline items`);
      if (errorCount > 0) {
        console.log(`⚠️  Skipped ${errorCount} items due to foreign key constraints`);
      }
    }
    
    // Restore activity logs (handling foreign key constraints)
    if (backupData.activityLogs && backupData.activityLogs.length > 0) {
      console.log('\n🔄 Restoring activity logs...');
      let restoredCount = 0;
      let errorCount = 0;
      
      for (const log of backupData.activityLogs) {
        try {
          await prisma.activityLog.create({
            data: {
              id: log.id,
              timestamp: new Date(log.timestamp),
              bdr: log.bdr,
              activityType: log.activityType,
              description: log.description,
              scheduledDate: log.scheduledDate ? new Date(log.scheduledDate) : null,
              completedDate: log.completedDate ? new Date(log.completedDate) : null,
              notes: log.notes,
              leadId: log.leadId && log.leadId !== null ? log.leadId : null, // Handle null leadId
              pipelineItemId: log.pipelineItemId && log.pipelineItemId !== null ? log.pipelineItemId : null, // Handle null pipelineItemId
              previousStatus: log.previousStatus,
              newStatus: log.newStatus,
              previousCategory: log.previousCategory,
              newCategory: log.newCategory
            }
          });
          restoredCount++;
        } catch (error) {
          console.log(`⚠️  Skipping activity log ${log.id} due to constraint error`);
          errorCount++;
        }
      }
      console.log(`✅ Restored ${restoredCount} activity logs`);
      if (errorCount > 0) {
        console.log(`⚠️  Skipped ${errorCount} logs due to foreign key constraints`);
      }
    }
    
    // Final verification
    console.log('\n🔍 Final verification:');
    const leadCount = await prisma.lead.count();
    const pipelineCount = await prisma.pipelineItem.count();
    const activityCount = await prisma.activityLog.count();
    
    console.log(`  Leads: ${leadCount}`);
    console.log(`  Pipeline Items: ${pipelineCount}`);
    console.log(`  Activity Logs: ${activityCount}`);
    
    console.log('\n✅ RESTORATION COMPLETE!');
    console.log('Your data has been restored. Some items may have been skipped due to');
    console.log('foreign key constraints, but the core data is back.');
    
  } catch (error) {
    console.error('❌ Error during restoration:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

restoreRemainingData(); 