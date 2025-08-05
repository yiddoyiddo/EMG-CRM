import { PrismaClient } from '@prisma/client';
import { addDays, subDays, addHours, subHours, addMinutes, format } from 'date-fns';

const prisma = new PrismaClient();

// Enhanced statuses that reflect the actual sales process
const SALES_PROCESS_STATUSES = {
  // Call stage
  CALL_PROPOSED: 'Call Proposed',
  CALL_BOOKED: 'Call Booked', 
  CALL_CONDUCTED: 'Call Conducted',
  
  // Decision stage  
  SOFT_YES_PROPOSAL: 'Proposal - Profile',
  SOFT_YES_MEDIA: 'Proposal - Media Sales',
  HARD_YES_AGREEMENT: 'Agreement - Profile', 
  HARD_YES_MEDIA: 'Agreement - Media',
  DECLINED: 'Declined',
  
  // Post-agreement stage
  PARTNER_LIST_PENDING: 'Partner List Pending',
  PARTNER_LIST_SENT: 'Partner List Sent',
  LIST_OUT: 'List Out',
  LIST_OUT_NOT_SOLD: 'List Out - Not Sold',
  FREE_QA_OFFERED: 'Free Q&A Offered',
  SOLD: 'Sold'
};

const BDR_NAMES = [
  'Dan Reeves', 'Jess Collins', 'Jamie Waite', 'Stephen Vivian', 
  'Thomas Hardy', 'Adel Mhiri', 'Gary Smith', 'Naeem Patel',
  'Jennifer Davies', 'Verity Kay', 'Rupert Kay', 'Mark Cawston', 'Thomas Corcoran'
];

const LEAD_SOURCES = ['LinkedIn', 'Email', 'Phone', 'Lead Gen Team', 'Referral'];

const INDUSTRIES = [
  'Technology', 'Healthcare', 'Finance', 'Manufacturing', 'Retail',
  'Construction', 'Energy', 'Telecommunications', 'Media', 'Education',
  'Automotive', 'Real Estate', 'Legal Services', 'Consulting'
];

const COMPANY_TYPES = [
  'Startup', 'SME', 'Enterprise', 'Government', 'Non-Profit', 'Agency'
];

// Realistic conversion rates based on their business
const CONVERSION_RATES = {
  callToProposal: 0.35,        // 35% of calls result in proposals
  proposalToAgreement: 0.28,   // 28% of proposals become agreements  
  agreementToListOut: 0.85,    // 85% of agreements result in list out
  listOutToSale: 0.22,         // 22% of lists result in at least one sale
  smallListSaleRate: 0.15,     // Lists with 3-8 partners
  mediumListSaleRate: 0.25,    // Lists with 9-15 partners  
  largeListSaleRate: 0.35      // Lists with 16+ partners
};

interface TestDataConfig {
  totalMainLeads: number;
  daysBackToGenerate: number;
  daysForwardToGenerate: number;
  includePartnerLists: boolean;
  includeActivityLogs: boolean;
}

async function createComprehensiveSalesTestData(config: TestDataConfig) {
  console.log('🚀 Creating comprehensive sales test data...');
  
  const now = new Date();
  const startDate = subDays(now, config.daysBackToGenerate);
  const endDate = addDays(now, config.daysForwardToGenerate);
  
  const mainLeads = [];
  const pipelineItems = [];
  const activityLogs = [];
  
  for (let i = 0; i < config.totalMainLeads; i++) {
    const bdr = BDR_NAMES[Math.floor(Math.random() * BDR_NAMES.length)];
    const leadAddedDate = new Date(startDate.getTime() + Math.random() * (now.getTime() - startDate.getTime()));
    
    // Create main lead entry
    const leadData = await createMainLead(i, bdr, leadAddedDate);
    mainLeads.push(leadData);
    
    // Create corresponding pipeline item with realistic progression
    const pipelineData = await createPipelineProgression(leadData, now, config.includePartnerLists);
    pipelineItems.push(...pipelineData.items);
    activityLogs.push(...pipelineData.activities);
    
    if (i % 20 === 0) {
      console.log(`📊 Generated ${i + 1}/${config.totalMainLeads} main leads with pipeline progressions...`);
    }
  }
  
  // Add some future calls to show pipeline health
  const futureCalls = await createFutureCalls(endDate, BDR_NAMES);
  pipelineItems.push(...futureCalls.items);
  activityLogs.push(...futureCalls.activities);
  
  console.log('💾 Saving test data to database...');
  
  // Save all data
  try {
    // Create leads
    for (const lead of mainLeads) {
      await prisma.lead.create({ data: lead });
    }
    
    // Create pipeline items  
    for (const item of pipelineItems) {
      await prisma.pipelineItem.create({ data: item });
    }
    
    // Create activity logs
    if (config.includeActivityLogs) {
      for (const log of activityLogs) {
        await prisma.activityLog.create({ data: log });
      }
    }
    
    console.log('✅ Test data creation completed!');
    console.log(`📈 Created: ${mainLeads.length} leads, ${pipelineItems.length} pipeline items, ${activityLogs.length} activities`);
    
    // Print summary statistics
    await printTestDataSummary();
    
  } catch (error) {
    console.error('❌ Error creating test data:', error);
    throw error;
  }
}

async function createMainLead(index: number, bdr: string, addedDate: Date) {
  const firstName = generateFirstName();
  const lastName = generateLastName();
  const company = generateCompanyName();
  
  return {
    name: `${firstName} ${lastName}`,
    title: generateJobTitle(),
    addedDate,
    bdr,
    company,
    source: LEAD_SOURCES[Math.floor(Math.random() * LEAD_SOURCES.length)],
    status: determineLeadStatus(), // Will align with pipeline progression
    link: `https://linkedin.com/in/${firstName.toLowerCase()}-${lastName.toLowerCase()}`,
    phone: generatePhoneNumber(),
    notes: generateInitialNotes(bdr),
    email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@${company.toLowerCase().replace(/\s+/g, '')}.com`
  };
}

async function createPipelineProgression(leadData: any, currentDate: Date, includePartnerLists: boolean) {
  const items = [];
  const activities = [];
  
  // Determine the progression path for this lead
  const progression = determineSalesProgression(leadData.addedDate, currentDate);
  
  let currentItem = {
    name: leadData.name,
    title: leadData.title,
    addedDate: leadData.addedDate,
    lastUpdated: leadData.addedDate,
    bdr: leadData.bdr,
    company: leadData.company,
    category: 'Calls',
    status: SALES_PROCESS_STATUSES.CALL_PROPOSED,
    value: null as number | null,
    probability: null as number | null,
    expectedCloseDate: null as Date | null,
    link: leadData.link,
    phone: leadData.phone,
    notes: leadData.notes,
    email: leadData.email,
    leadId: null, // Will be set after lead creation
    callDate: progression.callDate,
    parentId: null,
    isSublist: false,
    sublistName: null,
    sortOrder: null
  };
  
  // Progress through the sales stages
  for (const stage of progression.stages) {
    currentItem = { ...currentItem, ...stage.updates };
    items.push({ ...currentItem });
    
    // Create activity log for each stage
    activities.push({
      timestamp: stage.timestamp,
      bdr: leadData.bdr,
      activityType: stage.activityType,
      description: stage.description,
      scheduledDate: stage.scheduledDate,
      completedDate: stage.completedDate,
      notes: stage.notes,
      leadId: null, // Will be set after lead creation
      pipelineItemId: null, // Will be set after pipeline creation
      previousStatus: stage.previousStatus,
      newStatus: stage.newStatus,
      previousCategory: null,
      newCategory: null
    });
  }
  
  // If we reached agreement and list out, create partner sublists
  if (includePartnerLists && progression.reachedListOut) {
    const partnerListData = await createPartnerListSublist(currentItem, leadData.bdr);
    items.push(...partnerListData.items);
    activities.push(...partnerListData.activities);
  }
  
  return { items, activities };
}

function determineSalesProgression(startDate: Date, currentDate: Date) {
  const stages = [];
  let currentStageDate = startDate;
  const daysSinceStart = Math.floor((currentDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  
  // Stage 1: Call Proposed → Call Booked (usually 1-3 days)
  const callBookingDelay = Math.floor(Math.random() * 3) + 1;
  const callDate = addDays(startDate, Math.floor(Math.random() * 7) + 3); // Call booked 3-10 days out
  
  if (daysSinceStart >= callBookingDelay) {
    stages.push({
      timestamp: addDays(startDate, callBookingDelay),
      updates: { 
        status: SALES_PROCESS_STATUSES.CALL_BOOKED,
        callDate: callDate,
        lastUpdated: addDays(startDate, callBookingDelay)
      },
      activityType: 'Call_Scheduled',
      description: `Call scheduled for ${format(callDate, 'dd/MM/yy HH:mm')}`,
      scheduledDate: callDate,
      completedDate: null,
      notes: 'Initial call scheduled',
      previousStatus: SALES_PROCESS_STATUSES.CALL_PROPOSED,
      newStatus: SALES_PROCESS_STATUSES.CALL_BOOKED
    });
    currentStageDate = addDays(startDate, callBookingDelay);
  }
  
  // Stage 2: Call Conducted (on scheduled date)
  const callHappened = callDate <= currentDate;
  if (callHappened) {
    stages.push({
      timestamp: callDate,
      updates: {
        status: SALES_PROCESS_STATUSES.CALL_CONDUCTED,
        lastUpdated: callDate
      },
      activityType: 'Call_Completed',
      description: 'Initial discovery call completed',
      scheduledDate: callDate,
      completedDate: callDate,
      notes: generateCallNotes(),
      previousStatus: SALES_PROCESS_STATUSES.CALL_BOOKED,
      newStatus: SALES_PROCESS_STATUSES.CALL_CONDUCTED
    });
    currentStageDate = callDate;
  }
  
  let reachedListOut = false;
  
  // Stage 3: Call Outcome (same day or next day)
  if (callHappened) {
    const outcomeDate = addHours(callDate, Math.floor(Math.random() * 24) + 1);
    const outcome = determineCallOutcome();
    
    if (outcome !== SALES_PROCESS_STATUSES.DECLINED) {
      const isAgreement = outcome.includes('Agreement');
      const agreementDate = isAgreement ? addDays(outcomeDate, Math.floor(Math.random() * 14) + 1) : null;
      
      stages.push({
        timestamp: outcomeDate,
        updates: {
          status: outcome,
          category: isAgreement ? 'Pipeline' : 'Pipeline',
          expectedCloseDate: agreementDate,
          probability: isAgreement ? 75 : 45,
          value: generateDealValue(),
          lastUpdated: outcomeDate
        },
        activityType: isAgreement ? 'Agreement_Sent' : 'Proposal_Sent',
        description: isAgreement ? 'Agreement sent with partner list date' : 'Proposal sent for consideration',
        scheduledDate: null,
        completedDate: outcomeDate,
        notes: isAgreement ? `Partner list to be sent by ${format(agreementDate!, 'dd/MM/yy')}` : 'Awaiting proposal response',
        previousStatus: SALES_PROCESS_STATUSES.CALL_CONDUCTED,
        newStatus: outcome
      });
      
      // Stage 4: Agreement to List Out (if agreement reached)
      if (isAgreement && agreementDate && agreementDate <= currentDate) {
        const listOutDate = addDays(agreementDate, Math.floor(Math.random() * 3)); // Usually sent on time or shortly after
        
        stages.push({
          timestamp: listOutDate,
          updates: {
            status: SALES_PROCESS_STATUSES.PARTNER_LIST_SENT,
            category: 'Lists_Media_QA',
            lastUpdated: listOutDate
          },
          activityType: 'Status_Change',
          description: 'Partner list sent to client',
          scheduledDate: agreementDate,
          completedDate: listOutDate,
          notes: `Partner list sent with ${Math.floor(Math.random() * 18) + 3} contacts`,
          previousStatus: outcome,
          newStatus: SALES_PROCESS_STATUSES.PARTNER_LIST_SENT
        });
        
        reachedListOut = true;
        currentStageDate = listOutDate;
        
        // Stage 5: List Out Results (2-4 weeks later)
        const resultsDate = addDays(listOutDate, Math.floor(Math.random() * 14) + 14);
        if (resultsDate <= currentDate) {
          const listResult = determineListOutcome();
          
          stages.push({
            timestamp: resultsDate,
            updates: {
              status: listResult,
              lastUpdated: resultsDate
            },
            activityType: 'Status_Change',
            description: getListOutcomeDescription(listResult),
            scheduledDate: null,
            completedDate: resultsDate,
            notes: getListOutcomeNotes(listResult),
            previousStatus: SALES_PROCESS_STATUSES.PARTNER_LIST_SENT,
            newStatus: listResult
          });
        }
      }
    } else {
      // Declined outcome
      stages.push({
        timestamp: outcomeDate,
        updates: {
          status: SALES_PROCESS_STATUSES.DECLINED,
          category: 'Declined_Rescheduled',
          lastUpdated: outcomeDate
        },
        activityType: 'Status_Change',
        description: 'Lead declined - not interested',
        scheduledDate: null,
        completedDate: outcomeDate,
        notes: generateDeclineReason(),
        previousStatus: SALES_PROCESS_STATUSES.CALL_CONDUCTED,
        newStatus: SALES_PROCESS_STATUSES.DECLINED
      });
    }
  }
  
  return {
    stages,
    callDate,
    reachedListOut
  };
}

async function createPartnerListSublist(mainItem: any, bdr: string) {
  const items = [];
  const activities = [];
  
  // Create the sublist container
  const sublistName = `${mainItem.company} Partner List`;
  const partnerCount = Math.floor(Math.random() * 18) + 3; // 3-20 partners
  
  const sublistContainer = {
    ...mainItem,
    isSublist: true,
    sublistName: sublistName,
    notes: `Partner list with ${partnerCount} contacts`,
    sortOrder: 1
  };
  items.push(sublistContainer);
  
  // Create individual partner contacts
  for (let i = 0; i < partnerCount; i++) {
    const partnerName = `${generateFirstName()} ${generateLastName()}`;
    const partnerCompany = generatePartnerCompanyName();
    const contactDate = addDays(mainItem.lastUpdated, Math.floor(Math.random() * 7));
    
    const partnerItem = {
      name: partnerName,
      title: generateJobTitle(),
      addedDate: contactDate,
      lastUpdated: contactDate,
      bdr: bdr,
      company: partnerCompany,
      category: 'Lists_Media_QA',
      status: determinePartnerStatus(),
      value: Math.random() > 0.8 ? Math.floor(Math.random() * 5000) + 1000 : null, // Some have values if sold
      probability: Math.floor(Math.random() * 100),
      expectedCloseDate: null,
      link: null,
      phone: generatePhoneNumber(),
      notes: generatePartnerNotes(),
      email: `${partnerName.split(' ')[0].toLowerCase()}@${partnerCompany.toLowerCase().replace(/\s+/g, '')}.com`,
      leadId: null,
      callDate: null,
      parentId: null, // Will reference sublist container
      isSublist: false,
      sublistName: null,
      sortOrder: i + 2
    };
    
    items.push(partnerItem);
    
    // Create activity for partner contact
    activities.push({
      timestamp: contactDate,
      bdr: bdr,
      activityType: 'Email_Sent',
      description: `Partner contact added: ${partnerName} at ${partnerCompany}`,
      scheduledDate: null,
      completedDate: contactDate,
      notes: `Added to ${sublistName}`,
      leadId: null,
      pipelineItemId: null,
      previousStatus: null,
      newStatus: partnerItem.status,
      previousCategory: null,
      newCategory: 'Lists_Media_QA'
    });
  }
  
  return { items, activities };
}

async function createFutureCalls(endDate: Date, bdrNames: string[]) {
  const items = [];
  const activities = [];
  const now = new Date();
  
  // Create 50-80 future calls across all BDRs
  const futureCallCount = Math.floor(Math.random() * 30) + 50;
  
  for (let i = 0; i < futureCallCount; i++) {
    const bdr = bdrNames[Math.floor(Math.random() * bdrNames.length)];
    const callDate = new Date(now.getTime() + Math.random() * (endDate.getTime() - now.getTime()));
    const bookedDate = subDays(callDate, Math.floor(Math.random() * 5) + 1);
    
    const futureCallItem = {
      name: `${generateFirstName()} ${generateLastName()}`,
      title: generateJobTitle(),
      addedDate: bookedDate,
      lastUpdated: bookedDate,
      bdr: bdr,
      company: generateCompanyName(),
      category: 'Calls',
      status: SALES_PROCESS_STATUSES.CALL_BOOKED,
      value: null,
      probability: null,
      expectedCloseDate: null,
      link: null,
      phone: generatePhoneNumber(),
      notes: 'Future call scheduled',
      email: `future.contact${i}@example.com`,
      leadId: null,
      callDate: callDate,
      parentId: null,
      isSublist: false,
      sublistName: null,
      sortOrder: null
    };
    
    items.push(futureCallItem);
    
    activities.push({
      timestamp: bookedDate,
      bdr: bdr,
      activityType: 'Call_Scheduled',
      description: `Future call scheduled for ${format(callDate, 'dd/MM/yy HH:mm')}`,
      scheduledDate: callDate,
      completedDate: null,
      notes: 'Call booked in advance',
      leadId: null,
      pipelineItemId: null,
      previousStatus: SALES_PROCESS_STATUSES.CALL_PROPOSED,
      newStatus: SALES_PROCESS_STATUSES.CALL_BOOKED,
      previousCategory: null,
      newCategory: 'Calls'
    });
  }
  
  return { items, activities };
}

// Helper functions for realistic data generation
function generateFirstName(): string {
  const names = ['James', 'John', 'Robert', 'Michael', 'William', 'David', 'Richard', 'Joseph', 'Thomas', 'Mary', 'Patricia', 'Jennifer', 'Linda', 'Elizabeth', 'Barbara', 'Susan', 'Jessica', 'Sarah', 'Karen', 'Lisa', 'Helen', 'Emma', 'Charlotte', 'Lucy', 'Grace', 'Sophie', 'Hannah', 'Chloe', 'Isabella', 'Amelia'];
  return names[Math.floor(Math.random() * names.length)];
}

function generateLastName(): string {
  const names = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez', 'Anderson', 'Taylor', 'Thomas', 'Hernandez', 'Moore', 'Wilson', 'Thompson', 'White', 'Clark', 'Lewis', 'Robinson', 'Walker', 'Perez', 'Hall', 'Young', 'Allen', 'King', 'Wright', 'Scott', 'Torres'];
  return names[Math.floor(Math.random() * names.length)];
}

function generateCompanyName(): string {
  const prefixes = ['Global', 'Advanced', 'Premier', 'Elite', 'Strategic', 'Dynamic', 'Innovation', 'Future', 'Smart', 'Digital'];
  const suffixes = ['Solutions', 'Technologies', 'Systems', 'Group', 'Partners', 'Consulting', 'Industries', 'Enterprises', 'Corp', 'Ltd'];
  const middle = INDUSTRIES[Math.floor(Math.random() * INDUSTRIES.length)];
  
  return `${prefixes[Math.floor(Math.random() * prefixes.length)]} ${middle} ${suffixes[Math.floor(Math.random() * suffixes.length)]}`;
}

function generatePartnerCompanyName(): string {
  const types = ['Agency', 'Consultancy', 'Services', 'Solutions', 'Partners', 'Group', 'Associates', 'Specialists'];
  const industry = INDUSTRIES[Math.floor(Math.random() * INDUSTRIES.length)];
  return `${industry} ${types[Math.floor(Math.random() * types.length)]}`;
}

function generateJobTitle(): string {
  const levels = ['Senior', 'Lead', 'Principal', 'Head of', 'VP of', 'Director of', 'Chief'];
  const roles = ['Marketing', 'Sales', 'Business Development', 'Operations', 'Strategy', 'Communications', 'Product', 'Technology'];
  const titles = ['Manager', 'Executive', 'Officer', 'Specialist', 'Consultant', 'Analyst'];
  
  if (Math.random() > 0.7) {
    return `${levels[Math.floor(Math.random() * levels.length)]} ${roles[Math.floor(Math.random() * roles.length)]}`;
  } else {
    return `${roles[Math.floor(Math.random() * roles.length)]} ${titles[Math.floor(Math.random() * titles.length)]}`;
  }
}

function generatePhoneNumber(): string {
  return `+44 ${Math.floor(Math.random() * 900) + 100} ${Math.floor(Math.random() * 900) + 100} ${Math.floor(Math.random() * 9000) + 1000}`;
}

function generateInitialNotes(bdr: string): string {
  const notes = [
    'Initial contact made via LinkedIn',
    'Responded positively to outreach email',
    'Expressed interest in partnership opportunities',
    'Looking to expand market presence',
    'Interested in lead generation solutions',
    'Currently reviewing marketing options',
    'Budget available for Q2 initiatives'
  ];
  return `${bdr}: ${notes[Math.floor(Math.random() * notes.length)]}`;
}

function generateCallNotes(): string {
  const notes = [
    'Good discovery call, identified clear pain points',
    'Enthusiastic about partnership possibilities',
    'Budget confirmed, decision-maker identified',
    'Detailed discussion about target audience',
    'Reviewed current marketing challenges',
    'Strong fit for our services',
    'Urgent need for lead generation'
  ];
  return notes[Math.floor(Math.random() * notes.length)];
}

function generatePartnerNotes(): string {
  const notes = [
    'Potential high-value partner',
    'Good network in target industry',
    'Previously successful collaborations',
    'Strong reputation in market',
    'Interested in mutual referrals',
    'Budget available for partnerships',
    'Strategic fit identified'
  ];
  return notes[Math.floor(Math.random() * notes.length)];
}

function determineLeadStatus(): string {
  // This will be updated based on pipeline progression
  return 'Call Booked';
}

function determineCallOutcome(): string {
  const rand = Math.random();
  if (rand < CONVERSION_RATES.callToProposal * 0.6) {
    return SALES_PROCESS_STATUSES.HARD_YES_AGREEMENT;
  } else if (rand < CONVERSION_RATES.callToProposal) {
    return Math.random() > 0.5 ? SALES_PROCESS_STATUSES.SOFT_YES_PROPOSAL : SALES_PROCESS_STATUSES.SOFT_YES_MEDIA;
  } else {
    return SALES_PROCESS_STATUSES.DECLINED;
  }
}

function determineListOutcome(): string {
  const rand = Math.random();
  if (rand < CONVERSION_RATES.listOutToSale) {
    return SALES_PROCESS_STATUSES.SOLD;
  } else if (rand < 0.7) {
    return SALES_PROCESS_STATUSES.LIST_OUT_NOT_SOLD;
  } else {
    return SALES_PROCESS_STATUSES.FREE_QA_OFFERED;
  }
}

function determinePartnerStatus(): string {
  const statuses = ['Contacted', 'Interested', 'Declined', 'Sold', 'Follow-up Required'];
  return statuses[Math.floor(Math.random() * statuses.length)];
}

function generateDealValue(): number {
  // Realistic deal values based on their business
  const baseValues = [2500, 3000, 3500, 4000, 4500, 5000, 6000, 7500, 10000];
  return baseValues[Math.floor(Math.random() * baseValues.length)];
}

function generateDeclineReason(): string {
  const reasons = [
    'Budget constraints this quarter',
    'Already working with competitor',
    'Not a priority right now',
    'Internal resource availability issues',
    'Timing not right',
    'Different approach preferred',
    'Need to discuss with team'
  ];
  return reasons[Math.floor(Math.random() * reasons.length)];
}

function getListOutcomeDescription(status: string): string {
  switch (status) {
    case SALES_PROCESS_STATUSES.SOLD:
      return 'Partner list resulted in sale';
    case SALES_PROCESS_STATUSES.LIST_OUT_NOT_SOLD:
      return 'Partner list sent but no sales yet';
    case SALES_PROCESS_STATUSES.FREE_QA_OFFERED:
      return 'Offered free Q&A instead';
    default:
      return 'List outcome determined';
  }
}

function getListOutcomeNotes(status: string): string {
  switch (status) {
    case SALES_PROCESS_STATUSES.SOLD:
      return `First sale achieved from partner list - ${Math.floor(Math.random() * 3) + 1} partners responded positively`;
    case SALES_PROCESS_STATUSES.LIST_OUT_NOT_SOLD:
      return 'No immediate sales from partner outreach, following up with additional contacts';
    case SALES_PROCESS_STATUSES.FREE_QA_OFFERED:
      return 'Offered free Q&A to maintain relationship and potential future opportunities';
    default:
      return 'Partner list results documented';
  }
}

async function printTestDataSummary() {
  console.log('\n📊 TEST DATA SUMMARY:');
  
  const totalLeads = await prisma.lead.count();
  const totalPipelineItems = await prisma.pipelineItem.count();
  const totalActivities = await prisma.activityLog.count();
  
  console.log(`📋 Total Leads: ${totalLeads}`);
  console.log(`🔗 Total Pipeline Items: ${totalPipelineItems}`);
  console.log(`📝 Total Activities: ${totalActivities}`);
  
  // Status breakdown
  const statusBreakdown = await prisma.pipelineItem.groupBy({
    by: ['status'],
    _count: { status: true }
  });
  
  console.log('\n📈 STATUS BREAKDOWN:');
  statusBreakdown.forEach(item => {
    console.log(`   ${item.status}: ${item._count.status}`);
  });
  
  // BDR breakdown
  const bdrBreakdown = await prisma.pipelineItem.groupBy({
    by: ['bdr'],
    _count: { bdr: true }
  });
  
  console.log('\n👥 BDR BREAKDOWN:');
  bdrBreakdown.forEach(item => {
    console.log(`   ${item.bdr}: ${item._count.bdr}`);
  });
  
  // Future calls
  const futureCalls = await prisma.pipelineItem.count({
    where: {
      callDate: {
        gt: new Date()
      }
    }
  });
  
  console.log(`\n📅 Future Calls Scheduled: ${futureCalls}`);
}

// Main execution
const CONFIG: TestDataConfig = {
  totalMainLeads: 150,           // 150 main leads
  daysBackToGenerate: 90,        // 90 days of historical data
  daysForwardToGenerate: 30,     // 30 days of future calls
  includePartnerLists: true,     // Include partner sublists
  includeActivityLogs: true      // Include activity tracking
};

async function main() {
  try {
    console.log('🗑️ Clearing existing test data...');
    
    // Clear existing data in correct order
    await prisma.activityLog.deleteMany({});
    await prisma.pipelineItem.deleteMany({});
    await prisma.lead.deleteMany({});
    
    console.log('✅ Existing data cleared');
    
    await createComprehensiveSalesTestData(CONFIG);
    
  } catch (error) {
    console.error('❌ Error in main execution:', error);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  main().catch(console.error);
}

export { createComprehensiveSalesTestData, CONFIG }; 