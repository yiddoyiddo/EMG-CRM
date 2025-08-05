import { prisma } from "../src/lib/db";
import fs from 'fs';

interface BackupData {
  timestamp: string;
  leads: any[];
}

async function restoreLeadsOnly() {
  try {
    console.log('Starting leads restoration...');
    
    // Read the backup file
    const backupData: BackupData = JSON.parse(
      fs.readFileSync('backup/dedup-backup-1753731729497.json', 'utf-8')
    );
    
    console.log(`Found ${backupData.leads?.length || 0} leads to restore`);
    
    // Clear existing leads only
    console.log('Clearing existing leads...');
    await prisma.lead.deleteMany();
    
    // Restore leads
    if (backupData.leads && backupData.leads.length > 0) {
      console.log('Restoring leads...');
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
            email: lead.email,
          },
        });
      }
      console.log(`Restored ${backupData.leads.length} leads`);
    }
    
    console.log('Leads restoration completed successfully!');
  } catch (error) {
    console.error('Error restoring leads:', error);
  } finally {
    await prisma.$disconnect();
  }
}

restoreLeadsOnly()
  .catch(console.error); 