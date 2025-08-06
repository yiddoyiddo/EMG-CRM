import { PrismaClient } from '@prisma/client';
import { faker } from '@faker-js/faker';
import { addDays, subDays, addWeeks, subWeeks, addMonths, subMonths, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';

const prisma = new PrismaClient();

const companies = [
  "TechCorp Solutions", "Digital Innovations Ltd", "Global Systems Inc", "NextGen Technologies",
  "Prime Business Group", "Elite Consulting", "Advanced Analytics", "Strategic Partners"
];

const industries = [
  "Technology", "Healthcare", "Finance", "Manufacturing", "Retail", "Education", 
  "Consulting", "Real Estate", "Marketing", "Legal"
];

const bdrs = [
  "Naeem Patel", "Jennifer Davies", "Jamie Waite", "Verity Kay", "Thomas Hardy",
  "Dan Reeves", "Gary Smith", "Thomas Corcoran", "Jess Collins", "Mark Cawston",
  "Adel Mhiri", "Stephen Vivian", "Rupert Kay"
];

function generateWorkingHoursDate(baseDate: Date): Date {
  const date = new Date(baseDate);
  const dayOfWeek = date.getDay();
  if (dayOfWeek === 0) date.setDate(date.getDate() + 1);
  if (dayOfWeek === 6) date.setDate(date.getDate() + 2);
  
  date.setHours(9 + Math.floor(Math.random() * 9));
  date.setMinutes(Math.floor(Math.random() * 60));
  return date;
}

function generateRandomDate(startDate: Date, endDate: Date): Date {
  const startTime = startDate.getTime();
  const endTime = endDate.getTime();
  const randomTime = startTime + Math.random() * (endTime - startTime);
  return generateWorkingHoursDate(new Date(randomTime));
}

async function fineTuneKPIData() {
  console.log('🎯 Fine-tuning KPI data to be closer to targets...\n');
  
  const now = new Date();
  const thisWeekStart = startOfWeek(now, { weekStartsOn: 1 });
  const thisMonthStart = startOfMonth(now);
  
  // Get current data
  const currentPipeline = await prisma.pipelineItem.findMany();
  const currentActivities = await prisma.activityLog.findMany();
  
  // Calculate what we need to adjust
  console.log('📊 Analyzing current performance gaps...');
  
  // STEP 1: Reduce excessive weekly performance by removing some activities
  const thisWeekActivities = currentActivities.filter(a => 
    a.timestamp >= thisWeekStart && a.timestamp <= now
  );
  
  const excessiveThisWeekCalls = thisWeekActivities.filter(a => a.activityType === 'Call_Completed');
  const excessiveThisWeekAgreements = thisWeekActivities.filter(a => a.activityType === 'Agreement_Sent');
  const excessiveThisWeekLists = thisWeekActivities.filter(a => a.activityType === 'Partner_List_Sent');
  
  // Target: 130 calls, currently ~211, so remove ~60 calls (keep ~150 for slight over-performance)
  const callsToRemove = Math.max(0, excessiveThisWeekCalls.length - 150);
  const agreementsToRemove = Math.max(0, excessiveThisWeekAgreements.length - 45); // Target 39, keep ~45
  const listsToRemove = Math.max(0, excessiveThisWeekLists.length - 15); // Target 13, keep ~15
  
  if (callsToRemove > 0) {
    const callsToDelete = excessiveThisWeekCalls.slice(0, callsToRemove).map(a => a.id);
    await prisma.activityLog.deleteMany({
      where: { id: { in: callsToDelete } }
    });
    console.log(`🗑️ Removed ${callsToRemove} excessive this week calls`);
  }
  
  if (agreementsToRemove > 0) {
    const agreementsToDelete = excessiveThisWeekAgreements.slice(0, agreementsToRemove).map(a => a.id);
    await prisma.activityLog.deleteMany({
      where: { id: { in: agreementsToDelete } }
    });
    console.log(`🗑️ Removed ${agreementsToRemove} excessive this week agreements`);
  }
  
  if (listsToRemove > 0) {
    const listsToDelete = excessiveThisWeekLists.slice(0, listsToRemove).map(a => a.id);
    await prisma.activityLog.deleteMany({
      where: { id: { in: listsToDelete } }
    });
    console.log(`🗑️ Removed ${listsToRemove} excessive this week lists`);
  }
  
  // STEP 2: Add more monthly data to reach monthly targets
  const thisMonthActivities = await prisma.activityLog.findMany({
    where: {
      timestamp: {
        gte: thisMonthStart,
        lte: now
      }
    }
  });
  
  const thisMonthCalls = thisMonthActivities.filter(a => a.activityType === 'Call_Completed').length;
  const thisMonthAgreements = thisMonthActivities.filter(a => a.activityType === 'Agreement_Sent').length;
  const thisMonthLists = thisMonthActivities.filter(a => a.activityType === 'Partner_List_Sent').length;
  
  // Target: 520 calls, 156 agreements, 52 lists
  const monthlyCallsNeeded = Math.max(0, 480 - thisMonthCalls); // Aim for 480 (close to 520)
  const monthlyAgreementsNeeded = Math.max(0, 140 - thisMonthAgreements); // Aim for 140 (close to 156)
  const monthlyListsNeeded = Math.max(0, 45 - thisMonthLists); // Aim for 45 (close to 52)
  
  console.log(`📈 Need to add: ${monthlyCallsNeeded} calls, ${monthlyAgreementsNeeded} agreements, ${monthlyListsNeeded} lists`);
  
  const newPipelineItems = [];
  const newActivityLogs = [];
  
  // Distribute the needed activities across BDRs and time periods
  const callsPerBDR = Math.ceil(monthlyCallsNeeded / bdrs.length);
  const agreementsPerBDR = Math.ceil(monthlyAgreementsNeeded / bdrs.length);
  const listsPerBDR = Math.ceil(monthlyListsNeeded / bdrs.length);
  
  for (const bdr of bdrs) {
    // Add calls earlier in the month to boost monthly totals
    const callsToAdd = Math.min(callsPerBDR, Math.max(0, monthlyCallsNeeded / bdrs.length));
    const agreementsToAdd = Math.min(agreementsPerBDR, Math.max(0, monthlyAgreementsNeeded / bdrs.length));
    const listsToAdd = Math.min(listsPerBDR, Math.max(0, monthlyListsNeeded / bdrs.length));
    
    if (callsToAdd <= 0) continue;
    
    for (let i = 0; i < callsToAdd; i++) {
      // Create calls earlier in the month (avoid this week to not inflate weekly numbers)
      const callDate = generateRandomDate(thisMonthStart, subDays(thisWeekStart, 1));
      const company = companies[Math.floor(Math.random() * companies.length)];
      const industry = industries[Math.floor(Math.random() * industries.length)];
      
      let status = "Call Conducted";
      let category = "Calls";
      let probability = 35;
      let value = null;
      let agreementDate = null;
      let partnerListSentDate = null;
      let firstSaleDate = null;
      let partnerListSize = null;
      
      // Create agreements and lists as needed
      if (i < agreementsToAdd && Math.random() < 0.6) {
        status = Math.random() > 0.5 ? "Agreement - Media" : "Agreement - Profile";
        category = "Pipeline";
        probability = 75;
        value = 8000 + Math.random() * 15000;
        agreementDate = addDays(callDate, 1 + Math.random() * 2);
      }
      
      if (i < listsToAdd && agreementDate) {
        status = "Partner List Sent";
        category = "Lists_Media_QA";
        probability = 90;
        partnerListSentDate = addDays(agreementDate, 1 + Math.random() * 2);
        partnerListSize = 6 + Math.floor(Math.random() * 8);
      }
      
      // Some sales to boost monthly numbers
      if (partnerListSentDate && Math.random() < 0.3) {
        status = "Sold";
        probability = 100;
        firstSaleDate = addDays(partnerListSentDate, 3 + Math.random() * 7);
        value = (value || 10000) + Math.random() * 10000;
      }
      
      const pipelineItem = {
        name: faker.person.fullName(),
        title: faker.person.jobTitle(),
        email: faker.internet.email(),
        phone: faker.phone.number(),
        company: `${company} (${industry})`,
        bdr: bdr,
        category: category,
        status: status,
        value: value,
        probability: probability,
        callDate: callDate,
        addedDate: callDate,
        lastUpdated: firstSaleDate || partnerListSentDate || agreementDate || callDate,
        expectedCloseDate: agreementDate ? addWeeks(agreementDate, 2) : null,
        agreementDate: agreementDate,
        partnerListSentDate: partnerListSentDate,
        firstSaleDate: firstSaleDate,
        partnerListSize: partnerListSize,
        totalSalesFromList: firstSaleDate ? 1 : null,
        notes: `Monthly target booster - ${industry} opportunity`,
        parentId: null,
        isSublist: false,
        sortOrder: Math.floor(Math.random() * 1000)
      };
      
      newPipelineItems.push(pipelineItem);
      
      // Create activity logs
      newActivityLogs.push({
        timestamp: callDate,
        bdr: bdr,
        activityType: "Call_Completed",
        description: `Call completed with ${pipelineItem.name}`,
        notes: `Monthly booster call - outcome: ${status}`,
        previousStatus: "Call Booked",
        newStatus: status,
        pipelineItemId: null
      });
      
      if (agreementDate) {
        newActivityLogs.push({
          timestamp: agreementDate,
          bdr: bdr,
          activityType: "Agreement_Sent",
          description: `Agreement sent to ${pipelineItem.name}`,
          notes: `Monthly booster agreement worth £${value?.toFixed(0)}`,
          previousStatus: "Call Conducted",
          newStatus: status.includes('Agreement') ? status : "Agreement - Profile",
          pipelineItemId: null
        });
      }
      
      if (partnerListSentDate) {
        newActivityLogs.push({
          timestamp: partnerListSentDate,
          bdr: bdr,
          activityType: "Partner_List_Sent",
          description: `Partner list sent to ${pipelineItem.name}`,
          notes: `Monthly booster list with ${partnerListSize} partners`,
          previousStatus: "Agreement - Profile",
          newStatus: "Partner List Sent",
          pipelineItemId: null
        });
      }
      
      if (firstSaleDate) {
        newActivityLogs.push({
          timestamp: firstSaleDate,
          bdr: bdr,
          activityType: "Sale_Recorded",
          description: `Sale recorded for ${pipelineItem.name}`,
          notes: `Monthly booster sale worth £${value?.toFixed(0)}`,
          previousStatus: "Partner List Sent",
          newStatus: "Sold",
          pipelineItemId: null
        });
      }
    }
  }
  
  // Create the new data
  if (newPipelineItems.length > 0) {
    await prisma.pipelineItem.createMany({ data: newPipelineItems });
    console.log(`✅ Added ${newPipelineItems.length} pipeline items to boost monthly performance`);
  }
  
  if (newActivityLogs.length > 0) {
    await prisma.activityLog.createMany({ data: newActivityLogs });
    console.log(`✅ Added ${newActivityLogs.length} activity logs to boost monthly performance`);
  }
  
  // Final summary
  const finalLeads = await prisma.lead.count();
  const finalPipeline = await prisma.pipelineItem.count();
  const finalActivities = await prisma.activityLog.count();
  const finalSold = await prisma.pipelineItem.count({ where: { status: 'Sold' } });
  
  console.log('\n🎯 Fine-tuning Complete!');
  console.log('========================');
  console.log(`📊 Final Leads: ${finalLeads}`);
  console.log(`📈 Final Pipeline Items: ${finalPipeline}`);
  console.log(`📋 Final Activity Logs: ${finalActivities}`);
  console.log(`🏆 Final Sold Items: ${finalSold}`);
  console.log('\n✨ KPIs should now be much closer to targets!');
  console.log('📊 Weekly: Slightly above targets (105-115%)');
  console.log('📅 Monthly: Close to targets (85-95%)');
}

async function main() {
  try {
    await fineTuneKPIData();
  } catch (error) {
    console.error('Error fine-tuning KPI data:', error);
    throw error;
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());