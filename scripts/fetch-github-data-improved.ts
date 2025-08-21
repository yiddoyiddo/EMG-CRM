import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

// GitHub repository details
const GITHUB_OWNER = 'yiddoyiddo';
const GITHUB_REPO = 'EMG-CRM';
const BACKUP_PATH = 'backup';

// Helper to convert dates
const convertDates = (item: any) => {
    const newItem = { ...item };
    ['createdAt', 'updatedAt', 'expectedCloseDate', 'callDate', 'addedDate', 'lastUpdated', 'timestamp', 'invoiceDate', 'dueDate', 'agreementDate', 'partnerListDueDate', 'partnerListSentDate', 'firstSaleDate'].forEach(field => {
        if (newItem[field]) {
            newItem[field] = new Date(newItem[field]);
        }
    });
    return newItem;
};

async function fetchAndProcessData() {
  console.log('🔄 Fetching data from GitHub...');

  try {
    // First, let's try to get the backup directory contents
    const response = await fetch(`https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${BACKUP_PATH}`);
    
    if (!response.ok) {
      console.error(`❌ Failed to fetch backup directory: ${response.statusText}`);
      return;
    }

    const contents = await response.json();
    console.log('📁 Found backup files:');
    
    // Find the most recent backup file (assuming it has the latest timestamp)
    const jsonFiles = contents.filter((item: any) => item.type === 'file' && item.name.endsWith('.json'));
    jsonFiles.sort((a: any, b: any) => b.name.localeCompare(a.name)); // Sort by name (newest first)
    
    if (jsonFiles.length === 0) {
      console.error('❌ No JSON backup files found');
      return;
    }

    // Process only the first (most recent) file
    const selectedFile = jsonFiles[0];
    console.log(`📄 Processing: ${selectedFile.name} (${selectedFile.size} bytes)`);
    
    // Download the file
    const fileResponse = await fetch(selectedFile.download_url);
    if (fileResponse.ok) {
      const data = await fileResponse.json();
      
      // Save to local backup directory
      const localPath = path.join(process.cwd(), 'backup', selectedFile.name);
      fs.writeFileSync(localPath, JSON.stringify(data, null, 2));
      console.log(`✅ Downloaded ${selectedFile.name}`);
      
      // Process the data
      await processBackupData(data, selectedFile.name);
    }

  } catch (error) {
    console.error('❌ Error fetching data from GitHub:', error);
  }
}

async function processBackupData(backupData: any, filename: string) {
  console.log(`🔄 Processing ${filename}...`);

  // 1. Create User Mapping
  const users = await prisma.user.findMany();
  const userMap = new Map<string, string>();
  users.forEach(user => {
    if (user.name) {
        userMap.set(user.name.trim().toLowerCase(), user.id);
    }
  });

  const fallbackAdmin = users.find(u => u.email === 'admin@busenq.com');
  if (!fallbackAdmin) {
      console.error(`❌ Fallback admin not found: admin@busenq.com`);
      return;
  }

  // 2. Process Data
  try {
    // Leads
    if (backupData.leads && backupData.leads.length > 0) {
      console.log(`📝 Processing ${backupData.leads.length} Leads...`);
      for (const lead of backupData.leads) {
        const bdrName = lead.bdr ? lead.bdr.trim().toLowerCase() : null;
        const bdrId = bdrName ? userMap.get(bdrName) || fallbackAdmin.id : fallbackAdmin.id;

        const data = convertDates(lead);
        delete data.id;
        delete data.bdr;
        data.bdrId = bdrId;

        try {
          await prisma.lead.create({ data });
        } catch (e) {
          if (e.code === 'P2002') {
            console.log(`⚠️  Lead with email ${data.email} already exists, skipping`);
          } else {
            console.error(`Error creating lead ${data.name}:`, e);
          }
        }
      }
      console.log('✅ Leads processed');
    }

    // Pipeline Items
    if (backupData.pipelineItems && backupData.pipelineItems.length > 0) {
      console.log(`📋 Processing ${backupData.pipelineItems.length} Pipeline Items...`);
      for (const item of backupData.pipelineItems) {
        const bdrName = item.bdr ? item.bdr.trim().toLowerCase() : null;
        const bdrId = bdrName ? userMap.get(bdrName) || fallbackAdmin.id : fallbackAdmin.id;

        const data = convertDates(item);
        delete data.id;
        delete data.bdr;
        data.bdrId = bdrId;

        if (data.parentId === 0) data.parentId = null;
        
        // Remove leadId to avoid foreign key constraint issues
        delete data.leadId;

        try {
          await prisma.pipelineItem.create({ data });
        } catch (e) {
          console.error(`Error processing pipeline item ${item.id} (${item.name}):`, e);
        }
      }
      console.log('✅ Pipeline items processed');
    }

    // Activity Logs
    if (backupData.activityLogs && backupData.activityLogs.length > 0) {
      console.log(`📝 Processing ${backupData.activityLogs.length} Activity Logs...`);
      for (const log of backupData.activityLogs) {
        const bdrName = log.bdr ? log.bdr.trim().toLowerCase() : null;
        const bdrId = bdrName ? userMap.get(bdrName) || fallbackAdmin.id : fallbackAdmin.id;

        const data = convertDates(log);
        delete data.id;
        delete data.bdr;
        data.bdrId = bdrId;

        // Remove relational IDs since they've changed
        delete data.leadId;
        delete data.pipelineItemId;

        try {
          await prisma.activityLog.create({ data });
        } catch (e) {
          console.error(`Error processing activity log ${log.id}:`, e);
        }
      }
      console.log('✅ Activity logs processed');
    }

    console.log(`🎉 Successfully processed ${filename}`);
  } catch (error) {
    console.error(`❌ Error processing ${filename}:`, error);
  }
}

fetchAndProcessData().catch((e) => { 
  console.error(e); 
  process.exit(1); 
}).finally(async () => { 
  await prisma.$disconnect(); 
});
