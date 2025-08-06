import { PrismaClient } from '@prisma/client';
import { faker } from '@faker-js/faker';
import { addDays, subDays, addWeeks, subWeeks, addMonths, subMonths, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';

const prisma = new PrismaClient();

const bdrs = [
  "Naeem Patel", "Jennifer Davies", "Jamie Waite", "Verity Kay", "Thomas Hardy",
  "Dan Reeves", "Gary Smith", "Thomas Corcoran", "Jess Collins", "Mark Cawston",
  "Adel Mhiri", "Stephen Vivian", "Rupert Kay"
];

const companies = [
  "TechCorp Solutions", "Digital Innovations Ltd", "Global Systems Inc", "NextGen Technologies",
  "Prime Business Group", "Elite Consulting", "Advanced Analytics", "Strategic Partners",
  "Innovation Hub", "Future Tech", "Enterprise Solutions", "Business Dynamics"
];

const industries = [
  "Technology", "Healthcare", "Finance", "Manufacturing", "Retail", "Education", 
  "Consulting", "Real Estate", "Marketing", "Legal", "Construction", "Hospitality"
];

function generateWorkingHoursDate(baseDate: Date): Date {
  const date = new Date(baseDate);
  // Set to working hours (9 AM - 6 PM), avoid weekends
  const dayOfWeek = date.getDay();
  if (dayOfWeek === 0) date.setDate(date.getDate() + 1); // Sunday -> Monday
  if (dayOfWeek === 6) date.setDate(date.getDate() + 2); // Saturday -> Monday
  
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

async function enhanceMonthlyDistribution() {
  console.log('📈 Enhancing Monthly Distribution to Meet Targets...\n');
  
  const now = new Date();
  const thisMonthStart = startOfMonth(now);
  const lastMonthStart = startOfMonth(subMonths(now, 1));
  const lastMonthEnd = endOfMonth(subMonths(now, 1));
  const twoMonthsAgoStart = startOfMonth(subMonths(now, 2));
  const twoMonthsAgoEnd = endOfMonth(subMonths(now, 2));
  
  // Monthly targets per BDR
  const monthlyTargets = {
    calls: 40,
    agreements: 12,
    lists: 4,
    sales: 2
  };
    
  const newPipelineItems = [];
  const newActivityLogs = [];
  
  // For each BDR, ensure they meet monthly targets across the last 3 months
  for (const bdr of bdrs) {
    console.log(`🎯 Enhancing data for ${bdr}...`);
    
    // Get current performance for this month
    const currentItems = await prisma.pipelineItem.findMany({
      where: {
        bdr: bdr,
        addedDate: {
          gte: thisMonthStart
        }
      }
    });
    
    const currentActivities = await prisma.activityLog.findMany({
      where: {
        bdr: bdr,
        timestamp: {
          gte: thisMonthStart
        }
      }
    });
    
    // Count current month activities
    const currentCallsThisMonth = currentActivities.filter(a => a.activityType === 'Call_Completed').length;
    const currentAgreementsThisMonth = currentActivities.filter(a => a.activityType === 'Agreement_Sent').length;
    const currentListsThisMonth = currentActivities.filter(a => a.activityType === 'Partner_List_Sent').length;
    const currentSalesThisMonth = currentItems.filter(i => i.status === 'Sold').length;
    
    // Calculate how many more we need to meet targets for THIS MONTH
    const callsNeeded = Math.max(0, monthlyTargets.calls - currentCallsThisMonth);
    const agreementsNeeded = Math.max(0, monthlyTargets.agreements - currentAgreementsThisMonth);
    const listsNeeded = Math.max(0, monthlyTargets.lists - currentListsThisMonth);
    const salesNeeded = Math.max(0, monthlyTargets.sales - currentSalesThisMonth);
    
    console.log(`  Current month gaps: Calls:${callsNeeded}, Agreements:${agreementsNeeded}, Lists:${listsNeeded}, Sales:${salesNeeded}`);
    
    // Generate additional items for THIS MONTH to meet targets
    for (let i = 0; i < callsNeeded; i++) {
      const callDate = generateRandomDate(thisMonthStart, now);
      const company = companies[Math.floor(Math.random() * companies.length)];
      const industry = industries[Math.floor(Math.random() * industries.length)];
      
      // Determine outcome - higher success rate to ensure we meet other targets
      let status = "Call Conducted";
      let category = "Calls";
      let probability = 30;
      let value = null;
      let agreementDate = null;
      let partnerListSentDate = null;
      let firstSaleDate = null;
      let partnerListSize = null;
      
      // Ensure we create enough agreements, lists, and sales
      const outcome = Math.random();
      if (i < agreementsNeeded) {
        // Force agreement for needed agreements
        status = Math.random() > 0.5 ? "Agreement - Media" : "Agreement - Profile";
        category = "Pipeline";
        probability = 85;
        value = 8000 + Math.random() * 20000;
        agreementDate = addDays(callDate, 1 + Math.random() * 3);
      }
      
      if (i < listsNeeded) {
        // Force partner list for needed lists
        status = "Partner List Sent";
        category = "Lists_Media_QA";
        probability = 95;
        value = 10000 + Math.random() * 25000;
        agreementDate = addDays(callDate, 1 + Math.random() * 2);
        partnerListSentDate = addDays(agreementDate, 1 + Math.random() * 2);
        partnerListSize = 8 + Math.floor(Math.random() * 10);
      }
      
      if (i < salesNeeded) {
        // Force sale for needed sales
        status = "Sold";
        category = "Lists_Media_QA";
        probability = 100;
        value = 12000 + Math.random() * 30000;
        agreementDate = addDays(callDate, 1 + Math.random() * 2);
        partnerListSentDate = addDays(agreementDate, 1 + Math.random() * 2);
        partnerListSize = 10 + Math.floor(Math.random() * 8);
        firstSaleDate = addDays(partnerListSentDate, 3 + Math.random() * 10);
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
        expectedCloseDate: firstSaleDate || addDays(callDate, 14 + Math.random() * 21),
        agreementDate: agreementDate,
        partnerListSentDate: partnerListSentDate,
        firstSaleDate: firstSaleDate,
        partnerListSize: partnerListSize,
        totalSalesFromList: firstSaleDate ? 1 + Math.floor(Math.random() * 2) : null,
        notes: `${industry} opportunity for ${bdr}. Enhanced for target achievement.`,
        parentId: null,
        isSublist: false,
        sortOrder: Math.floor(Math.random() * 1000)
      };
      
      newPipelineItems.push(pipelineItem);
      
      // Create corresponding activity logs
      newActivityLogs.push({
        timestamp: callDate,
        bdr: bdr,
        activityType: "Call_Completed",
        description: `Call completed with ${pipelineItem.name}`,
        notes: `Monthly target enhancement call. Outcome: ${status}`,
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
          notes: `Agreement worth £${value?.toFixed(0)} sent`,
          previousStatus: "Call Conducted",
          newStatus: status,
          pipelineItemId: null
        });
      }
      
      if (partnerListSentDate) {
        newActivityLogs.push({
          timestamp: partnerListSentDate,
          bdr: bdr,
          activityType: "Partner_List_Sent",
          description: `Partner list sent to ${pipelineItem.name}`,
          notes: `Partner list with ${partnerListSize} partners sent`,
          previousStatus: status.replace('List Sent', 'List Pending'),
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
          notes: `Sale worth £${value?.toFixed(0)} recorded!`,
          previousStatus: "Partner List Sent",
          newStatus: "Sold",
          pipelineItemId: null
        });
      }
    }
    
    // Also generate strong performance for LAST MONTH to show consistency
    const lastMonthCallsNeeded = monthlyTargets.calls + Math.floor(Math.random() * 5); // Slightly above target
    const lastMonthAgreementsNeeded = monthlyTargets.agreements + Math.floor(Math.random() * 3);
    const lastMonthListsNeeded = monthlyTargets.lists + Math.floor(Math.random() * 2);
    const lastMonthSalesNeeded = monthlyTargets.sales + Math.floor(Math.random() * 2);
    
    for (let i = 0; i < lastMonthCallsNeeded; i++) {
      const callDate = generateRandomDate(lastMonthStart, lastMonthEnd);
      const company = companies[Math.floor(Math.random() * companies.length)];
      const industry = industries[Math.floor(Math.random() * industries.length)];
      
      let status = "Call Conducted";
      let category = "Calls";
      let probability = 30;
      let value = null;
      let agreementDate = null;
      let partnerListSentDate = null;
      let firstSaleDate = null;
      let partnerListSize = null;
      
      // Create proportional success for last month
      if (i < lastMonthAgreementsNeeded) {
        status = Math.random() > 0.5 ? "Agreement - Media" : "Agreement - Profile";
        category = "Pipeline";
        probability = 85;
        value = 8000 + Math.random() * 20000;
        agreementDate = addDays(callDate, 1 + Math.random() * 3);
      }
      
      if (i < lastMonthListsNeeded) {
        status = "Partner List Sent";
        category = "Lists_Media_QA";
        probability = 95;
        value = 10000 + Math.random() * 25000;
        agreementDate = addDays(callDate, 1 + Math.random() * 2);
        partnerListSentDate = addDays(agreementDate, 1 + Math.random() * 2);
        partnerListSize = 8 + Math.floor(Math.random() * 10);
      }
      
      if (i < lastMonthSalesNeeded) {
        status = "Sold";
        category = "Lists_Media_QA";
        probability = 100;
        value = 12000 + Math.random() * 30000;
        agreementDate = addDays(callDate, 1 + Math.random() * 2);
        partnerListSentDate = addDays(agreementDate, 1 + Math.random() * 2);
        partnerListSize = 10 + Math.floor(Math.random() * 8);
        const maxSaleDate = Math.min(lastMonthEnd.getTime(), addDays(partnerListSentDate, 14).getTime());
        firstSaleDate = new Date(partnerListSentDate.getTime() + Math.random() * (maxSaleDate - partnerListSentDate.getTime()));
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
        expectedCloseDate: firstSaleDate || addDays(callDate, 14 + Math.random() * 21),
        agreementDate: agreementDate,
        partnerListSentDate: partnerListSentDate,
        firstSaleDate: firstSaleDate,
        partnerListSize: partnerListSize,
        totalSalesFromList: firstSaleDate ? 1 + Math.floor(Math.random() * 2) : null,
        notes: `${industry} opportunity for ${bdr}. Last month performance boost.`,
        parentId: null,
        isSublist: false,
        sortOrder: Math.floor(Math.random() * 1000)
      };
      
      newPipelineItems.push(pipelineItem);
      
      // Create activity logs for last month
      newActivityLogs.push({
        timestamp: callDate,
        bdr: bdr,
        activityType: "Call_Completed",
        description: `Call completed with ${pipelineItem.name}`,
        notes: `Last month performance call. Great outcome: ${status}`,
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
          notes: `Strong agreement worth £${value?.toFixed(0)}`,
          previousStatus: "Call Conducted",
          newStatus: status,
          pipelineItemId: null
        });
      }
      
      if (partnerListSentDate) {
        newActivityLogs.push({
          timestamp: partnerListSentDate,
          bdr: bdr,
          activityType: "Partner_List_Sent",
          description: `Partner list sent to ${pipelineItem.name}`,
          notes: `High-quality partner list with ${partnerListSize} partners`,
          previousStatus: status.replace('List Sent', 'List Pending'),
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
          notes: `Excellent sale worth £${value?.toFixed(0)}!`,
          previousStatus: "Partner List Sent",
          newStatus: "Sold",
          pipelineItemId: null
        });
      }
    }
  }
  
  // Create all new pipeline items and activities
  if (newPipelineItems.length > 0) {
    await prisma.pipelineItem.createMany({ data: newPipelineItems });
    console.log(`✅ Added ${newPipelineItems.length} pipeline items`);
  }
  
  if (newActivityLogs.length > 0) {
    await prisma.activityLog.createMany({ data: newActivityLogs });
    console.log(`✅ Added ${newActivityLogs.length} activity logs`);
  }
  
  // Final summary
  const totalLeads = await prisma.lead.count();
  const totalPipeline = await prisma.pipelineItem.count();
  const totalActivities = await prisma.activityLog.count();
  const totalSold = await prisma.pipelineItem.count({ where: { status: 'Sold' } });
  
  console.log('\n🎉 Enhancement Complete!');
  console.log('========================');
  console.log(`📊 Total Leads: ${totalLeads}`);
  console.log(`📈 Total Pipeline Items: ${totalPipeline}`);
  console.log(`📋 Total Activity Logs: ${totalActivities}`);
  console.log(`🏆 Total Sold Items: ${totalSold}`);
  console.log('\n🎯 All BDRs should now consistently meet monthly targets!');
}

async function main() {
  try {
    await enhanceMonthlyDistribution();
  } catch (error) {
    console.error('Error enhancing monthly distribution:', error);
    throw error;
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());