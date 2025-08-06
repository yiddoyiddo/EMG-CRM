import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function recreateSublistsWithProperActivityLogs() {
  try {
    console.log('🔄 Recreating sublists with proper activity log structure...\n');

    // 1. Load the backup data
    const fs = require('fs');
    const backupFiles = fs.readdirSync('backup').filter(file => file.includes('incorrect-notes-backup'));
    
    if (backupFiles.length === 0) {
      console.log('❌ No backup files found. Please run the clearing script first.');
      return;
    }

    // Use the most recent backup file
    const latestBackupFile = backupFiles.sort().pop();
    const backupData = JSON.parse(fs.readFileSync(`backup/${latestBackupFile}`, 'utf-8'));
    
    console.log(`📂 Using backup file: ${latestBackupFile}`);
    console.log(`📊 Found ${backupData.length} items to recreate`);

    // 2. Process each item and create proper activity logs
    let activityLogsCreated = 0;
    let itemsProcessed = 0;

    for (const item of backupData) {
      console.log(`\n🔄 Processing: ${item.name} (ID: ${item.id})`);
      
      // Extract deal information from the original notes
      const dealInfo = extractDealInfo(item.notes);
      
      if (dealInfo) {
        // Create activity log for the deal
        await prisma.activityLog.create({
          data: {
            bdr: item.bdr || 'Unknown',
            activityType: 'Deal_Closed',
            description: `Deal closed: ${dealInfo.package} - ${dealInfo.amount}`,
            notes: `Partner from ${item.company || 'Unknown'} network. ${dealInfo.package} deal closed successfully!`,
            pipelineItemId: item.id,
            timestamp: new Date(), // Use current timestamp for now
            completedDate: new Date(),
          }
        });
        
        activityLogsCreated++;
        console.log(`  ✅ Created activity log for deal: ${dealInfo.amount} - ${dealInfo.package}`);
      }

      // Process children (sublist items)
      for (const child of item.children) {
        const childDealInfo = extractDealInfo(child.notes);
        
        if (childDealInfo) {
          // Create activity log for the child deal
          await prisma.activityLog.create({
            data: {
              bdr: child.bdr || 'Unknown',
              activityType: 'Deal_Closed',
              description: `Deal closed: ${childDealInfo.package} - ${childDealInfo.amount}`,
              notes: `Partner from ${child.company || 'Unknown'} network. ${childDealInfo.package} deal closed successfully!`,
              pipelineItemId: child.id,
              timestamp: new Date(), // Use current timestamp for now
              completedDate: new Date(),
            }
          });
          
          activityLogsCreated++;
          console.log(`    ✅ Created activity log for child deal: ${childDealInfo.amount} - ${childDealInfo.package}`);
        }
      }

      itemsProcessed++;
    }

    console.log('\n📊 RECREATION SUMMARY:');
    console.log('=======================');
    console.log(`Items processed: ${itemsProcessed}`);
    console.log(`Activity logs created: ${activityLogsCreated}`);

    // 3. Verify the activity logs were created properly
    const totalActivityLogs = await prisma.activityLog.count({
      where: {
        activityType: 'Deal_Closed'
      }
    });

    console.log(`\n✅ Verification: ${totalActivityLogs} total Deal_Closed activity logs in database`);

    // 4. Test that reporting can find deals by searching activity logs
    const dealsThisWeek = await prisma.activityLog.count({
      where: {
        activityType: 'Deal_Closed',
        timestamp: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
        }
      }
    });

    const dealsPastWeek = await prisma.activityLog.count({
      where: {
        activityType: 'Deal_Closed',
        timestamp: {
          lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Before last 7 days
        }
      }
    });

    console.log(`\n📈 REPORTING TEST RESULTS:`);
    console.log(`Deals this week: ${dealsThisWeek}`);
    console.log(`Deals past week: ${dealsPastWeek}`);

    console.log('\n🎉 SUCCESS: Sublists recreated with proper activity log structure!');
    console.log('📋 Next step: Test time-based reporting (this week vs past sales)');

  } catch (error) {
    console.error('Error recreating sublists:', error);
  } finally {
    await prisma.$disconnect();
  }
}

function extractDealInfo(notes: string): { amount: string; package: string } | null {
  if (!notes) return null;

  // Look for deal patterns in the notes
  const dealPatterns = [
    /✅ DEAL: £(\d+(?:\.\d+)?) - ([^.]+)/i,
    /DEAL: £(\d+(?:\.\d+)?) - ([^.]+)/i,
    /£(\d+(?:\.\d+)?) - ([^.]+)/i,
  ];

  for (const pattern of dealPatterns) {
    const match = notes.match(pattern);
    if (match) {
      return {
        amount: `£${match[1]}`,
        package: match[2].trim()
      };
    }
  }

  return null;
}

recreateSublistsWithProperActivityLogs(); 