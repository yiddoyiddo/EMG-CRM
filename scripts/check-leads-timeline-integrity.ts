import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkLeadsTimelineIntegrity() {
  try {
    console.log('🔍 Checking leads timeline integrity...\n');

    // Get all leads with status "List Out" or "Sold"
    const listOutLeads = await prisma.lead.findMany({
      where: {
        status: 'List Out'
      },
      include: {
        activityLogs: {
          orderBy: { timestamp: 'asc' }
        }
      }
    });

    const soldLeads = await prisma.lead.findMany({
      where: {
        status: 'Sold'
      },
      include: {
        activityLogs: {
          orderBy: { timestamp: 'asc' }
        }
      }
    });

    console.log(`📊 Found ${listOutLeads.length} leads with "List Out" status`);
    console.log(`📊 Found ${soldLeads.length} leads with "Sold" status\n`);

    let listOutIssues = 0;
    let soldIssues = 0;

    // Check List Out leads
    console.log('🔍 Checking List Out leads:');
    console.log('='.repeat(50));
    
    for (const lead of listOutLeads) {
      console.log(`\n📋 Lead: ${lead.name} (ID: ${lead.id})`);
      console.log(`   Company: ${lead.company || 'N/A'}`);
      console.log(`   BDR: ${lead.bdr || 'N/A'}`);
      console.log(`   Notes: ${lead.notes ? lead.notes.substring(0, 100) + '...' : 'No notes'}`);
      
      if (lead.activityLogs.length === 0) {
        console.log(`   ❌ NO ACTIVITY LOGS FOUND`);
        listOutIssues++;
      } else {
        console.log(`   ✅ Activity logs: ${lead.activityLogs.length}`);
        lead.activityLogs.forEach((log, index) => {
          console.log(`      ${index + 1}. [${log.timestamp.toLocaleDateString()}] ${log.activityType}: ${log.description}`);
        });
      }
    }

    // Check Sold leads
    console.log('\n🔍 Checking Sold leads:');
    console.log('='.repeat(50));
    
    for (const lead of soldLeads) {
      console.log(`\n💰 Lead: ${lead.name} (ID: ${lead.id})`);
      console.log(`   Company: ${lead.company || 'N/A'}`);
      console.log(`   BDR: ${lead.bdr || 'N/A'}`);
      console.log(`   Notes: ${lead.notes ? lead.notes.substring(0, 100) + '...' : 'No notes'}`);
      
      if (lead.activityLogs.length === 0) {
        console.log(`   ❌ NO ACTIVITY LOGS FOUND`);
        soldIssues++;
      } else {
        console.log(`   ✅ Activity logs: ${lead.activityLogs.length}`);
        lead.activityLogs.forEach((log, index) => {
          console.log(`      ${index + 1}. [${log.timestamp.toLocaleDateString()}] ${log.activityType}: ${log.description}`);
        });
      }

      // Check if sold leads mention deal amounts in notes
      const hasDealAmount = lead.notes && (
        lead.notes.toLowerCase().includes('deal') ||
        lead.notes.toLowerCase().includes('amount') ||
        lead.notes.toLowerCase().includes('value') ||
        lead.notes.toLowerCase().includes('£') ||
        lead.notes.toLowerCase().includes('$') ||
        /\d+/.test(lead.notes)
      );

      if (!hasDealAmount) {
        console.log(`   ⚠️  No deal amount mentioned in notes`);
        soldIssues++;
      } else {
        console.log(`   ✅ Deal amount mentioned in notes`);
      }
    }

    // Summary
    console.log('\n📊 SUMMARY:');
    console.log('='.repeat(50));
    console.log(`List Out leads with issues: ${listOutIssues}/${listOutLeads.length}`);
    console.log(`Sold leads with issues: ${soldIssues}/${soldLeads.length}`);
    console.log(`Total issues found: ${listOutIssues + soldIssues}`);

    if (listOutIssues === 0 && soldIssues === 0) {
      console.log('\n✅ All leads have proper timeline and activity logs!');
    } else {
      console.log('\n❌ Issues found that need to be addressed.');
    }

  } catch (error) {
    console.error('Error checking leads timeline integrity:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkLeadsTimelineIntegrity()
  .catch(console.error); 