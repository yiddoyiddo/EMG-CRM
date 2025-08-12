const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function restoreDatabase() {
  try {
    console.log('Starting database restoration...');

    // First, let's create the necessary users from the backup data
    await createUsersFromBackup();
    
    // Then restore the data in the correct order
    await restoreLeads();
    await restorePipelineItems();
    await restoreActivityLogs();
    await restoreFinanceEntries();
    await restoreKpiTargets();

    console.log('Database restoration completed successfully!');
  } catch (error) {
    console.error('Error during database restoration:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

async function createUsersFromBackup() {
  console.log('Creating users from backup data...');
  
  const leadData = fs.readFileSync(path.join(__dirname, '../backup files from 7.8.25/Lead.csv'), 'utf8');
  const lines = leadData.split('\n');
  const headers = lines[0].split(',').map(h => h.replace(/"/g, ''));
  
  const bdrNames = new Set();
  
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim()) {
      const values = lines[i].split(',').map(v => v.replace(/"/g, ''));
      const bdrName = values[headers.indexOf('bdr')];
      if (bdrName && bdrName !== 'null' && bdrName !== '') {
        bdrNames.add(bdrName);
      }
    }
  }

  // Create users for each BDR
  for (const bdrName of bdrNames) {
    const email = `${bdrName.toLowerCase().replace(/\s+/g, '.')}@emg.com`;
    
    try {
      await prisma.user.upsert({
        where: { email },
        update: {},
        create: {
          name: bdrName,
          email,
          hashedPassword: '$2b$10$dummy.hash.for.backup.restoration',
          role: 'BDR',
          isActive: true
        }
      });
    } catch (error) {
      console.log(`User ${bdrName} already exists or error:`, error.message);
    }
  }
  
  console.log(`Created ${bdrNames.size} users`);
}

async function restoreLeads() {
  console.log('Restoring leads...');
  
  const leadData = fs.readFileSync(path.join(__dirname, '../backup files from 7.8.25/Lead.csv'), 'utf8');
  const lines = leadData.split('\n');
  const headers = lines[0].split(',').map(h => h.replace(/"/g, ''));
  
  let count = 0;
  
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim()) {
      const values = lines[i].split(',').map(v => v.replace(/"/g, ''));
      const bdrName = values[headers.indexOf('bdr')];
      
      if (bdrName && bdrName !== 'null' && bdrName !== '') {
        const email = `${bdrName.toLowerCase().replace(/\s+/g, '.')}@emg.com`;
        const user = await prisma.user.findUnique({ where: { email } });
        
        if (user) {
          try {
            await prisma.lead.create({
              data: {
                name: values[headers.indexOf('name')] || '',
                title: values[headers.indexOf('title')] || null,
                addedDate: new Date(values[headers.indexOf('addedDate')] || new Date()),
                bdrId: user.id,
                company: values[headers.indexOf('company')] || null,
                source: values[headers.indexOf('source')] || '',
                status: values[headers.indexOf('status')] || '',
                link: values[headers.indexOf('link')] || null,
                phone: values[headers.indexOf('phone')] || null,
                notes: values[headers.indexOf('notes')] || null,
                email: values[headers.indexOf('email')] || null
              }
            });
            count++;
          } catch (error) {
            console.log(`Error creating lead ${values[headers.indexOf('name')]}:`, error.message);
          }
        }
      }
    }
  }
  
  console.log(`Restored ${count} leads`);
}

async function restorePipelineItems() {
  console.log('Restoring pipeline items...');
  
  const pipelineData = fs.readFileSync(path.join(__dirname, '../backup files from 7.8.25/PipelineItem.csv'), 'utf8');
  const lines = pipelineData.split('\n');
  const headers = lines[0].split(',').map(h => h.replace(/"/g, ''));
  
  let count = 0;
  const pipelineItemsToUpdate = [];
  
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim()) {
      const values = lines[i].split(',').map(v => v.replace(/"/g, ''));
      const bdrName = values[headers.indexOf('bdr')];
      
      if (bdrName && bdrName !== 'null' && bdrName !== '') {
        const email = `${bdrName.toLowerCase().replace(/\s+/g, '.')}@emg.com`;
        const user = await prisma.user.findUnique({ where: { email } });
        
        if (user) {
          try {
            const originalId = parseInt(values[headers.indexOf('id')]);
            const parentId = values[headers.indexOf('parentId')] ? parseInt(values[headers.indexOf('parentId')]) : null;
            
            // Create pipeline item without parentId first
            const pipelineItem = await prisma.pipelineItem.create({
              data: {
                name: values[headers.indexOf('name')] || '',
                title: values[headers.indexOf('title')] || null,
                addedDate: new Date(values[headers.indexOf('addedDate')] || new Date()),
                lastUpdated: new Date(values[headers.indexOf('lastUpdated')] || new Date()),
                bdrId: user.id,
                company: values[headers.indexOf('company')] || null,
                category: values[headers.indexOf('category')] || '',
                status: values[headers.indexOf('status')] || '',
                value: values[headers.indexOf('value')] ? parseFloat(values[headers.indexOf('value')]) : null,
                probability: values[headers.indexOf('probability')] ? parseInt(values[headers.indexOf('probability')]) : null,
                expectedCloseDate: values[headers.indexOf('expectedCloseDate')] ? new Date(values[headers.indexOf('expectedCloseDate')]) : null,
                link: values[headers.indexOf('link')] || null,
                phone: values[headers.indexOf('phone')] || null,
                notes: values[headers.indexOf('notes')] || null,
                email: values[headers.indexOf('email')] || null,
                leadId: values[headers.indexOf('leadId')] ? parseInt(values[headers.indexOf('leadId')]) : null,
                callDate: values[headers.indexOf('callDate')] ? new Date(values[headers.indexOf('callDate')]) : null,
                parentId: null, // Set to null initially
                isSublist: values[headers.indexOf('isSublist')] === 'true',
                sublistName: values[headers.indexOf('sublistName')] || null,
                sortOrder: values[headers.indexOf('sortOrder')] ? parseInt(values[headers.indexOf('sortOrder')]) : null,
                agreementDate: values[headers.indexOf('agreementDate')] ? new Date(values[headers.indexOf('agreementDate')]) : null,
                partnerListDueDate: values[headers.indexOf('partnerListDueDate')] ? new Date(values[headers.indexOf('partnerListDueDate')]) : null,
                partnerListSentDate: values[headers.indexOf('partnerListSentDate')] ? new Date(values[headers.indexOf('partnerListSentDate')]) : null,
                firstSaleDate: values[headers.indexOf('firstSaleDate')] ? new Date(values[headers.indexOf('firstSaleDate')]) : null,
                partnerListSize: values[headers.indexOf('partnerListSize')] ? parseInt(values[headers.indexOf('partnerListSize')]) : null,
                totalSalesFromList: values[headers.indexOf('totalSalesFromList')] ? parseInt(values[headers.indexOf('totalSalesFromList')]) : null
              }
            });
            
            // Store mapping for later parentId update
            if (parentId) {
              pipelineItemsToUpdate.push({
                newId: pipelineItem.id,
                originalId: originalId,
                parentId: parentId
              });
            }
            
            count++;
          } catch (error) {
            console.log(`Error creating pipeline item ${values[headers.indexOf('name')]}:`, error.message);
          }
        }
      }
    }
  }
  
  console.log(`Restored ${count} pipeline items`);
  
  // Now update parentId references
  console.log('Updating parentId references...');
  let updateCount = 0;
  
  for (const item of pipelineItemsToUpdate) {
    try {
      // Find the new ID of the parent item
      const parentItem = await prisma.pipelineItem.findFirst({
        where: {
          name: { contains: item.parentId.toString() } // This is a simplified approach
        }
      });
      
      if (parentItem) {
        await prisma.pipelineItem.update({
          where: { id: item.newId },
          data: { parentId: parentItem.id }
        });
        updateCount++;
      }
    } catch (error) {
      console.log(`Error updating parentId for item ${item.newId}:`, error.message);
    }
  }
  
  console.log(`Updated ${updateCount} parentId references`);
}

async function restoreActivityLogs() {
  console.log('Restoring activity logs...');
  
  const activityData = fs.readFileSync(path.join(__dirname, '../backup files from 7.8.25/ActivityLog.csv'), 'utf8');
  const lines = activityData.split('\n');
  const headers = lines[0].split(',').map(h => h.replace(/"/g, ''));
  
  let count = 0;
  
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim()) {
      const values = lines[i].split(',').map(v => v.replace(/"/g, ''));
      const bdrName = values[headers.indexOf('bdr')];
      
      if (bdrName && bdrName !== 'null' && bdrName !== '') {
        const email = `${bdrName.toLowerCase().replace(/\s+/g, '.')}@emg.com`;
        const user = await prisma.user.findUnique({ where: { email } });
        
        if (user) {
          try {
            await prisma.activityLog.create({
              data: {
                timestamp: new Date(values[headers.indexOf('timestamp')] || new Date()),
                bdrId: user.id,
                activityType: values[headers.indexOf('activityType')] || '',
                description: values[headers.indexOf('description')] || '',
                scheduledDate: values[headers.indexOf('scheduledDate')] ? new Date(values[headers.indexOf('scheduledDate')]) : null,
                completedDate: values[headers.indexOf('completedDate')] ? new Date(values[headers.indexOf('completedDate')]) : null,
                notes: values[headers.indexOf('notes')] || null,
                leadId: values[headers.indexOf('leadId')] ? parseInt(values[headers.indexOf('leadId')]) : null,
                pipelineItemId: values[headers.indexOf('pipelineItemId')] ? parseInt(values[headers.indexOf('pipelineItemId')]) : null,
                previousStatus: values[headers.indexOf('previousStatus')] || null,
                newStatus: values[headers.indexOf('newStatus')] || null,
                previousCategory: values[headers.indexOf('previousCategory')] || null,
                newCategory: values[headers.indexOf('newCategory')] || null
              }
            });
            count++;
          } catch (error) {
            console.log(`Error creating activity log:`, error.message);
          }
        }
      }
    }
  }
  
  console.log(`Restored ${count} activity logs`);
}

async function restoreFinanceEntries() {
  console.log('Restoring finance entries...');
  
  const financeData = fs.readFileSync(path.join(__dirname, '../backup files from 7.8.25/FinanceEntry.csv'), 'utf8');
  const lines = financeData.split('\n');
  const headers = lines[0].split(',').map(h => h.replace(/"/g, ''));
  
  let count = 0;
  
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim()) {
      const values = lines[i].split(',').map(v => v.replace(/"/g, ''));
      const bdrName = values[headers.indexOf('bdr')];
      
      if (bdrName && bdrName !== 'null' && bdrName !== '') {
        const email = `${bdrName.toLowerCase().replace(/\s+/g, '.')}@emg.com`;
        const user = await prisma.user.findUnique({ where: { email } });
        
        if (user) {
          try {
            await prisma.financeEntry.create({
              data: {
                company: values[headers.indexOf('company')] || '',
                bdrId: user.id,
                leadGen: values[headers.indexOf('leadGen')] === 'true',
                status: values[headers.indexOf('status')] || '',
                invoiceDate: values[headers.indexOf('invoiceDate')] ? new Date(values[headers.indexOf('invoiceDate')]) : null,
                dueDate: values[headers.indexOf('dueDate')] ? new Date(values[headers.indexOf('dueDate')]) : null,
                soldAmount: values[headers.indexOf('soldAmount')] ? parseFloat(values[headers.indexOf('soldAmount')]) : null,
                gbpAmount: values[headers.indexOf('gbpAmount')] ? parseFloat(values[headers.indexOf('gbpAmount')]) : null,
                exchangeRate: values[headers.indexOf('exchangeRate')] ? parseFloat(values[headers.indexOf('exchangeRate')]) : null,
                exchangeRateDate: values[headers.indexOf('exchangeRateDate')] ? new Date(values[headers.indexOf('exchangeRateDate')]) : null,
                actualGbpReceived: values[headers.indexOf('actualGbpReceived')] ? parseFloat(values[headers.indexOf('actualGbpReceived')]) : null,
                notes: values[headers.indexOf('notes')] || null,
                commissionPaid: values[headers.indexOf('commissionPaid')] === 'true',
                month: values[headers.indexOf('month')] || '2025-01'
              }
            });
            count++;
          } catch (error) {
            console.log(`Error creating finance entry:`, error.message);
          }
        }
      }
    }
  }
  
  console.log(`Restored ${count} finance entries`);
}

async function restoreKpiTargets() {
  console.log('Restoring KPI targets...');
  
  const kpiData = fs.readFileSync(path.join(__dirname, '../backup files from 7.8.25/KpiTarget.csv'), 'utf8');
  const lines = kpiData.split('\n');
  const headers = lines[0].split(',').map(h => h.replace(/"/g, ''));
  
  let count = 0;
  
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim()) {
      const values = lines[i].split(',').map(v => v.replace(/"/g, ''));
      
      try {
        await prisma.kpiTarget.upsert({
          where: { name: values[headers.indexOf('name')] || '' },
          update: {
            value: parseInt(values[headers.indexOf('value')] || '0')
          },
          create: {
            name: values[headers.indexOf('name')] || '',
            value: parseInt(values[headers.indexOf('value')] || '0')
          }
        });
        count++;
      } catch (error) {
        console.log(`Error creating KPI target:`, error.message);
      }
    }
  }
  
  console.log(`Restored ${count} KPI targets`);
}

// Run the restoration
restoreDatabase().catch(console.error);
