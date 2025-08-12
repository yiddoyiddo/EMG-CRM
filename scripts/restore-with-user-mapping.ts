import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();
// !! Update this path if necessary based on the Cursor logs !!
const BACKUP_FILE = path.resolve(process.cwd(), 'backup/data-backup-1753726495118.json');
const FALLBACK_ADMIN_EMAIL = 'admin@emg.com'; // Fallback for orphaned data (e.g. Gary Smith)

// Helper to convert dates (add any missing date fields from your models)
const convertDates = (item: any) => {
    const newItem = { ...item };
    // Add all relevant date fields from your models here
    ['createdAt', 'updatedAt', 'expectedCloseDate', 'callDate', 'addedDate', 'lastUpdated', 'timestamp', 'invoiceDate', 'dueDate', 'agreementDate', 'partnerListDueDate', 'partnerListSentDate', 'firstSaleDate'].forEach(field => {
        if (newItem[field]) {
            newItem[field] = new Date(newItem[field]);
        }
    });
    return newItem;
};

async function restoreData() {
  console.log('🔄 Restoring data with user mapping...');

  if (!fs.existsSync(BACKUP_FILE)) {
    console.error(`❌ Backup file not found: ${BACKUP_FILE}`);
    return;
  }

  const backupData = JSON.parse(fs.readFileSync(BACKUP_FILE, 'utf-8'));

  // 1. Create User Mapping
  const users = await prisma.user.findMany();
  const userMap = new Map<string, string>();
  users.forEach(user => {
    if (user.name) {
        // Map using lowercase/trimmed names for robustness
        userMap.set(user.name.trim().toLowerCase(), user.id);
    }
  });

  const fallbackAdmin = users.find(u => u.email === FALLBACK_ADMIN_EMAIL);
  if (!fallbackAdmin) {
      console.error(`❌ Fallback admin not found: ${FALLBACK_ADMIN_EMAIL}`);
      return;
  }

  // 2. Process Data
  await prisma.$transaction(async (tx) => {
    // Leads
    console.log(`📝 Restoring ${backupData.leads.length} Leads...`);
    for (const lead of backupData.leads) {
        const bdrName = lead.bdr ? lead.bdr.trim().toLowerCase() : null;
        // CRITICAL: Map name to ID. Use fallback if name doesn't exist in the new system.
        const bdrId = bdrName ? userMap.get(bdrName) || fallbackAdmin.id : fallbackAdmin.id;

        const data = convertDates(lead);
        // CRITICAL: Remove old ID (fixes Prisma error) and old string BDR name, assign new bdrId
        delete data.id;
        delete data.bdr;
        data.bdrId = bdrId;

        await tx.lead.create({ data });
    }

    // Pipeline Items
    console.log(`📋 Restoring ${backupData.pipelineItems.length} Pipeline Items...`);
    for (const item of backupData.pipelineItems) {
        const bdrName = item.bdr ? item.bdr.trim().toLowerCase() : null;
        const bdrId = bdrName ? userMap.get(bdrName) || fallbackAdmin.id : fallbackAdmin.id;

        const data = convertDates(item);
        delete data.id;
        delete data.bdr;
        data.bdrId = bdrId;

        if (data.parentId === 0) data.parentId = null;

        try {
             await tx.pipelineItem.create({ data });
        } catch (e) {
            console.error(`Error restoring pipeline item ${item.id} (${item.name}):`, e);
        }
    }

    // Activity Logs (if present in backup)
    if (backupData.activityLogs) {
        console.log(`📝 Restoring ${backupData.activityLogs.length} Activity Logs...`);
        for (const log of backupData.activityLogs) {
            const bdrName = log.bdr ? log.bdr.trim().toLowerCase() : null;
            const bdrId = bdrName ? userMap.get(bdrName) || fallbackAdmin.id : fallbackAdmin.id;

            const data = convertDates(log);
            delete data.id;
            delete data.bdr;
            data.bdrId = bdrId;

            // NOTE: We delete leadId/pipelineItemId because the IDs have changed during import.
            // We prioritize importing the log history itself over relational links for this migration.
            delete data.leadId;
            delete data.pipelineItemId;

            try {
                await tx.activityLog.create({ data });
            } catch (e) {
                console.error(`Error restoring activity log ${log.id}:`, e);
            }
        }
    }
  });

  console.log('🎉 Data restoration completed successfully (Note: IDs have been reassigned).');
}

restoreData().catch((e) => { console.error(e); process.exit(1); }).finally(async () => { await prisma.$disconnect(); });
