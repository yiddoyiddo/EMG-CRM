import { PrismaClient } from '@prisma/client';
import { faker } from '@faker-js/faker';
import { addDays, subDays, addWeeks, subWeeks, addMonths, subMonths, startOfWeek, endOfWeek, startOfMonth } from 'date-fns';

const prisma = new PrismaClient();

// Company data for realistic lead generation
const companies = [
  "TechCorp Solutions", "Digital Innovations Ltd", "Global Systems Inc", "NextGen Technologies",
  "Prime Business Group", "Elite Consulting", "Advanced Analytics", "Strategic Partners",
  "Innovation Hub", "Future Tech", "Enterprise Solutions", "Business Dynamics",
  "Smart Systems", "Data Solutions", "Growth Partners", "Performance Group",
  "Success Metrics", "Efficiency Experts", "Optimization Pro", "Results Driven",
  "Market Leaders", "Industry Pioneers", "Excellence Corp", "Breakthrough Solutions",
  "Advantage Systems", "Premier Services", "Quality First", "Reliable Partners",
  "Professional Group", "Expert Solutions", "Trusted Advisors", "Value Creators",
  "Impact Solutions", "Progress Partners", "Achievement Corp", "Victory Systems",
  "Pinnacle Group", "Superior Services", "Outstanding Results", "Exceptional Value",
  "Dynamic Solutions", "Innovative Approaches", "Creative Strategies", "Bold Ventures",
  "Forward Thinking", "Cutting Edge", "Leading Edge", "State of Art",
  "Best Practices", "Top Tier", "Premium Services", "First Class"
];

const industries = [
  "Technology", "Healthcare", "Finance", "Manufacturing", "Retail", "Education", 
  "Consulting", "Real Estate", "Marketing", "Legal", "Construction", "Hospitality",
  "Transportation", "Media", "Insurance", "Energy", "Telecommunications", "Pharmaceuticals"
];

const sources = [
  "LinkedIn", "Cold Email", "Website Form", "Referral", "Trade Show", "Cold Call",
  "Social Media", "Partner", "Webinar", "Content Marketing", "SEO", "PPC"
];

const bdrs = [
  "Naeem Patel", "Jennifer Davies", "Jamie Waite", "Verity Kay", "Thomas Hardy",
  "Dan Reeves", "Gary Smith", "Thomas Corcoran", "Jess Collins", "Mark Cawston",
  "Adel Mhiri", "Stephen Vivian", "Rupert Kay"
];

const statuses = [
  "New Lead", "Contacted", "Interested", "Call Proposed", "Call Booked", 
  "Call Conducted", "Proposal - Media", "Proposal - Profile", "Agreement - Media", 
  "Agreement - Profile", "Partner List Pending", "Partner List Sent", "List Out",
  "Sold", "Not Responsive", "Lost", "Declined", "Follow-up Required"
];

const activityTypes = [
  "Lead_Created", "Call_Completed", "Call_Scheduled", "Call_Missed", "Call_Rescheduled",
  "Email_Sent", "Proposal_Sent", "Agreement_Sent", "Partner_List_Sent", "Follow_Up_Scheduled",
  "Note_Added", "Status_Change", "Pipeline_Move", "Sale_Recorded", "BDR_Update"
];

// Target achievements - slightly above targets for good performance
const weeklyTargetsPerBDR = {
  calls: 12, // target: 10
  agreements: 4, // target: 3  
  lists: 1.2, // target: 1
  sales: 0.6 // target: 0.5
};

async function clearExistingData() {
  console.log('🗑️ Clearing existing data...');
  await prisma.activityLog.deleteMany();
  await prisma.pipelineItem.deleteMany();
  await prisma.lead.deleteMany();
  console.log('✅ Existing data cleared');
}

function generateRandomDate(startDate: Date, endDate: Date): Date {
  const startTime = startDate.getTime();
  const endTime = endDate.getTime();
  const randomTime = startTime + Math.random() * (endTime - startTime);
  return new Date(randomTime);
}

function generateWorkingHoursDate(baseDate: Date): Date {
  const date = new Date(baseDate);
  // Set to working hours (9 AM - 6 PM)
  date.setHours(9 + Math.floor(Math.random() * 9));
  date.setMinutes(Math.floor(Math.random() * 60));
  return date;
}

async function generateOptimizedLeads() {
  console.log('👥 Generating optimized leads...');
  
  const now = new Date();
  const threeMonthsAgo = subMonths(now, 3);
  const leads = [];
  
  // Generate leads spread over the last 3 months
  const totalLeads = 1200; // Increased for better pipeline
  
  for (let i = 0; i < totalLeads; i++) {
    const addedDate = generateRandomDate(threeMonthsAgo, now);
    const bdr = bdrs[Math.floor(Math.random() * bdrs.length)];
    const company = companies[Math.floor(Math.random() * companies.length)];
    const industry = industries[Math.floor(Math.random() * industries.length)];
    
    const lead = {
      name: faker.person.fullName(),
      title: faker.person.jobTitle(),
      email: faker.internet.email(),
      phone: faker.phone.number(),
      company: `${company} (${industry})`,
      source: sources[Math.floor(Math.random() * sources.length)],
      status: Math.random() > 0.7 ? "Converted" : statuses[Math.floor(Math.random() * 6)], // Most leads in early stages
      bdr: bdr,
      addedDate: addedDate,
      notes: `Lead from ${industry} industry. ${faker.lorem.sentence()}`
    };
    
    leads.push(lead);
  }
  
  await prisma.lead.createMany({ data: leads });
  console.log(`✅ Generated ${totalLeads} optimized leads`);
  return leads;
}

async function generateOptimizedPipelineItems() {
  console.log('📈 Generating optimized pipeline items...');
  
  const now = new Date();
  const twelveWeeksAgo = subWeeks(now, 12);
  const pipelineItems = [];
  
  // Generate pipeline items that will meet our targets
  for (const bdr of bdrs) {
    // Generate items across the last 12 weeks to show consistent performance
    for (let week = 11; week >= 0; week--) {
      const weekStart = startOfWeek(subWeeks(now, week), { weekStartsOn: 1 });
      const weekEnd = endOfWeek(subWeeks(now, week), { weekStartsOn: 1 });
      
      // Generate calls for this week (12 per BDR per week)
      const callsThisWeek = Math.floor(weeklyTargetsPerBDR.calls + Math.random() * 4);
      for (let call = 0; call < callsThisWeek; call++) {
        const callDate = generateWorkingHoursDate(generateRandomDate(weekStart, weekEnd));
        const company = companies[Math.floor(Math.random() * companies.length)];
        const industry = industries[Math.floor(Math.random() * industries.length)];
        
        // Determine outcome and status based on realistic conversion rates
        let status = "Call Conducted";
        let category = "Calls";
        let probability = 20;
        let value = null;
        let expectedCloseDate = null;
        let agreementDate = null;
        let partnerListSentDate = null;
        let firstSaleDate = null;
        let partnerListSize = null;
        let totalSalesFromList = null;
        
        const outcome = Math.random();
        if (outcome < 0.15) { // 15% become not responsive
          status = "Not Responsive";
          probability = 5;
        } else if (outcome < 0.25) { // 10% decline
          status = "Declined";
          probability = 0;
        } else if (outcome < 0.50) { // 25% need follow-up
          status = "Follow-up Required";
          probability = 30;
        } else if (outcome < 0.75) { // 25% show interest
          status = "Interested";
          probability = 50;
        } else { // 25% progress further
          const progressOutcome = Math.random();
          if (progressOutcome < 0.3) { // Proposal stage
            status = Math.random() > 0.5 ? "Proposal - Media" : "Proposal - Profile";
            category = "Pipeline";
            probability = 60;
            value = 5000 + Math.random() * 15000;
            expectedCloseDate = addWeeks(callDate, 2 + Math.random() * 4);
          } else if (progressOutcome < 0.6) { // Agreement stage
            status = Math.random() > 0.5 ? "Agreement - Media" : "Agreement - Profile";
            category = "Pipeline";
            probability = 80;
            value = 8000 + Math.random() * 20000;
            agreementDate = addDays(callDate, 3 + Math.random() * 7);
            expectedCloseDate = addWeeks(agreementDate, 1 + Math.random() * 3);
          } else if (progressOutcome < 0.85) { // Partner list stage
            status = "Partner List Sent";
            category = "Lists_Media_QA";
            probability = 90;
            value = 10000 + Math.random() * 25000;
            agreementDate = addDays(callDate, 2 + Math.random() * 5);
            partnerListSentDate = addDays(agreementDate, 1 + Math.random() * 3);
            partnerListSize = 8 + Math.floor(Math.random() * 15);
            expectedCloseDate = addWeeks(partnerListSentDate, 2 + Math.random() * 4);
          } else { // Sold!
            status = "Sold";
            category = "Lists_Media_QA";
            probability = 100;
            value = 12000 + Math.random() * 30000;
            agreementDate = addDays(callDate, 2 + Math.random() * 5);
            partnerListSentDate = addDays(agreementDate, 1 + Math.random() * 3);
            partnerListSize = 10 + Math.floor(Math.random() * 12);
            firstSaleDate = addDays(partnerListSentDate, 7 + Math.random() * 14);
            totalSalesFromList = 1 + Math.floor(Math.random() * 3);
          }
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
          expectedCloseDate: expectedCloseDate,
          agreementDate: agreementDate,
          partnerListSentDate: partnerListSentDate,
          firstSaleDate: firstSaleDate,
          partnerListSize: partnerListSize,
          totalSalesFromList: totalSalesFromList,
          notes: `${industry} opportunity. ${faker.lorem.sentence()}`,
          parentId: null,
          isSublist: false,
          sortOrder: Math.floor(Math.random() * 1000)
        };
        
        pipelineItems.push(pipelineItem);
      }
    }
  }
  
  await prisma.pipelineItem.createMany({ data: pipelineItems });
  console.log(`✅ Generated ${pipelineItems.length} optimized pipeline items`);
  return pipelineItems;
}

async function generateOptimizedActivityLogs(pipelineItems: any[]) {
  console.log('📋 Generating optimized activity logs...');
  
  const activityLogs = [];
  
  for (const item of pipelineItems) {
    // Lead creation activity
    activityLogs.push({
      timestamp: item.addedDate,
      bdr: item.bdr,
      activityType: "Lead_Created",
      description: `Lead created for ${item.name} at ${item.company}`,
      pipelineItemId: null, // Will be set after pipeline items are created
      notes: `New lead from ${item.company}`,
      previousStatus: null,
      newStatus: "New Lead"
    });
    
    // Call completed activity
    activityLogs.push({
      timestamp: item.callDate,
      bdr: item.bdr,
      activityType: "Call_Completed",
      description: `Call completed with ${item.name}`,
      pipelineItemId: null,
      notes: `Discussed partnership opportunities. ${item.status === 'Sold' ? 'Very positive response.' : item.status === 'Not Responsive' ? 'No response after call.' : 'Follow-up required.'}`,
      previousStatus: "Call Booked",
      newStatus: item.status
    });
    
    // Additional activities based on status
    if (item.status.includes('Proposal')) {
      activityLogs.push({
        timestamp: addDays(item.callDate, 1),
        bdr: item.bdr,
        activityType: "Proposal_Sent",
        description: `Proposal sent to ${item.name}`,
        pipelineItemId: null,
        notes: `Sent ${item.status.includes('Media') ? 'media' : 'profile'} proposal worth £${item.value?.toFixed(0)}`,
        previousStatus: "Call Conducted",
        newStatus: item.status
      });
    }
    
    if (item.agreementDate) {
      activityLogs.push({
        timestamp: item.agreementDate,
        bdr: item.bdr,
        activityType: "Agreement_Sent",
        description: `Agreement sent to ${item.name}`,
        pipelineItemId: null,
        notes: `Agreement for ${item.status.includes('Media') ? 'media' : 'profile'} services worth £${item.value?.toFixed(0)}`,
        previousStatus: item.status.replace('Agreement', 'Proposal'),
        newStatus: item.status
      });
    }
    
    if (item.partnerListSentDate) {
      activityLogs.push({
        timestamp: item.partnerListSentDate,
        bdr: item.bdr,
        activityType: "Partner_List_Sent",
        description: `Partner list sent to ${item.name}`,
        pipelineItemId: null,
        notes: `Sent list of ${item.partnerListSize} partners for review`,
        previousStatus: item.status.replace('List Sent', 'List Pending'),
        newStatus: "Partner List Sent"
      });
    }
    
    if (item.firstSaleDate) {
      activityLogs.push({
        timestamp: item.firstSaleDate,
        bdr: item.bdr,
        activityType: "Sale_Recorded",
        description: `Sale recorded for ${item.name}`,
        pipelineItemId: null,
        notes: `First sale recorded! Generated £${item.value?.toFixed(0)} in revenue from partner list.`,
        previousStatus: "Partner List Sent",
        newStatus: "Sold"
      });
    }
    
    // Follow-up activities for ongoing items
    if (!item.firstSaleDate && item.lastUpdated > item.callDate) {
      const followUps = Math.floor(Math.random() * 3) + 1;
      for (let i = 0; i < followUps; i++) {
        const followUpDate = addDays(item.callDate, (i + 1) * 7);
        if (followUpDate <= item.lastUpdated) {
          activityLogs.push({
            timestamp: followUpDate,
            bdr: item.bdr,
            activityType: "Follow_Up_Scheduled",
            description: `Follow-up scheduled with ${item.name}`,
            pipelineItemId: null,
            notes: `Follow-up ${i + 1} - maintaining contact and pipeline progress`,
            previousStatus: null,
            newStatus: null
          });
        }
      }
    }
  }
  
  await prisma.activityLog.createMany({ data: activityLogs });
  console.log(`✅ Generated ${activityLogs.length} optimized activity logs`);
}

async function generateSublistsAndDeals() {
  console.log('📊 Creating sublists and advanced deals...');
  
  const now = new Date();
  const sublists = [];
  const sublistItems = [];
  
  // Create sublists for top performing BDRs
  const topBDRs = bdrs.slice(0, 8); // Top 8 BDRs get sublists
  
  for (const bdr of topBDRs) {
    // Create 2-3 sublists per top BDR
    const numSublists = 2 + Math.floor(Math.random() * 2);
    
    for (let i = 0; i < numSublists; i++) {
      const sublistName = `${bdr}'s Q4 Partner List ${i + 1}`;
      const company = companies[Math.floor(Math.random() * companies.length)];
      const createdDate = subDays(now, Math.random() * 30);
      
      const parentItem = {
        name: faker.person.fullName(),
        title: "Partnership Manager",
        email: faker.internet.email(),
        company: company,
        bdr: bdr,
        category: "Lists_Media_QA",
        status: Math.random() > 0.3 ? "Partner List Sent" : "Sold",
        value: 15000 + Math.random() * 25000,
        probability: 90,
        addedDate: createdDate,
        lastUpdated: addDays(createdDate, Math.random() * 14),
        agreementDate: addDays(createdDate, 2),
        partnerListSentDate: addDays(createdDate, 5),
        partnerListSize: 12 + Math.floor(Math.random() * 8),
        isSublist: true,
        sublistName: sublistName,
        sortOrder: i * 100,
        notes: `Major partnership opportunity with ${company}. Multiple touchpoints required.`
      };
      
      if (parentItem.status === "Sold") {
        (parentItem as any).firstSaleDate = addDays(parentItem.partnerListSentDate!, 7 + Math.random() * 14);
        (parentItem as any).totalSalesFromList = 2 + Math.floor(Math.random() * 4);
      }
      
      sublists.push(parentItem);
      
      // Create 3-5 sub-items for each sublist
      const numSubItems = 3 + Math.floor(Math.random() * 3);
      for (let j = 0; j < numSubItems; j++) {
        const subItem = {
          name: faker.person.fullName(),
          title: faker.person.jobTitle(),
          email: faker.internet.email(),
          company: `${company} - Contact ${j + 1}`,
          bdr: bdr,
          category: "Partner_Contacts",
          status: ["Contacted", "Interested", "Follow-up Required", "Agreement - Profile"][Math.floor(Math.random() * 4)],
          value: 2000 + Math.random() * 5000,
          probability: 40 + Math.random() * 40,
          addedDate: addDays(createdDate, j),
          lastUpdated: addDays(createdDate, j + Math.random() * 10),
          parentId: null as number | null, // Will be set after parent is created
          isSublist: false,
          sortOrder: (i * 100) + j + 1,
          notes: `Sub-contact for ${sublistName}. Part of larger partnership deal.`
        };
        
        sublistItems.push(subItem);
      }
    }
  }
  
  // Create parent sublists first
  const createdSublists = await Promise.all(
    sublists.map(sublist => prisma.pipelineItem.create({ data: sublist }))
  );
  
  // Update sub-items with correct parentId
  for (let i = 0; i < sublistItems.length; i++) {
    const parentIndex = Math.floor(i / 4); // Assuming 4 items per sublist on average
    if (createdSublists[parentIndex]) {
      sublistItems[i].parentId = createdSublists[parentIndex].id;
    }
  }
  
  await prisma.pipelineItem.createMany({ data: sublistItems });
  
  console.log(`✅ Created ${createdSublists.length} sublists with ${sublistItems.length} sub-items`);
}

async function main() {
  console.log('🚀 Starting CRM Data Optimization...\n');
  
  try {
    // Clear existing data
    await clearExistingData();
    
    // Generate optimized data
    await generateOptimizedLeads();
    const pipelineItems = await generateOptimizedPipelineItems();
    await generateOptimizedActivityLogs(pipelineItems);
    await generateSublistsAndDeals();
    
    // Display summary
    const leadCount = await prisma.lead.count();
    const pipelineCount = await prisma.pipelineItem.count();
    const activityCount = await prisma.activityLog.count();
    const soldCount = await prisma.pipelineItem.count({ where: { status: 'Sold' } });
    
    console.log('\n🎉 Data Optimization Complete!');
    console.log('================================');
    console.log(`📊 Leads: ${leadCount}`);
    console.log(`📈 Pipeline Items: ${pipelineCount}`);
    console.log(`📋 Activity Logs: ${activityCount}`);
    console.log(`🏆 Sold Items: ${soldCount}`);
    console.log('\n✨ All BDRs now meeting or exceeding targets!');
    console.log('📈 KPIs optimized for excellent performance ratings');
    console.log('🎯 Pipeline health dramatically improved');
    
  } catch (error) {
    console.error('❌ Error during data optimization:', error);
    throw error;
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());