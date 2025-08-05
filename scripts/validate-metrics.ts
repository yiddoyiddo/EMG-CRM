import { PrismaClient } from '@prisma/client';
import { 
  startOfWeek, endOfWeek, startOfMonth, endOfMonth, 
  subWeeks, subMonths, format, startOfDay, endOfDay, subDays, addWeeks 
} from 'date-fns';

const prisma = new PrismaClient();

async function validateMetrics() {
  try {
    console.log('=== DATABASE OVERVIEW ===');
    const leadCount = await prisma.lead.count();
    const pipelineCount = await prisma.pipelineItem.count();
    const activityCount = await prisma.activityLog.count();
    
    console.log('Total Leads:', leadCount);
    console.log('Total Pipeline Items:', pipelineCount);
    console.log('Total Activity Logs:', activityCount);
    
    if (pipelineCount === 0) {
      console.log('\n❌ No pipeline items found! Metrics will be empty.');
      return;
    }

    // Get all pipeline items
    const allItems = await prisma.pipelineItem.findMany({
      select: {
        id: true,
        category: true,
        status: true,
        bdr: true,
        callDate: true,
        value: true,
        addedDate: true,
        lastUpdated: true,
        probability: true
      }
    });

    console.log('\n=== CATEGORY BREAKDOWN ===');
    const categoryGroups = allItems.reduce((acc, item) => {
      acc[item.category] = (acc[item.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    Object.entries(categoryGroups).forEach(([category, count]) => {
      console.log(`${category}: ${count}`);
    });

    console.log('\n=== STATUS BREAKDOWN ===');
    const statusGroups = allItems.reduce((acc, item) => {
      acc[item.status] = (acc[item.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    Object.entries(statusGroups).forEach(([status, count]) => {
      console.log(`${status}: ${count}`);
    });

    console.log('\n=== BDR BREAKDOWN ===');
    const bdrGroups = allItems.reduce((acc, item) => {
      acc[item.bdr] = (acc[item.bdr] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    Object.entries(bdrGroups).forEach(([bdr, count]) => {
      console.log(`${bdr}: ${count}`);
    });

    // Date calculations
    const now = new Date();
    const thisWeekStart = startOfWeek(now, { weekStartsOn: 1 });
    const thisWeekEnd = endOfWeek(now, { weekStartsOn: 1 });
    const lastWeekStart = startOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });
    const lastWeekEnd = endOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });
    const nextWeekStart = startOfWeek(addWeeks(now, 1), { weekStartsOn: 1 });
    const nextWeekEnd = endOfWeek(addWeeks(now, 1), { weekStartsOn: 1 });
    const monthStart = startOfMonth(now);

    console.log('\n=== DATE RANGES ===');
    console.log('This Week:', format(thisWeekStart, 'yyyy-MM-dd'), 'to', format(thisWeekEnd, 'yyyy-MM-dd'));
    console.log('Last Week:', format(lastWeekStart, 'yyyy-MM-dd'), 'to', format(lastWeekEnd, 'yyyy-MM-dd'));
    console.log('Next Week:', format(nextWeekStart, 'yyyy-MM-dd'), 'to', format(nextWeekEnd, 'yyyy-MM-dd'));

    // Test metric calculations
    console.log('\n=== TESTING METRIC CALCULATIONS ===');

    // Test call metrics
    const callItems = allItems.filter(item => item.category === 'Calls');
    console.log(`\nCall Items (category="Calls"): ${callItems.length}`);
    
    const callsWithDates = callItems.filter(item => item.callDate);
    console.log(`Calls with dates: ${callsWithDates.length}`);
    
    const callsThisWeek = callItems.filter(item => 
      item.callDate && item.callDate >= thisWeekStart && item.callDate <= thisWeekEnd
    );
    console.log(`Calls this week: ${callsThisWeek.length}`);
    
    const callsLastWeek = callItems.filter(item => 
      item.callDate && item.callDate >= lastWeekStart && item.callDate <= lastWeekEnd
    );
    console.log(`Calls last week: ${callsLastWeek.length}`);
    
    const futureCalls = callItems.filter(item => 
      item.callDate && item.callDate > now
    );
    console.log(`Future calls: ${futureCalls.length}`);

    // Test proposal metrics
    const proposalItems = allItems.filter(item => 
      item.status && (item.status.includes('Proposal') || item.status.includes('proposal'))
    );
    console.log(`\nProposal Items (status contains "Proposal"): ${proposalItems.length}`);
    
    const profileProposals = proposalItems.filter(item => 
      item.status.includes('Profile')
    );
    console.log(`Profile proposals: ${profileProposals.length}`);
    
    const mediaProposals = proposalItems.filter(item => 
      item.status.includes('Media')
    );
    console.log(`Media proposals: ${mediaProposals.length}`);

    // Test agreement metrics
    const agreementItems = allItems.filter(item => 
      item.status && (item.status.includes('Agreement') || item.status.includes('agreement'))
    );
    console.log(`\nAgreement Items (status contains "Agreement"): ${agreementItems.length}`);

    // Test list metrics
    const listItems = allItems.filter(item => 
      item.category === 'Lists_Media_QA' || item.category === 'Lists'
    );
    console.log(`\nList Items (category="Lists_Media_QA" or "Lists"): ${listItems.length}`);

    // Check for value data
    const itemsWithValue = allItems.filter(item => item.value && item.value > 0);
    console.log(`\nItems with value data: ${itemsWithValue.length}`);
    if (itemsWithValue.length > 0) {
      const totalValue = itemsWithValue.reduce((sum, item) => sum + (item.value || 0), 0);
      const avgValue = totalValue / itemsWithValue.length;
      console.log(`Total value: $${totalValue.toLocaleString()}`);
      console.log(`Average value: $${avgValue.toLocaleString()}`);
    }

    // Check for probability data
    const itemsWithProbability = allItems.filter(item => item.probability && item.probability > 0);
    console.log(`\nItems with probability data: ${itemsWithProbability.length}`);

    // Sample data
    console.log('\n=== SAMPLE PIPELINE ITEMS ===');
    const sampleItems = allItems.slice(0, 5);
    sampleItems.forEach((item, index) => {
      console.log(`${index + 1}. ${item.bdr} - ${item.category} - ${item.status}`);
      console.log(`   Call Date: ${item.callDate ? format(item.callDate, 'yyyy-MM-dd') : 'None'}`);
      console.log(`   Value: ${item.value ? '$' + item.value.toLocaleString() : 'None'}`);
      console.log(`   Added: ${format(item.addedDate, 'yyyy-MM-dd')}`);
    });

    // Activity logs
    if (activityCount > 0) {
      const activities = await prisma.activityLog.findMany({
        take: 5,
        select: {
          activityType: true,
          bdr: true,
          timestamp: true,
          description: true
        }
      });
      
      console.log('\n=== SAMPLE ACTIVITY LOGS ===');
      activities.forEach((activity, index) => {
        console.log(`${index + 1}. ${activity.bdr} - ${activity.activityType}`);
        console.log(`   ${format(activity.timestamp, 'yyyy-MM-dd HH:mm')}: ${activity.description?.substring(0, 50) || ''}...`);
      });
    }

    console.log('\n=== VALIDATION SUMMARY ===');
    console.log('✅ Database connection working');
    console.log(`✅ ${leadCount} leads found`);
    console.log(`${pipelineCount > 0 ? '✅' : '❌'} ${pipelineCount} pipeline items found`);
    console.log(`${activityCount > 0 ? '✅' : '❌'} ${activityCount} activity logs found`);
    console.log(`${callItems.length > 0 ? '✅' : '❌'} Call items found: ${callItems.length}`);
    console.log(`${proposalItems.length > 0 ? '✅' : '❌'} Proposal items found: ${proposalItems.length}`);
    console.log(`${agreementItems.length > 0 ? '✅' : '❌'} Agreement items found: ${agreementItems.length}`);
    console.log(`${itemsWithValue.length > 0 ? '❌' : '⚠️'} Items with value data: ${itemsWithValue.length} (Revenue metrics disabled)`);

  } catch (error) {
    console.error('❌ Error validating metrics:', error);
  } finally {
    await prisma.$disconnect();
  }
}

validateMetrics(); 