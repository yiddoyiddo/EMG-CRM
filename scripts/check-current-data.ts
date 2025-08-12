import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkCurrentData() {
  try {
    console.log('=== Database State Check ===\n');

    // Check Users
    console.log('1. Users:');
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true
      }
    });
    
    if (users.length === 0) {
      console.log('  ❌ No users found in database');
    } else {
      console.log(`  ✅ Found ${users.length} users:`);
      users.forEach(user => {
        console.log(`    - ${user.name} (${user.email}) - Role: ${user.role}`);
      });
    }

    // Check Leads
    console.log('\n2. Leads:');
    const leads = await prisma.lead.findMany({
      select: {
        id: true,
        name: true,
        company: true,
        email: true,
        status: true,
        bdr: true,
        bdrId: true
      },
      take: 5
    });
    
    if (leads.length === 0) {
      console.log('  ❌ No leads found in database');
    } else {
      console.log(`  ✅ Found ${leads.length} leads (showing first 5):`);
      leads.forEach(lead => {
        console.log(`    - ${lead.name} (${lead.company}) - Status: ${lead.status} - BDR: ${lead.bdr || 'None'} - BDR ID: ${lead.bdrId || 'None'}`);
      });
    }

    // Check total lead count
    const totalLeads = await prisma.lead.count();
    console.log(`  Total leads in database: ${totalLeads}`);

    // Check Pipeline Items
    console.log('\n3. Pipeline Items:');
    const pipelineItems = await prisma.pipelineItem.findMany({
      select: {
        id: true,
        name: true,
        status: true,
        bdr: true,
        bdrId: true
      },
      take: 5
    });
    
    if (pipelineItems.length === 0) {
      console.log('  ❌ No pipeline items found in database');
    } else {
      console.log(`  ✅ Found ${pipelineItems.length} pipeline items (showing first 5):`);
      pipelineItems.forEach(item => {
        console.log(`    - ${item.name} - Status: ${item.status} - BDR: ${item.bdr || 'None'} - BDR ID: ${item.bdrId || 'None'}`);
      });
    }

    // Check total pipeline count
    const totalPipeline = await prisma.pipelineItem.count();
    console.log(`  Total pipeline items in database: ${totalPipeline}`);

    // Check Finance Entries
    console.log('\n4. Finance Entries:');
    const financeEntries = await prisma.financeEntry.findMany({
      select: {
        id: true,
        company: true,
        soldAmount: true,
        status: true,
        bdr: true,
        bdrId: true
      },
      take: 5
    });
    
    if (financeEntries.length === 0) {
      console.log('  ❌ No finance entries found in database');
    } else {
      console.log(`  ✅ Found ${financeEntries.length} finance entries (showing first 5):`);
      financeEntries.forEach(entry => {
        console.log(`    - ${entry.company} - Amount: ${entry.soldAmount} - Status: ${entry.status} - BDR: ${entry.bdr || 'None'} - BDR ID: ${entry.bdrId || 'None'}`);
      });
    }

    // Check total finance count
    const totalFinance = await prisma.financeEntry.count();
    console.log(`  Total finance entries in database: ${totalFinance}`);

    // Check Activity Logs
    console.log('\n5. Activity Logs:');
    const activityLogs = await prisma.activityLog.findMany({
      select: {
        id: true,
        activityType: true,
        description: true,
        bdr: true,
        bdrId: true
      },
      take: 5
    });
    
    if (activityLogs.length === 0) {
      console.log('  ❌ No activity logs found in database');
    } else {
      console.log(`  ✅ Found ${activityLogs.length} activity logs (showing first 5):`);
      activityLogs.forEach(log => {
        console.log(`    - ${log.activityType}: ${log.description} - BDR: ${log.bdr || 'None'} - BDR ID: ${log.bdrId || 'None'}`);
      });
    }

    // Check total activity logs count
    const totalActivityLogs = await prisma.activityLog.count();
    console.log(`  Total activity logs in database: ${totalActivityLogs}`);

    console.log('\n=== End Database State Check ===');

  } catch (error) {
    console.error('Error checking database state:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkCurrentData(); 