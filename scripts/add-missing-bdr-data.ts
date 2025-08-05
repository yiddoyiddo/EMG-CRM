import { PrismaClient } from '@prisma/client';
import { addDays, subDays, addHours, subHours, addMinutes, format } from 'date-fns';

const prisma = new PrismaClient();

// Status definitions
const STATUSES = {
  CALL_PROPOSED: 'Call Proposed',
  CALL_BOOKED: 'Call Booked',
  CALL_COMPLETED: 'Call Completed',
  CALL_NO_SHOW: 'No Show',
  CALL_RESCHEDULED: 'Rescheduled',
  AGREEMENT_PROFILE: 'Agreement - Profile',
  AGREEMENT_MEDIA: 'Agreement - Media',
  LIST_OUT: 'List Out',
  LIST_OUT_NOT_SOLD: 'List Out - Not Sold',
  SOLD: 'Sold'
};

const ALL_BDR_NAMES = [
  'Dan Reeves', 'Jess Collins', 'Jamie Waite', 'Stephen Vivian', 
  'Thomas Hardy', 'Adel Mhiri', 'Gary Smith', 'Naeem Patel',
  'Jennifer Davies', 'Verity Kay', 'Rupert Kay', 'Mark Cawston', 'Thomas Corcoran'
];

const MISSING_BDRS = [
  'Dan Reeves', 'Jess Collins', 'Jamie Waite', 'Adel Mhiri', 
  'Gary Smith', 'Jennifer Davies', 'Mark Cawston'
];

const LEAD_SOURCES = ['LinkedIn', 'Email', 'Phone', 'Lead Gen Team', 'Referral'];

const INDUSTRIES = [
  'Technology', 'Healthcare', 'Finance', 'Manufacturing', 'Retail',
  'Construction', 'Energy', 'Telecommunications', 'Media', 'Education',
  'Automotive', 'Real Estate', 'Legal Services', 'Consulting'
];

async function addMissingBdrData() {
  console.log('🚀 Adding test data for missing BDRs...');
  
  const now = new Date();
  const results = {
    leads: 0,
    pipelineItems: 0,
    activityLogs: 0
  };
  
  try {
    // Get existing data to avoid conflicts
    const existingLeads = await prisma.lead.findMany();
    const existingEmails = new Set(existingLeads.map(l => l.email).filter(Boolean));
    const existingNames = new Set(existingLeads.map(l => l.name.toLowerCase()));
    
    console.log(`📊 Found ${existingLeads.length} existing leads`);
    console.log(`🎯 Adding data for ${MISSING_BDRS.length} missing BDRs: ${MISSING_BDRS.join(', ')}`);
    
    // Add comprehensive data for each missing BDR
    for (const bdr of MISSING_BDRS) {
      console.log(`\n👤 Adding data for ${bdr}...`);
      
      // 1. Add leads with various statuses
      await addBdrLeadsWithVariousStatuses(bdr, results, existingEmails, existingNames);
      
      // 2. Add lists out with subitems
      await addBdrListsOut(bdr, results, existingEmails, existingNames);
      
      // 3. Add sold lists with deal updates
      await addBdrSoldLists(bdr, results, existingEmails, existingNames);
      
      // 4. Add conversion examples
      await addBdrConversionExamples(bdr, results, existingEmails, existingNames);
      
      // 5. Add future calls
      await addBdrFutureCalls(bdr, results, existingEmails, existingNames);
    }
    
    console.log('\n✅ Missing BDR data addition completed!');
    console.log(`📈 Added: ${results.leads} leads, ${results.pipelineItems} pipeline items, ${results.activityLogs} activities`);
    
    await printBdrDataSummary();
    
  } catch (error) {
    console.error('❌ Error adding missing BDR data:', error);
    throw error;
  }
}

async function addBdrLeadsWithVariousStatuses(bdr: string, results: any, existingEmails: Set<string>, existingNames: Set<string>) {
  const statuses = [
    STATUSES.CALL_BOOKED,
    STATUSES.CALL_COMPLETED,
    STATUSES.AGREEMENT_PROFILE,
    STATUSES.AGREEMENT_MEDIA,
    STATUSES.CALL_NO_SHOW,
    STATUSES.CALL_RESCHEDULED
  ];
  
  for (let i = 0; i < 12; i++) { // 2 leads per status
    const status = statuses[i % statuses.length];
    const leadData = await createUniqueLead(`${bdr}-${i}`, bdr, status, existingEmails, existingNames);
    
    if (leadData) {
      // Create lead
      const lead = await prisma.lead.create({ data: leadData.lead });
      results.leads++;
      
      // Create pipeline item with appropriate call date
      const pipelineData = createPipelineItemWithStatus(lead, status, leadData.callDate);
      const pipelineItem = await prisma.pipelineItem.create({ data: pipelineData });
      results.pipelineItems++;
      
      // Create activity log
      const activityLog = createActivityLogForStatus(lead, pipelineItem, status, leadData.callDate);
      await prisma.activityLog.create({ data: activityLog });
      results.activityLogs++;
      
      existingEmails.add(leadData.lead.email);
      existingNames.add(leadData.lead.name.toLowerCase());
    }
  }
}

async function addBdrListsOut(bdr: string, results: any, existingEmails: Set<string>, existingNames: Set<string>) {
  for (let i = 0; i < 3; i++) { // 3 lists out per BDR
    const leadData = await createUniqueLead(`${bdr}-list-${i}`, bdr, STATUSES.LIST_OUT, existingEmails, existingNames);
    
    if (leadData) {
      // Create lead
      const lead = await prisma.lead.create({ data: leadData.lead });
      results.leads++;
      
      // Create main pipeline item (list out)
      const mainPipelineData = createPipelineItemWithStatus(lead, STATUSES.LIST_OUT, leadData.callDate);
      const mainPipelineItem = await prisma.pipelineItem.create({ data: mainPipelineData });
      results.pipelineItems++;
      
      // Create sublist container
      const sublistContainer = {
        ...mainPipelineData,
        isSublist: true,
        sublistName: `${leadData.lead.company} Partner List`,
        notes: 'Partner list with subitems - no sales yet',
        sortOrder: 1
      };
      const sublistItem = await prisma.pipelineItem.create({ data: sublistContainer });
      results.pipelineItems++;
      
      // Create subitems (3-8 partners)
      const partnerCount = Math.floor(Math.random() * 6) + 3;
      for (let j = 0; j < partnerCount; j++) {
        const partnerData = createPartnerSubitem(lead, bdr, j);
        const partnerItem = await prisma.pipelineItem.create({ data: partnerData });
        results.pipelineItems++;
        
        // Create activity log for partner
        const partnerActivity = {
          timestamp: new Date(),
          bdr: bdr,
          activityType: 'Partner_Added',
          description: `Partner added to list: ${partnerData.name}`,
          scheduledDate: null,
          completedDate: new Date(),
          notes: 'Added to partner list - no sale yet',
          leadId: lead.id,
          pipelineItemId: partnerItem.id,
          previousStatus: null,
          newStatus: partnerData.status,
          previousCategory: null,
          newCategory: 'Lists_Media_QA'
        };
        await prisma.activityLog.create({ data: partnerActivity });
        results.activityLogs++;
      }
      
      existingEmails.add(leadData.lead.email);
      existingNames.add(leadData.lead.name.toLowerCase());
    }
  }
}

async function addBdrSoldLists(bdr: string, results: any, existingEmails: Set<string>, existingNames: Set<string>) {
  for (let i = 0; i < 2; i++) { // 2 sold lists per BDR
    const leadData = await createUniqueLead(`${bdr}-sold-${i}`, bdr, STATUSES.SOLD, existingEmails, existingNames);
    
    if (leadData) {
      // Create lead
      const lead = await prisma.lead.create({ data: leadData.lead });
      results.leads++;
      
      // Create main pipeline item (sold)
      const mainPipelineData = createPipelineItemWithStatus(lead, STATUSES.SOLD, leadData.callDate);
      const mainPipelineItem = await prisma.pipelineItem.create({ data: mainPipelineData });
      results.pipelineItems++;
      
      // Create sublist container
      const sublistContainer = {
        ...mainPipelineData,
        isSublist: true,
        sublistName: `${leadData.lead.company} Partner List`,
        notes: 'Partner list with successful sales',
        sortOrder: 1
      };
      const sublistItem = await prisma.pipelineItem.create({ data: sublistContainer });
      results.pipelineItems++;
      
      // Create subitems with deal updates (5-12 partners)
      const partnerCount = Math.floor(Math.random() * 8) + 5;
      for (let j = 0; j < partnerCount; j++) {
        const dealAmount = Math.random() > 0.6 ? generateDealAmount() : null; // 40% have deals
        const partnerData = createPartnerSubitemWithDeal(lead, bdr, j, dealAmount);
        const partnerItem = await prisma.pipelineItem.create({ data: partnerData });
        results.pipelineItems++;
        
        // Create activity log for partner with deal update
        const dealUpdate = dealAmount ? `Deal closed: ${formatCurrency(dealAmount)}` : 'Partner contacted - no deal yet';
        const partnerActivity = {
          timestamp: new Date(),
          bdr: bdr,
          activityType: dealAmount ? 'Deal_Closed' : 'Partner_Contacted',
          description: dealAmount ? `Deal closed with ${partnerData.name}` : `Partner contacted: ${partnerData.name}`,
          scheduledDate: null,
          completedDate: new Date(),
          notes: dealUpdate,
          leadId: lead.id,
          pipelineItemId: partnerItem.id,
          previousStatus: null,
          newStatus: partnerData.status,
          previousCategory: null,
          newCategory: 'Lists_Media_QA'
        };
        await prisma.activityLog.create({ data: partnerActivity });
        results.activityLogs++;
      }
      
      existingEmails.add(leadData.lead.email);
      existingNames.add(leadData.lead.name.toLowerCase());
    }
  }
}

async function addBdrConversionExamples(bdr: string, results: any, existingEmails: Set<string>, existingNames: Set<string>) {
  const dispositions = [
    STATUSES.SOLD,
    STATUSES.AGREEMENT_PROFILE,
    STATUSES.AGREEMENT_MEDIA,
    STATUSES.LIST_OUT
  ];
  
  for (let i = 0; i < 8; i++) { // 2 examples per disposition
    const disposition = dispositions[i % dispositions.length];
    const leadData = await createUniqueLead(`${bdr}-conv-${i}`, bdr, disposition, existingEmails, existingNames);
    
    if (leadData) {
      // Create lead
      const lead = await prisma.lead.create({ data: leadData.lead });
      results.leads++;
      
      // Create pipeline progression: Call Booked -> Call Completed -> Disposition
      const callBookedDate = subDays(leadData.callDate, 3);
      const callCompletedDate = leadData.callDate;
      const dispositionDate = addDays(leadData.callDate, 1);
      
      // Call Booked stage
      const callBookedData = createPipelineItemWithStatus(lead, STATUSES.CALL_BOOKED, leadData.callDate);
      const callBookedItem = await prisma.pipelineItem.create({ data: callBookedData });
      results.pipelineItems++;
      
      // Call Completed stage
      const callCompletedData = {
        ...callBookedData,
        status: STATUSES.CALL_COMPLETED,
        lastUpdated: callCompletedDate
      };
      const callCompletedItem = await prisma.pipelineItem.create({ data: callCompletedData });
      results.pipelineItems++;
      
      // Final disposition stage
      const dispositionData = {
        ...callCompletedData,
        status: disposition,
        lastUpdated: dispositionDate,
        value: disposition === STATUSES.SOLD ? generateDealAmount() : null,
        probability: disposition === STATUSES.SOLD ? 100 : 75
      };
      const dispositionItem = await prisma.pipelineItem.create({ data: dispositionData });
      results.pipelineItems++;
      
      // Create activity logs for the progression
      const activities = [
        {
          timestamp: callBookedDate,
          bdr: bdr,
          activityType: 'Call_Scheduled',
          description: `Call scheduled for ${format(leadData.callDate, 'dd/MM/yy HH:mm')}`,
          scheduledDate: leadData.callDate,
          completedDate: null,
          notes: 'Initial call booked',
          leadId: lead.id,
          pipelineItemId: callBookedItem.id,
          previousStatus: STATUSES.CALL_PROPOSED,
          newStatus: STATUSES.CALL_BOOKED
        },
        {
          timestamp: callCompletedDate,
          bdr: bdr,
          activityType: 'Call_Completed',
          description: 'Call completed successfully',
          scheduledDate: leadData.callDate,
          completedDate: callCompletedDate,
          notes: 'Discovery call completed - positive outcome',
          leadId: lead.id,
          pipelineItemId: callCompletedItem.id,
          previousStatus: STATUSES.CALL_BOOKED,
          newStatus: STATUSES.CALL_COMPLETED
        },
        {
          timestamp: dispositionDate,
          bdr: bdr,
          activityType: 'Status_Change',
          description: `Converted to ${disposition}`,
          scheduledDate: null,
          completedDate: dispositionDate,
          notes: getDispositionNotes(disposition),
          leadId: lead.id,
          pipelineItemId: dispositionItem.id,
          previousStatus: STATUSES.CALL_COMPLETED,
          newStatus: disposition
        }
      ];
      
      for (const activity of activities) {
        await prisma.activityLog.create({ data: activity });
        results.activityLogs++;
      }
      
      existingEmails.add(leadData.lead.email);
      existingNames.add(leadData.lead.name.toLowerCase());
    }
  }
}

async function addBdrFutureCalls(bdr: string, results: any, existingEmails: Set<string>, existingNames: Set<string>) {
  const now = new Date();
  const endDate = addDays(now, 30);
  
  for (let i = 0; i < 5; i++) { // 5 future calls per BDR
    const callDate = new Date(now.getTime() + Math.random() * (endDate.getTime() - now.getTime()));
    const bookedDate = subDays(callDate, Math.floor(Math.random() * 5) + 1);
    
    // Generate unique data
    const firstName = generateFirstName();
    const lastName = generateLastName();
    const company = generateCompanyName();
    const email = `future.${bdr.toLowerCase().replace(/\s+/g, '')}.${i}@${company.toLowerCase().replace(/\s+/g, '')}.com`;
    const name = `${firstName} ${lastName} (${bdr} Future ${i})`;
    
    // Check if unique
    if (!existingEmails.has(email) && !existingNames.has(name.toLowerCase())) {
      const futureCallItem = {
        name: name,
        title: generateJobTitle(),
        addedDate: bookedDate,
        lastUpdated: bookedDate,
        bdr: bdr,
        company: company,
        category: 'Calls',
        status: STATUSES.CALL_BOOKED,
        value: null,
        probability: null,
        expectedCloseDate: null,
        link: null,
        phone: generatePhoneNumber(),
        notes: 'Future call scheduled',
        email: email,
        leadId: null,
        callDate: callDate,
        parentId: null,
        isSublist: false,
        sublistName: null,
        sortOrder: null
      };
      
      const pipelineItem = await prisma.pipelineItem.create({ data: futureCallItem });
      results.pipelineItems++;
      
      const activity = {
        timestamp: bookedDate,
        bdr: bdr,
        activityType: 'Call_Scheduled',
        description: `Future call scheduled for ${format(callDate, 'dd/MM/yy HH:mm')}`,
        scheduledDate: callDate,
        completedDate: null,
        notes: 'Call booked in advance',
        leadId: null,
        pipelineItemId: pipelineItem.id,
        previousStatus: STATUSES.CALL_PROPOSED,
        newStatus: STATUSES.CALL_BOOKED,
        previousCategory: null,
        newCategory: 'Calls'
      };
      
      await prisma.activityLog.create({ data: activity });
      results.activityLogs++;
      
      existingEmails.add(email);
      existingNames.add(name.toLowerCase());
    }
  }
}

async function createUniqueLead(identifier: string, bdr: string, status: string, existingEmails: Set<string>, existingNames: Set<string>) {
  let attempts = 0;
  const maxAttempts = 10;
  
  while (attempts < maxAttempts) {
    const firstName = generateFirstName();
    const lastName = generateLastName();
    const company = generateCompanyName();
    const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}.${identifier.toLowerCase().replace(/\s+/g, '')}@${company.toLowerCase().replace(/\s+/g, '')}.com`;
    const name = `${firstName} ${lastName} (${identifier})`;
    
    // Check if this combination is unique
    if (!existingEmails.has(email) && !existingNames.has(name.toLowerCase())) {
      const callDate = getCallDateForStatus(status);
      
      return {
        lead: {
          name: name,
          title: generateJobTitle(),
          addedDate: subDays(callDate, 7),
          bdr,
          company,
          source: LEAD_SOURCES[Math.floor(Math.random() * LEAD_SOURCES.length)],
          status: status,
          link: `https://linkedin.com/in/${firstName.toLowerCase()}-${lastName.toLowerCase()}-${identifier.toLowerCase().replace(/\s+/g, '')}`,
          phone: generatePhoneNumber(),
          notes: generateInitialNotes(bdr),
          email: email
        },
        callDate: callDate
      };
    }
    attempts++;
  }
  
  console.log(`⚠️ Could not generate unique lead data after ${maxAttempts} attempts for ${identifier}`);
  return null;
}

function getCallDateForStatus(status: string): Date {
  const now = new Date();
  
  switch (status) {
    case STATUSES.CALL_BOOKED:
      // Future call dates
      return addDays(now, Math.floor(Math.random() * 14) + 3);
    case STATUSES.CALL_COMPLETED:
    case STATUSES.CALL_NO_SHOW:
    case STATUSES.CALL_RESCHEDULED:
      // Past call dates (today, past week, past month)
      const daysAgo = Math.floor(Math.random() * 30) + 1;
      return subDays(now, daysAgo);
    case STATUSES.AGREEMENT_PROFILE:
    case STATUSES.AGREEMENT_MEDIA:
      // Past call dates (recent)
      return subDays(now, Math.floor(Math.random() * 14) + 1);
    case STATUSES.LIST_OUT:
    case STATUSES.LIST_OUT_NOT_SOLD:
    case STATUSES.SOLD:
      // Past call dates (older)
      return subDays(now, Math.floor(Math.random() * 60) + 15);
    default:
      return now;
  }
}

function createPipelineItemWithStatus(lead: any, status: string, callDate: Date) {
  return {
    name: lead.name,
    title: lead.title,
    addedDate: lead.addedDate,
    lastUpdated: new Date(),
    bdr: lead.bdr,
    company: lead.company,
    category: getCategoryForStatus(status),
    status: status,
    value: status === STATUSES.SOLD ? generateDealAmount() : null,
    probability: getProbabilityForStatus(status),
    expectedCloseDate: status.includes('Agreement') ? addDays(new Date(), 30) : null,
    link: lead.link,
    phone: lead.phone,
    notes: lead.notes,
    email: lead.email,
    leadId: lead.id,
    callDate: status === STATUSES.CALL_PROPOSED ? null : callDate,
    parentId: null,
    isSublist: false,
    sublistName: null,
    sortOrder: null
  };
}

function createPartnerSubitem(lead: any, bdr: string, index: number) {
  const partnerName = `${generateFirstName()} ${generateLastName()}`;
  const partnerCompany = generatePartnerCompanyName();
  
  return {
    name: partnerName,
    title: generateJobTitle(),
    addedDate: new Date(),
    lastUpdated: new Date(),
    bdr: bdr,
    company: partnerCompany,
    category: 'Lists_Media_QA',
    status: 'Contacted',
    value: null,
    probability: Math.floor(Math.random() * 50) + 10,
    expectedCloseDate: null,
    link: null,
    phone: generatePhoneNumber(),
    notes: 'Partner contact - no sale yet',
    email: `${partnerName.split(' ')[0].toLowerCase()}@${partnerCompany.toLowerCase().replace(/\s+/g, '')}.com`,
    leadId: lead.id,
    callDate: null,
    parentId: null, // Will be set after creation
    isSublist: false,
    sublistName: null,
    sortOrder: index + 2
  };
}

function createPartnerSubitemWithDeal(lead: any, bdr: string, index: number, dealAmount: number | null) {
  const partnerName = `${generateFirstName()} ${generateLastName()}`;
  const partnerCompany = generatePartnerCompanyName();
  
  return {
    name: partnerName,
    title: generateJobTitle(),
    addedDate: new Date(),
    lastUpdated: new Date(),
    bdr: bdr,
    company: partnerCompany,
    category: 'Lists_Media_QA',
    status: dealAmount ? 'Sold' : 'Contacted',
    value: dealAmount,
    probability: dealAmount ? 100 : Math.floor(Math.random() * 50) + 10,
    expectedCloseDate: dealAmount ? new Date() : null,
    link: null,
    phone: generatePhoneNumber(),
    notes: dealAmount ? `Deal closed: ${formatCurrency(dealAmount)}` : 'Partner contacted',
    email: `${partnerName.split(' ')[0].toLowerCase()}@${partnerCompany.toLowerCase().replace(/\s+/g, '')}.com`,
    leadId: lead.id,
    callDate: null,
    parentId: null, // Will be set after creation
    isSublist: false,
    sublistName: null,
    sortOrder: index + 2
  };
}

function createActivityLogForStatus(lead: any, pipelineItem: any, status: string, callDate: Date) {
  return {
    timestamp: new Date(),
    bdr: lead.bdr,
    activityType: getActivityTypeForStatus(status),
    description: getActivityDescriptionForStatus(status),
    scheduledDate: status === STATUSES.CALL_BOOKED ? callDate : null,
    completedDate: status !== STATUSES.CALL_BOOKED ? new Date() : null,
    notes: getActivityNotesForStatus(status),
    leadId: lead.id,
    pipelineItemId: pipelineItem.id,
    previousStatus: null,
    newStatus: status,
    previousCategory: null,
    newCategory: getCategoryForStatus(status)
  };
}

// Helper functions
function generateFirstName(): string {
  const names = ['James', 'John', 'Robert', 'Michael', 'William', 'David', 'Richard', 'Joseph', 'Thomas', 'Mary', 'Patricia', 'Jennifer', 'Linda', 'Elizabeth', 'Barbara', 'Susan', 'Jessica', 'Sarah', 'Karen', 'Lisa'];
  return names[Math.floor(Math.random() * names.length)];
}

function generateLastName(): string {
  const names = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez', 'Anderson', 'Taylor', 'Thomas', 'Hernandez', 'Moore'];
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
    'Interested in lead generation solutions'
  ];
  return `${bdr}: ${notes[Math.floor(Math.random() * notes.length)]}`;
}

function generateDealAmount(): number {
  const amounts = [2500, 3000, 3500, 4000, 4500, 5000, 6000, 7500, 10000];
  return amounts[Math.floor(Math.random() * amounts.length)];
}

function formatCurrency(amount: number): string {
  return Math.random() > 0.5 ? `£${amount}` : `$${amount}`;
}

function getCategoryForStatus(status: string): string {
  switch (status) {
    case STATUSES.CALL_PROPOSED:
    case STATUSES.CALL_BOOKED:
    case STATUSES.CALL_COMPLETED:
    case STATUSES.CALL_NO_SHOW:
    case STATUSES.CALL_RESCHEDULED:
      return 'Calls';
    case STATUSES.AGREEMENT_PROFILE:
    case STATUSES.AGREEMENT_MEDIA:
      return 'Pipeline';
    case STATUSES.LIST_OUT:
    case STATUSES.LIST_OUT_NOT_SOLD:
    case STATUSES.SOLD:
      return 'Lists_Media_QA';
    default:
      return 'Pipeline';
  }
}

function getProbabilityForStatus(status: string): number {
  switch (status) {
    case STATUSES.SOLD:
      return 100;
    case STATUSES.AGREEMENT_PROFILE:
    case STATUSES.AGREEMENT_MEDIA:
      return 75;
    case STATUSES.LIST_OUT:
      return 60;
    case STATUSES.CALL_BOOKED:
      return 25;
    default:
      return 50;
  }
}

function getActivityTypeForStatus(status: string): string {
  switch (status) {
    case STATUSES.CALL_BOOKED:
      return 'Call_Scheduled';
    case STATUSES.CALL_COMPLETED:
      return 'Call_Completed';
    case STATUSES.CALL_NO_SHOW:
      return 'Call_No_Show';
    case STATUSES.CALL_RESCHEDULED:
      return 'Call_Rescheduled';
    case STATUSES.AGREEMENT_PROFILE:
    case STATUSES.AGREEMENT_MEDIA:
      return 'Agreement_Sent';
    case STATUSES.LIST_OUT:
    case STATUSES.LIST_OUT_NOT_SOLD:
      return 'List_Sent';
    case STATUSES.SOLD:
      return 'Deal_Closed';
    default:
      return 'Status_Change';
  }
}

function getActivityDescriptionForStatus(status: string): string {
  switch (status) {
    case STATUSES.CALL_BOOKED:
      return 'Call scheduled';
    case STATUSES.CALL_COMPLETED:
      return 'Call completed successfully';
    case STATUSES.CALL_NO_SHOW:
      return 'Call - no show';
    case STATUSES.CALL_RESCHEDULED:
      return 'Call rescheduled';
    case STATUSES.AGREEMENT_PROFILE:
      return 'Agreement sent - Profile';
    case STATUSES.AGREEMENT_MEDIA:
      return 'Agreement sent - Media';
    case STATUSES.LIST_OUT:
      return 'Partner list sent';
    case STATUSES.LIST_OUT_NOT_SOLD:
      return 'Partner list sent - no sales yet';
    case STATUSES.SOLD:
      return 'Deal closed successfully';
    default:
      return 'Status updated';
  }
}

function getActivityNotesForStatus(status: string): string {
  switch (status) {
    case STATUSES.CALL_BOOKED:
      return 'Initial call scheduled';
    case STATUSES.CALL_COMPLETED:
      return 'Discovery call completed - positive outcome';
    case STATUSES.CALL_NO_SHOW:
      return 'Client did not attend scheduled call';
    case STATUSES.CALL_RESCHEDULED:
      return 'Call rescheduled due to client request';
    case STATUSES.AGREEMENT_PROFILE:
      return 'Agreement sent for profile service';
    case STATUSES.AGREEMENT_MEDIA:
      return 'Agreement sent for media sales service';
    case STATUSES.LIST_OUT:
      return 'Partner list sent to client';
    case STATUSES.LIST_OUT_NOT_SOLD:
      return 'Partner list sent but no sales yet';
    case STATUSES.SOLD:
      return 'Deal successfully closed';
    default:
      return 'Status change recorded';
  }
}

function getDispositionNotes(disposition: string): string {
  switch (disposition) {
    case STATUSES.SOLD:
      return 'Successfully converted to sale';
    case STATUSES.AGREEMENT_PROFILE:
      return 'Agreement reached for profile service';
    case STATUSES.AGREEMENT_MEDIA:
      return 'Agreement reached for media sales';
    case STATUSES.LIST_OUT:
      return 'Converted to partner list';
    default:
      return 'Converted from call booked';
  }
}

async function printBdrDataSummary() {
  console.log('\n📊 BDR DATA SUMMARY:');
  
  const totalLeads = await prisma.lead.count();
  const totalPipelineItems = await prisma.pipelineItem.count();
  const totalActivities = await prisma.activityLog.count();
  
  console.log(`📋 Total Leads: ${totalLeads}`);
  console.log(`🔗 Total Pipeline Items: ${totalPipelineItems}`);
  console.log(`📝 Total Activities: ${totalActivities}`);
  
  // BDR breakdown
  const bdrBreakdown = await prisma.pipelineItem.groupBy({
    by: ['bdr'],
    _count: { bdr: true }
  });
  
  console.log('\n👥 BDR BREAKDOWN:');
  bdrBreakdown.forEach(item => {
    console.log(`   ${item.bdr}: ${item._count.bdr}`);
  });
  
  // Check if all BDRs have data
  const bdrsWithData = bdrBreakdown.map(item => item.bdr);
  const missingBdrs = ALL_BDR_NAMES.filter(bdr => !bdrsWithData.includes(bdr));
  
  if (missingBdrs.length > 0) {
    console.log(`\n⚠️  Missing BDRs: ${missingBdrs.join(', ')}`);
  } else {
    console.log('\n✅ All BDRs now have data!');
  }
  
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

async function main() {
  try {
    console.log('🔍 Checking existing BDR data...');
    
    // Get current data counts
    const existingLeads = await prisma.lead.count();
    const existingPipelineItems = await prisma.pipelineItem.count();
    const existingActivities = await prisma.activityLog.count();
    
    console.log(`📊 Current data: ${existingLeads} leads, ${existingPipelineItems} pipeline items, ${existingActivities} activities`);
    
    await addMissingBdrData();
    
    // Show final counts
    const finalLeads = await prisma.lead.count();
    const finalPipelineItems = await prisma.pipelineItem.count();
    const finalActivities = await prisma.activityLog.count();
    
    console.log(`\n🎉 Final data: ${finalLeads} leads (+${finalLeads - existingLeads}), ${finalPipelineItems} pipeline items (+${finalPipelineItems - existingPipelineItems}), ${finalActivities} activities (+${finalActivities - existingActivities})`);
    
  } catch (error) {
    console.error('❌ Error in main execution:', error);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  main().catch(console.error);
}

export { addMissingBdrData }; 