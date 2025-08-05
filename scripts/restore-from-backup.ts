import { PrismaClient } from '@prisma/client';
import fs from 'fs';

const prisma = new PrismaClient();

async function restoreFromBackup() {
  try {
    console.log('🚨 RESTORING DATA FROM PRE-IMPORT BACKUP');
    console.log('=' .repeat(50));
    
    const backupPath = 'backup/pre-import-backup-1753732530089.json';
    
    if (!fs.existsSync(backupPath)) {
      console.error('❌ Backup file not found:', backupPath);
      return;
    }
    
    console.log('📁 Reading backup file...');
    const backupData = JSON.parse(fs.readFileSync(backupPath, 'utf8'));
    
    console.log('🗑️  Clearing current data...');
    // Clear in correct order due to foreign key constraints
    await prisma.activityLog.deleteMany({});
    await prisma.pipelineItem.deleteMany({});
    await prisma.lead.deleteMany({});
    
    console.log('📊 Backup contains:');
    console.log(`  - Leads: ${backupData.leads?.length || 0}`);
    console.log(`  - Pipeline Items: ${backupData.pipelineItems?.length || 0}`);
    console.log(`  - Activity Logs: ${backupData.activityLogs?.length || 0}`);
    
    // Restore leads first
    if (backupData.leads && backupData.leads.length > 0) {
      console.log('\n🔄 Restoring leads...');
      for (const lead of backupData.leads) {
        await prisma.lead.create({
          data: {
            id: lead.id,
            name: lead.name,
            title: lead.title,
            addedDate: new Date(lead.addedDate),
            bdr: lead.bdr,
            company: lead.company,
            source: lead.source,
            status: lead.status,
            link: lead.link,
            phone: lead.phone,
            notes: lead.notes,
            email: lead.email
          }
        });
      }
      console.log(`✅ Restored ${backupData.leads.length} leads`);
    }
    
    // Restore pipeline items
    if (backupData.pipelineItems && backupData.pipelineItems.length > 0) {
      console.log('\n🔄 Restoring pipeline items...');
      for (const item of backupData.pipelineItems) {
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
            leadId: item.leadId,
            callDate: item.callDate ? new Date(item.callDate) : null,
            parentId: item.parentId,
            isSublist: item.isSublist || false,
            sublistName: item.sublistName,
            sortOrder: item.sortOrder
          }
        });
      }
      console.log(`✅ Restored ${backupData.pipelineItems.length} pipeline items`);
    }
    
    // Restore activity logs
    if (backupData.activityLogs && backupData.activityLogs.length > 0) {
      console.log('\n🔄 Restoring activity logs...');
      for (const log of backupData.activityLogs) {
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
            leadId: log.leadId,
            pipelineItemId: log.pipelineItemId,
            previousStatus: log.previousStatus,
            newStatus: log.newStatus,
            previousCategory: log.previousCategory,
            newCategory: log.newCategory
          }
        });
      }
      console.log(`✅ Restored ${backupData.activityLogs.length} activity logs`);
    }
    
    // Verify restoration
    console.log('\n🔍 Verification:');
    const leadCount = await prisma.lead.count();
    const pipelineCount = await prisma.pipelineItem.count();
    const activityCount = await prisma.activityLog.count();
    
    console.log(`  Leads: ${leadCount}`);
    console.log(`  Pipeline Items: ${pipelineCount}`);
    console.log(`  Activity Logs: ${activityCount}`);
    
    console.log('\n✅ RESTORATION COMPLETE!');
    console.log('All your original data has been restored.');
    
  } catch (error) {
    console.error('❌ Error during restoration:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

restoreFromBackup(); 