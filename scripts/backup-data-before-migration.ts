import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function backupData() {
  try {
    console.log('Starting data backup...');
    
    // Get all leads
    const leads = await prisma.lead.findMany();
    console.log(`Found ${leads.length} leads`);
    
    // Get all pipeline items
    const pipelineItems = await prisma.pipelineItem.findMany();
    console.log(`Found ${pipelineItems.length} pipeline items`);
    
    // Get all activity logs
    const activityLogs = await prisma.activityLog.findMany();
    console.log(`Found ${activityLogs.length} activity logs`);
    
    // Create backup object
    const backup = {
      timestamp: new Date().toISOString(),
      leads,
      pipelineItems,
      activityLogs
    };
    
    // Write backup to file
    const backupPath = path.join(__dirname, '..', 'backup', `data-backup-${Date.now()}.json`);
    
    // Ensure backup directory exists
    const backupDir = path.dirname(backupPath);
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }
    
    fs.writeFileSync(backupPath, JSON.stringify(backup, null, 2));
    
    console.log(`Data backed up successfully to: ${backupPath}`);
    console.log(`Backup contains:`);
    console.log(`- ${leads.length} leads`);
    console.log(`- ${pipelineItems.length} pipeline items`);
    console.log(`- ${activityLogs.length} activity logs`);
    
    return backupPath;
  } catch (error) {
    console.error('Error backing up data:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  backupData()
    .then(() => {
      console.log('Backup completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Backup failed:', error);
      process.exit(1);
    });
}

export { backupData }; 