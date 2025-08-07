import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

async function restoreFromBackup() {
  try {
    console.log('🔄 Restoring data from backup...');

    // Read the backup file
    const backupPath = path.join(process.cwd(), 'backup', 'data-backup-1753726495118.json');
    const backupData = JSON.parse(fs.readFileSync(backupPath, 'utf-8'));

    console.log('📊 Backup contains:');
    console.log(`  - ${backupData.leads?.length || 0} leads`);
    console.log(`  - ${backupData.pipelineItems?.length || 0} pipeline items`);
    console.log(`  - ${backupData.activityLogs?.length || 0} activity logs`);

    // First, clear existing data to avoid conflicts
    console.log('\n🧹 Clearing existing data...');
    await prisma.activityLog.deleteMany();
    await prisma.pipelineItem.deleteMany();
    await prisma.lead.deleteMany();
    console.log('✅ Existing data cleared');

    // Restore leads
    if (backupData.leads && backupData.leads.length > 0) {
      console.log(`\n📝 Restoring ${backupData.leads.length} leads...`);
      
      for (const lead of backupData.leads) {
        try {
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
        } catch (error) {
          console.error(`Error restoring lead ${lead.name}:`, error);
        }
      }
      console.log('✅ Leads restored');
    }

    // Restore pipeline items
    if (backupData.pipelineItems && backupData.pipelineItems.length > 0) {
      console.log(`\n📋 Restoring ${backupData.pipelineItems.length} pipeline items...`);
      
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
              leadId: item.leadId,
              callDate: item.callDate ? new Date(item.callDate) : null,
              parentId: item.parentId,
              isSublist: item.isSublist || false,
              sublistName: item.sublistName,
              sortOrder: item.sortOrder,
              agreementDate: item.agreementDate ? new Date(item.agreementDate) : null,
              partnerListDueDate: item.partnerListDueDate ? new Date(item.partnerListDueDate) : null,
              partnerListSentDate: item.partnerListSentDate ? new Date(item.partnerListSentDate) : null,
              firstSaleDate: item.firstSaleDate ? new Date(item.firstSaleDate) : null,
              partnerListSize: item.partnerListSize,
              totalSalesFromList: item.totalSalesFromList
            }
          });
        } catch (error) {
          console.error(`Error restoring pipeline item ${item.name}:`, error);
        }
      }
      console.log('✅ Pipeline items restored');
    }

    // Restore activity logs
    if (backupData.activityLogs && backupData.activityLogs.length > 0) {
      console.log(`\n📝 Restoring ${backupData.activityLogs.length} activity logs...`);
      
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
              leadId: log.leadId,
              pipelineItemId: log.pipelineItemId,
              previousStatus: log.previousStatus,
              newStatus: log.newStatus,
              previousCategory: log.previousCategory,
              newCategory: log.newCategory
            }
          });
        } catch (error) {
          console.error(`Error restoring activity log ${log.id}:`, error);
        }
      }
      console.log('✅ Activity logs restored');
    }

    console.log('\n🎉 Data restoration completed successfully!');
    
    // Verify the restoration
    const leadCount = await prisma.lead.count();
    const pipelineCount = await prisma.pipelineItem.count();
    const activityCount = await prisma.activityLog.count();
    
    console.log('\n📊 Verification:');
    console.log(`  - Leads: ${leadCount}`);
    console.log(`  - Pipeline Items: ${pipelineCount}`);
    console.log(`  - Activity Logs: ${activityCount}`);

  } catch (error) {
    console.error('❌ Error restoring data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

restoreFromBackup(); 