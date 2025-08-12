import { PrismaClient } from '@prisma/client';
import { faker } from '@faker-js/faker';
import { addDays, subDays, addWeeks, subWeeks, addMonths, subMonths, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';

const prisma = new PrismaClient();

const companies = [
  "TechCorp Solutions", "Digital Innovations Ltd", "Global Systems Inc", "NextGen Technologies",
  "Prime Business Group", "Elite Consulting", "Advanced Analytics", "Strategic Partners",
  "Innovation Hub", "Future Tech", "Enterprise Solutions", "Business Dynamics",
  "Smart Systems", "Data Solutions", "Growth Partners", "Performance Group"
];

const industries = [
  "Technology", "Healthcare", "Finance", "Manufacturing", "Retail", "Education", 
  "Consulting", "Real Estate", "Marketing", "Legal", "Construction", "Hospitality"
];

const sources = [
  "LinkedIn", "Cold Email", "Website Form", "Referral", "Trade Show", "Cold Call",
  "Social Media", "Partner", "Webinar", "Content Marketing"
];

const bdrs = [
  "Naeem Patel", "Jennifer Davies", "Jamie Waite", "Verity Kay", "Thomas Hardy",
  "Dan Reeves", "Gary Smith", "Thomas Corcoran", "Jess Collins", "Mark Cawston",
  "Adel Mhiri", "Stephen Vivian", "Rupert Kay"
];

// Realistic targets - aiming for close to targets, not massively over
const weeklyTargetsPerBDR = {
  calls: 10,      // Target: 10, aim for 9-12 range
  agreements: 3,  // Target: 3, aim for 2-4 range  
  lists: 1,       // Target: 1, aim for 0-2 range
  sales: 0.5      // Target: 0.5, aim for 0-1 range
};

const monthlyTargetsPerBDR = {
  calls: 40,      // Target: 40, aim for 35-45 range
  agreements: 12, // Target: 12, aim for 10-14 range
  lists: 4,       // Target: 4, aim for 3-5 range
  sales: 2        // Target: 2, aim for 1-3 range
};

function generateWorkingHoursDate(baseDate: Date): Date {
  const date = new Date(baseDate);
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

async function clearExistingData() {
  console.log('🗑️ Clearing over-inflated data...');
  await prisma.activityLog.deleteMany();
  await prisma.pipelineItem.deleteMany();
  await prisma.lead.deleteMany();
  console.log('✅ Data cleared');
}

async function generateRealisticData() {
  console.log('📊 Generating realistic CRM data close to targets...\n');
  
  const now = new Date();
  const thisWeekStart = startOfWeek(now, { weekStartsOn: 1 });
  const lastWeekStart = startOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });
  const lastWeekEnd = endOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });
  const thisMonthStart = startOfMonth(now);
  const lastMonthStart = startOfMonth(subMonths(now, 1));
  const lastMonthEnd = endOfMonth(subMonths(now, 1));
  const twoMonthsAgo = subMonths(now, 2);
  
  // Generate basic leads pool first
  const leads = [];
  const leadsToGenerate = 800; // Reduced from 1200
  
  for (let i = 0; i < leadsToGenerate; i++) {
    const addedDate = generateRandomDate(twoMonthsAgo, now);
    const bdr = bdrs[Math.floor(Math.random() * bdrs.length)];
    const company = companies[Math.floor(Math.random() * companies.length)];
    const industry = industries[Math.floor(Math.random() * industries.length)];
    
    leads.push({
      name: faker.person.fullName(),
      title: faker.person.jobTitle(),
      email: faker.internet.email(),
      phone: faker.phone.number(),
      company: `${company} (${industry})`,
      source: sources[Math.floor(Math.random() * sources.length)],
      status: Math.random() > 0.8 ? "Converted" : "New Lead",
      bdr: bdr,
      addedDate: addedDate,
      notes: `Lead from ${industry} industry via ${sources[Math.floor(Math.random() * sources.length)]}`
    });
  }
  
  await prisma.lead.createMany({ data: leads });
  console.log(`✅ Generated ${leadsToGenerate} leads`);
  
  // Generate realistic pipeline items and activities
  const pipelineItems = [];
  const activityLogs = [];
  
  for (const bdr of bdrs) {
    console.log(`📈 Creating realistic data for ${bdr}...`);
    
    // THIS WEEK: Aim for close to weekly targets
    const thisWeekCalls = 8 + Math.floor(Math.random() * 5); // 8-12 calls (target: 10)
    const thisWeekAgreements = Math.min(thisWeekCalls, 2 + Math.floor(Math.random() * 3)); // 2-4 agreements (target: 3)
    const thisWeekLists = Math.random() > 0.4 ? 1 : Math.random() > 0.8 ? 2 : 0; // Usually 0-1 lists (target: 1)
    const thisWeekSales = Math.random() > 0.6 ? 1 : 0; // Usually 0-1 sales (target: 0.5)
    
    // Generate this week's activities
    for (let i = 0; i < thisWeekCalls; i++) {
      const callDate = generateRandomDate(thisWeekStart, now);
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
      
      // Determine realistic outcomes
      const rand = Math.random();
      if (i < thisWeekAgreements && rand < 0.7) {
        status = Math.random() > 0.5 ? "Agreement - Media" : "Agreement - Profile";
        category = "Pipeline";
        probability = 75;
        value = 8000 + Math.random() * 15000;
        agreementDate = addDays(callDate, 1 + Math.random() * 2);
      } else if (rand < 0.3) {
        status = "Not Responsive";
        probability = 5;
      } else if (rand < 0.5) {
        status = "Follow-up Required";
        probability = 40;
      } else {
        status = "Interested";
        probability = 60;
      }
      
      if (i < thisWeekLists && agreementDate) {
        status = "Partner List Sent";
        category = "Lists_Media_QA";
        probability = 90;
        partnerListSentDate = addDays(agreementDate, 1 + Math.random() * 2);
        partnerListSize = 6 + Math.floor(Math.random() * 8);
      }
      
      if (i < thisWeekSales && partnerListSentDate) {
        status = "Sold";
        probability = 100;
        firstSaleDate = addDays(partnerListSentDate, 2 + Math.random() * 5);
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
        notes: `This week ${industry} opportunity`,
        parentId: null,
        isSublist: false,
        sortOrder: Math.floor(Math.random() * 1000)
      };
      
      pipelineItems.push(pipelineItem);
      
      // Create activity logs
      activityLogs.push({
        timestamp: callDate,
        bdr: bdr,
        activityType: "Call_Completed",
        description: `Call completed with ${pipelineItem.name}`,
        notes: `This week call - outcome: ${status}`,
        previousStatus: "Call Booked",
        newStatus: status,
        pipelineItemId: null
      });
      
      if (agreementDate) {
        activityLogs.push({
          timestamp: agreementDate,
          bdr: bdr,
          activityType: "Agreement_Sent",
          description: `Agreement sent to ${pipelineItem.name}`,
          notes: `Agreement worth £${value?.toFixed(0)}`,
          previousStatus: "Call Conducted",
          newStatus: status.includes('Agreement') ? status : "Agreement - Profile",
          pipelineItemId: null
        });
      }
      
      if (partnerListSentDate) {
        activityLogs.push({
          timestamp: partnerListSentDate,
          bdr: bdr,
          activityType: "Partner_List_Sent",
          description: `Partner list sent to ${pipelineItem.name}`,
          notes: `List with ${partnerListSize} partners`,
          previousStatus: "Agreement - Profile",
          newStatus: "Partner List Sent",
          pipelineItemId: null
        });
      }
      
      if (firstSaleDate) {
        activityLogs.push({
          timestamp: firstSaleDate,
          bdr: bdr,
          activityType: "Sale_Recorded",
          description: `Sale recorded for ${pipelineItem.name}`,
          notes: `Sale worth £${value?.toFixed(0)}`,
          previousStatus: "Partner List Sent",
          newStatus: "Sold",
          pipelineItemId: null
        });
      }
    }
    
    // LAST WEEK: Similar realistic numbers
    const lastWeekCalls = 9 + Math.floor(Math.random() * 4); // 9-12 calls
    const lastWeekAgreements = Math.min(lastWeekCalls, 2 + Math.floor(Math.random() * 3));
    const lastWeekLists = Math.random() > 0.5 ? 1 : Math.random() > 0.8 ? 2 : 0;
    const lastWeekSales = Math.random() > 0.5 ? 1 : 0;
    
    for (let i = 0; i < lastWeekCalls; i++) {
      const callDate = generateRandomDate(lastWeekStart, lastWeekEnd);
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
      
      const rand = Math.random();
      if (i < lastWeekAgreements && rand < 0.6) {
        status = Math.random() > 0.5 ? "Agreement - Media" : "Agreement - Profile";
        category = "Pipeline";
        probability = 75;
        value = 8000 + Math.random() * 15000;
        agreementDate = addDays(callDate, 1 + Math.random() * 2);
      }
      
      if (i < lastWeekLists && agreementDate) {
        status = "Partner List Sent";
        category = "Lists_Media_QA";
        probability = 90;
        partnerListSentDate = addDays(agreementDate, 1 + Math.random() * 2);
        partnerListSize = 6 + Math.floor(Math.random() * 8);
      }
      
      if (i < lastWeekSales && partnerListSentDate) {
        status = "Sold";
        probability = 100;
        const maxSaleDate = Math.min(lastWeekEnd.getTime(), addDays(partnerListSentDate, 7).getTime());
        firstSaleDate = new Date(partnerListSentDate.getTime() + Math.random() * (maxSaleDate - partnerListSentDate.getTime()));
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
        notes: `Last week ${industry} opportunity`,
        parentId: null,
        isSublist: false,
        sortOrder: Math.floor(Math.random() * 1000)
      };
      
      pipelineItems.push(pipelineItem);
      
      // Create activity logs for last week
      activityLogs.push({
        timestamp: callDate,
        bdr: bdr,
        activityType: "Call_Completed",
        description: `Call completed with ${pipelineItem.name}`,
        notes: `Last week call - outcome: ${status}`,
        previousStatus: "Call Booked",
        newStatus: status,
        pipelineItemId: null
      });
      
      if (agreementDate) {
        activityLogs.push({
          timestamp: agreementDate,
          bdr: bdr,
          activityType: "Agreement_Sent",
          description: `Agreement sent to ${pipelineItem.name}`,
          notes: `Last week agreement worth £${value?.toFixed(0)}`,
          previousStatus: "Call Conducted",
          newStatus: status.includes('Agreement') ? status : "Agreement - Profile",
          pipelineItemId: null
        });
      }
      
      if (partnerListSentDate) {
        activityLogs.push({
          timestamp: partnerListSentDate,
          bdr: bdr,
          activityType: "Partner_List_Sent",
          description: `Partner list sent to ${pipelineItem.name}`,
          notes: `Last week list with ${partnerListSize} partners`,
          previousStatus: "Agreement - Profile",
          newStatus: "Partner List Sent",
          pipelineItemId: null
        });
      }
      
      if (firstSaleDate) {
        activityLogs.push({
          timestamp: firstSaleDate,
          bdr: bdr,
          activityType: "Sale_Recorded",
          description: `Sale recorded for ${pipelineItem.name}`,
          notes: `Last week sale worth £${value?.toFixed(0)}`,
          previousStatus: "Partner List Sent",
          newStatus: "Sold",
          pipelineItemId: null
        });
      }
    }
    
    // THIS MONTH (rest of month): Fill out to reach monthly targets reasonably
    const callsNeededThisMonth = Math.max(0, Math.min(45, monthlyTargetsPerBDR.calls - thisWeekCalls)); // Cap at reasonable level
    const agreementsNeededThisMonth = Math.max(0, Math.min(15, monthlyTargetsPerBDR.agreements - thisWeekAgreements));
    const listsNeededThisMonth = Math.max(0, Math.min(6, monthlyTargetsPerBDR.lists - thisWeekLists));
    const salesNeededThisMonth = Math.max(0, Math.min(4, monthlyTargetsPerBDR.sales - thisWeekSales));
    
    // Generate earlier this month data
    const earlierInMonth = Math.floor(callsNeededThisMonth * 0.7); // 70% of remaining calls from earlier in month
    for (let i = 0; i < earlierInMonth; i++) {
      const callDate = generateRandomDate(thisMonthStart, thisWeekStart);
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
      
      const rand = Math.random();
      if (i < agreementsNeededThisMonth && rand < 0.4) {
        status = Math.random() > 0.5 ? "Agreement - Media" : "Agreement - Profile";
        category = "Pipeline";
        probability = 75;
        value = 8000 + Math.random() * 15000;
        agreementDate = addDays(callDate, 1 + Math.random() * 3);
      }
      
      if (i < listsNeededThisMonth && agreementDate) {
        status = "Partner List Sent";
        category = "Lists_Media_QA";
        probability = 90;
        partnerListSentDate = addDays(agreementDate, 1 + Math.random() * 3);
        partnerListSize = 6 + Math.floor(Math.random() * 8);
      }
      
      if (i < salesNeededThisMonth && partnerListSentDate) {
        status = "Sold";
        probability = 100;
        firstSaleDate = addDays(partnerListSentDate, 3 + Math.random() * 10);
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
        notes: `Earlier this month ${industry} opportunity`,
        parentId: null,
        isSublist: false,
        sortOrder: Math.floor(Math.random() * 1000)
      };
      
      pipelineItems.push(pipelineItem);
      
      // Create activity logs
      activityLogs.push({
        timestamp: callDate,
        bdr: bdr,
        activityType: "Call_Completed",
        description: `Call completed with ${pipelineItem.name}`,
        notes: `Earlier this month call - outcome: ${status}`,
        previousStatus: "Call Booked", 
        newStatus: status,
        pipelineItemId: null
      });
      
      if (agreementDate) {
        activityLogs.push({
          timestamp: agreementDate,
          bdr: bdr,
          activityType: "Agreement_Sent",
          description: `Agreement sent to ${pipelineItem.name}`,
          notes: `Earlier month agreement worth £${value?.toFixed(0)}`,
          previousStatus: "Call Conducted",
          newStatus: status.includes('Agreement') ? status : "Agreement - Profile",
          pipelineItemId: null
        });
      }
      
      if (partnerListSentDate) {
        activityLogs.push({
          timestamp: partnerListSentDate,
          bdr: bdr,
          activityType: "Partner_List_Sent",
          description: `Partner list sent to ${pipelineItem.name}`,
          notes: `Earlier month list with ${partnerListSize} partners`,
          previousStatus: "Agreement - Profile",
          newStatus: "Partner List Sent",
          pipelineItemId: null
        });
      }
      
      if (firstSaleDate) {
        activityLogs.push({
          timestamp: firstSaleDate,
          bdr: bdr,
          activityType: "Sale_Recorded",
          description: `Sale recorded for ${pipelineItem.name}`,
          notes: `Earlier month sale worth £${value?.toFixed(0)}`,
          previousStatus: "Partner List Sent",
          newStatus: "Sold",
          pipelineItemId: null
        });
      }
    }
    
    // LAST MONTH: Good but not excessive performance
    const lastMonthCalls = 35 + Math.floor(Math.random() * 8); // 35-42 calls (close to target of 40)
    const lastMonthAgreements = 10 + Math.floor(Math.random() * 4); // 10-13 agreements (close to target of 12)
    const lastMonthLists = 3 + Math.floor(Math.random() * 3); // 3-5 lists (close to target of 4)
    const lastMonthSales = 1 + Math.floor(Math.random() * 3); // 1-3 sales (close to target of 2)
    
    for (let i = 0; i < lastMonthCalls; i++) {
      const callDate = generateRandomDate(lastMonthStart, lastMonthEnd);
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
      
      const rand = Math.random();
      if (i < lastMonthAgreements && rand < 0.5) {
        status = Math.random() > 0.5 ? "Agreement - Media" : "Agreement - Profile";
        category = "Pipeline";
        probability = 75;
        value = 8000 + Math.random() * 15000;
        agreementDate = addDays(callDate, 1 + Math.random() * 3);
      }
      
      if (i < lastMonthLists && agreementDate) {
        status = "Partner List Sent";
        category = "Lists_Media_QA";
        probability = 90;
        partnerListSentDate = addDays(agreementDate, 1 + Math.random() * 3);
        partnerListSize = 6 + Math.floor(Math.random() * 8);
      }
      
      if (i < lastMonthSales && partnerListSentDate) {
        status = "Sold";
        probability = 100;
        const maxSaleDate = Math.min(lastMonthEnd.getTime(), addDays(partnerListSentDate, 14).getTime());
        firstSaleDate = new Date(partnerListSentDate.getTime() + Math.random() * (maxSaleDate - partnerListSentDate.getTime()));
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
        notes: `Last month ${industry} opportunity`,
        parentId: null,
        isSublist: false,
        sortOrder: Math.floor(Math.random() * 1000)
      };
      
      pipelineItems.push(pipelineItem);
      
      // Create activity logs for last month
      activityLogs.push({
        timestamp: callDate,
        bdr: bdr,
        activityType: "Call_Completed",
        description: `Call completed with ${pipelineItem.name}`,
        notes: `Last month call - outcome: ${status}`,
        previousStatus: "Call Booked",
        newStatus: status,
        pipelineItemId: null
      });
      
      if (agreementDate) {
        activityLogs.push({
          timestamp: agreementDate,
          bdr: bdr,
          activityType: "Agreement_Sent",
          description: `Agreement sent to ${pipelineItem.name}`,
          notes: `Last month agreement worth £${value?.toFixed(0)}`,
          previousStatus: "Call Conducted",
          newStatus: status.includes('Agreement') ? status : "Agreement - Profile",
          pipelineItemId: null
        });
      }
      
      if (partnerListSentDate) {
        activityLogs.push({
          timestamp: partnerListSentDate,
          bdr: bdr,
          activityType: "Partner_List_Sent",
          description: `Partner list sent to ${pipelineItem.name}`,
          notes: `Last month list with ${partnerListSize} partners`,
          previousStatus: "Agreement - Profile",
          newStatus: "Partner List Sent",
          pipelineItemId: null
        });
      }
      
      if (firstSaleDate) {
        activityLogs.push({
          timestamp: firstSaleDate,
          bdr: bdr,
          activityType: "Sale_Recorded",
          description: `Sale recorded for ${pipelineItem.name}`,
          notes: `Last month sale worth £${value?.toFixed(0)}`,
          previousStatus: "Partner List Sent",
          newStatus: "Sold",
          pipelineItemId: null
        });
      }
    }
  }
  
  // Create a few sublists but not too many
  const sublists = [];
  const sublistItems = [];
  
  for (let i = 0; i < 5; i++) { // Only 5 sublists instead of 20
    const bdr = bdrs[Math.floor(Math.random() * bdrs.length)];
    const company = companies[Math.floor(Math.random() * companies.length)];
    const createdDate = generateRandomDate(lastMonthStart, now);
    
    const parentItem = {
      name: faker.person.fullName(),
      title: "Partnership Manager",
      email: faker.internet.email(),
      company: company,
      bdr: bdr,
      category: "Lists_Media_QA",
      status: "Partner List Sent",
      value: 15000 + Math.random() * 10000,
      probability: 85,
      addedDate: createdDate,
      lastUpdated: addDays(createdDate, Math.random() * 7),
      agreementDate: addDays(createdDate, 2),
      partnerListSentDate: addDays(createdDate, 4),
      partnerListSize: 8 + Math.floor(Math.random() * 6),
      isSublist: true,
      sublistName: `${company} Partnership`,
      sortOrder: i * 100,
      notes: `Partnership opportunity with ${company}`
    };
    
    sublists.push(parentItem);
    
    // Create 2-3 sub-items per sublist
    for (let j = 0; j < 2 + Math.floor(Math.random() * 2); j++) {
      const subItem = {
        name: faker.person.fullName(),
        title: faker.person.jobTitle(),
        email: faker.internet.email(),
        company: `${company} - Contact ${j + 1}`,
        bdr: bdr,
        category: "Partner_Contacts",
        status: ["Contacted", "Interested", "Agreement - Profile"][Math.floor(Math.random() * 3)],
        value: 3000 + Math.random() * 4000,
        probability: 50 + Math.random() * 30,
        addedDate: addDays(createdDate, j),
        lastUpdated: addDays(createdDate, j + Math.random() * 5),
        parentId: null as number | null, // Will be set after parent is created
        isSublist: false,
        sortOrder: (i * 100) + j + 1,
        notes: `Sub-contact for ${company} partnership`
      };
      
      sublistItems.push(subItem);
    }
  }
  
  // Create all data
  if (pipelineItems.length > 0) {
    await prisma.pipelineItem.createMany({ data: pipelineItems });
    console.log(`✅ Generated ${pipelineItems.length} pipeline items`);
  }
  
  if (activityLogs.length > 0) {
    await prisma.activityLog.createMany({ data: activityLogs });
    console.log(`✅ Generated ${activityLogs.length} activity logs`);
  }
  
  // Create sublists
  if (sublists.length > 0) {
    const createdSublists = await Promise.all(
      sublists.map(sublist => prisma.pipelineItem.create({ data: sublist }))
    );
    
    // Update sub-items with correct parentId
    for (let i = 0; i < sublistItems.length; i++) {
      const parentIndex = Math.floor(i / 2.5); // Roughly 2.5 items per sublist
      if (createdSublists[parentIndex]) {
        sublistItems[i].parentId = createdSublists[parentIndex].id;
      }
    }
    
    await prisma.pipelineItem.createMany({ data: sublistItems });
    console.log(`✅ Created ${createdSublists.length} sublists with ${sublistItems.length} sub-items`);
  }
  
  // Final summary
  const totalLeads = await prisma.lead.count();
  const totalPipeline = await prisma.pipelineItem.count();
  const totalActivities = await prisma.activityLog.count();
  const totalSold = await prisma.pipelineItem.count({ where: { status: 'Sold' } });
  
  console.log('\n🎯 Realistic Data Generation Complete!');
  console.log('=====================================');
  console.log(`📊 Leads: ${totalLeads}`);
  console.log(`📈 Pipeline Items: ${totalPipeline}`);
  console.log(`📋 Activity Logs: ${totalActivities}`);
  console.log(`🏆 Sold Items: ${totalSold}`);
  console.log('\n✨ KPIs should now be close to targets, not massively over!');
}

async function main() {
  try {
    await clearExistingData();
    await generateRealisticData();
  } catch (error) {
    console.error('Error generating realistic data:', error);
    throw error;
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());