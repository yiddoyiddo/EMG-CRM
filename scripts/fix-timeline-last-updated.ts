import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixTimelineLastUpdated() {
  try {
    console.log('🔍 Fixing timeline last updated and activity logs...\n');

    // Get all sold pipeline items
    const soldItems = await prisma.pipelineItem.findMany({
      where: {
        OR: [
          { status: 'Sold' },
          { status: 'sold' },
          { status: 'SOLD' }
        ]
      },
      include: {
        activityLogs: {
          orderBy: { timestamp: 'asc' }
        }
      }
    });

    console.log(`📊 Found ${soldItems.length} sold items`);

    let updatedCount = 0;

    for (const item of soldItems) {
      console.log(`\n💰 Processing: ${item.name} (ID: ${item.id})`);
      
      // Find the deal closed activity log
      const dealClosedLog = item.activityLogs.find(log => 
        log.activityType === 'Deal_Closed' && log.description.includes('Deal closed:')
      );

      if (dealClosedLog) {
        // Update the notes field with the deal information and update lastUpdated timestamp
        const timelineNotes = `[${dealClosedLog.timestamp.toLocaleDateString('en-GB')}] ${dealClosedLog.activityType}: ${dealClosedLog.description}`;
        
        await prisma.pipelineItem.update({
          where: { id: item.id },
          data: { 
            notes: timelineNotes,
            lastUpdated: dealClosedLog.timestamp
          }
        });

        console.log(`✅ Updated notes with deal info and lastUpdated timestamp`);
        console.log(`   Notes: "${timelineNotes}"`);
        updatedCount++;
      } else {
        console.log(`⚠️  No deal closed activity log found for ${item.name}`);
      }
    }

    // Get all list out pipeline items
    const listOutItems = await prisma.pipelineItem.findMany({
      where: {
        OR: [
          { status: 'List Out' },
          { status: 'list out' },
          { status: 'LIST OUT' },
          { category: 'List Out' },
          { category: 'list out' },
          { category: 'LIST OUT' }
        ]
      },
      include: {
        activityLogs: {
          orderBy: { timestamp: 'asc' }
        }
      }
    });

    console.log(`\n📋 Found ${listOutItems.length} list out items`);

    for (const item of listOutItems) {
      console.log(`\n📋 Processing: ${item.name} (ID: ${item.id})`);
      
      if (item.activityLogs.length > 0) {
        // Use the most recent activity log for timeline notes and lastUpdated
        const latestLog = item.activityLogs[item.activityLogs.length - 1];
        const timelineNotes = `[${latestLog.timestamp.toLocaleDateString('en-GB')}] ${latestLog.activityType}: ${latestLog.description}`;
        
        await prisma.pipelineItem.update({
          where: { id: item.id },
          data: { 
            notes: timelineNotes,
            lastUpdated: latestLog.timestamp
          }
        });

        console.log(`✅ Updated notes with activity info and lastUpdated timestamp`);
        console.log(`   Notes: "${timelineNotes}"`);
        updatedCount++;
      } else {
        console.log(`⚠️  No activity logs found for ${item.name}`);
      }
    }

    console.log('\n📊 SUMMARY:');
    console.log('='.repeat(30));
    console.log(`Total sold items processed: ${soldItems.length}`);
    console.log(`Total list out items processed: ${listOutItems.length}`);
    console.log(`Successfully updated: ${updatedCount}`);

    if (updatedCount > 0) {
      console.log('\n✅ Timeline last updated fixes completed successfully!');
    } else {
      console.log('\nℹ️  No updates were needed.');
    }

  } catch (error) {
    console.error('Error fixing timeline last updated:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixTimelineLastUpdated()
  .catch(console.error); 