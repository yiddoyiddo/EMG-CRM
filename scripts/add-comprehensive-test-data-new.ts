import { PrismaClient } from '@prisma/client';
import { addDays, subDays, addHours, subHours, addMinutes, format } from 'date-fns';

const prisma = new PrismaClient();

// Enhanced statuses that reflect the actual sales process
const SALES_PROCESS_STATUSES = {
  // Call stage
  CALL_PROPOSED: 'Call Proposed',
  CALL_BOOKED: 'Call Booked', 
  CALL_COMPLETED: 'Call Completed',
  CALL_NO_SHOW: 'No Show',
  CALL_RESCHEDULED: 'Rescheduled',
  
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

async function deleteExistingPipelineData() {
  console.log('🗑️ Deleting existing pipeline data...');
  
  // Delete all pipeline items and their activity logs
  await prisma.activityLog.deleteMany({
    where: {
      pipelineItemId: {
        not: null
      }
    }
  });
  
  await prisma.pipelineItem.deleteMany({});
  
  console.log('✅ Pipeline data deleted successfully');
}

async function addComprehensiveTestData(config: TestDataConfig) {
  console.log('🚀 Adding comprehensive test data to existing CRM...');
  
  const now = new Date();
  const startDate = subDays(now, config.daysBackToGenerate);
  const endDate = addDays(now, config.daysForwardToGenerate);
  
  // Get existing data to avoid conflicts
  const existingLeads = await prisma.lead.findMany();
  const existingEmails = new Set(existingLeads.map(l => l.email).filter((email): email is string => email !== null));
  const existingNames = new Set(existingLeads.map(l => l.name.toLowerCase()));
  
  console.log(`📊 Found ${existingLeads.length} existing leads`);
  
  let createdLeads = 0;
  let createdPipelineItems = 0;
  
  for (let i = 0; i < config.totalMainLeads; i++) {
    const bdr = BDR_NAMES[Math.floor(Math.random() * BDR_NAMES.length)];
    const leadAddedDate = new Date(startDate.getTime() + Math.random() * (now.getTime() - startDate.getTime()));
    
    // Create main lead entry with unique data
    const leadData = await createUniqueMainLead(i, bdr, leadAddedDate, existingEmails, existingNames);
    if (leadData) {
      try {
        // Insert the lead into database
        const createdLead = await prisma.lead.create({
          data: leadData
        });
        
        existingEmails.add(leadData.email);
        existingNames.add(leadData.name.toLowerCase());
        createdLeads++;
        
        // Create corresponding pipeline item with realistic progression
        const pipelineData = await createPipelineProgression(leadData, now, config.includePartnerLists);
        if (pipelineData) {
          // Insert main pipeline item
          const mainPipelineItem = await prisma.pipelineItem.create({
            data: {
              ...pipelineData.mainItem,
              leadId: createdLead.id
            }
          });
          createdPipelineItems++;
          
          // If there's a sublist, create it
          if (pipelineData.sublist) {
            const sublist = await prisma.pipelineItem.create({
              data: {
                ...pipelineData.sublist.sublist,
                leadId: createdLead.id,
                parentId: mainPipelineItem.id
              }
            });
            
            // Create partner contacts as subitems
            if (pipelineData.sublist.partnerContacts) {
              for (const partnerContact of pipelineData.sublist.partnerContacts) {
                await prisma.pipelineItem.create({
                  data: {
                    ...partnerContact,
                    leadId: createdLead.id,
                    parentId: sublist.id
                  }
                });
                createdPipelineItems++;
              }
            }
          }
        }
      } catch (error) {
        console.error(`Error creating lead ${i}:`, error);
      }
    }
  }
  
  // Create additional future calls for each BDR
  if (config.includePartnerLists) {
    await createFutureCalls(endDate, BDR_NAMES, existingEmails, existingNames);
  }
  
  console.log(`✅ Generated ${createdLeads} leads and ${createdPipelineItems} pipeline items`);
  
  // Print summary
  await printTestDataSummary();
}

async function createUniqueMainLead(index: number, bdr: string, addedDate: Date, existingEmails: Set<string>, existingNames: Set<string>) {
  let attempts = 0;
  let leadData;
  
  do {
    const firstName = generateFirstName();
    const lastName = generateLastName();
    const name = `${firstName} ${lastName}`;
    const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}@${generateCompanyName().toLowerCase().replace(/\s+/g, '')}.com`;
    
    if (!existingEmails.has(email) && !existingNames.has(name.toLowerCase())) {
      leadData = {
        name,
        title: generateJobTitle(),
        addedDate,
        bdr,
        company: generateCompanyName(),
        source: LEAD_SOURCES[Math.floor(Math.random() * LEAD_SOURCES.length)],
        status: determineLeadStatus(),
        link: `https://linkedin.com/in/${firstName.toLowerCase()}-${lastName.toLowerCase()}`,
        phone: generatePhoneNumber(),
        notes: generateInitialNotes(bdr),
        email
      };
      break;
    }
    attempts++;
  } while (attempts < 10);
  
  if (!leadData) {
    console.log(`⚠️ Could not create unique lead for index ${index}`);
    return null;
  }
  
  return leadData;
}

async function createPipelineProgression(leadData: any, currentDate: Date, includePartnerLists: boolean) {
  const progression = determineSalesProgression(leadData.addedDate, currentDate);
  const callDate = progression.callDate;
  
  // Create main pipeline item
  const pipelineItem = {
    name: leadData.name,
    title: leadData.title,
    addedDate: leadData.addedDate,
    lastUpdated: new Date(),
    bdr: leadData.bdr,
    company: leadData.company,
    category: progression.category,
    status: progression.status,
    value: progression.value,
    probability: progression.probability,
    expectedCloseDate: progression.expectedCloseDate,
    callDate: callDate,
    link: leadData.link,
    phone: leadData.phone,
    notes: progression.notes,
    email: leadData.email,
    leadId: null, // Will be set after lead creation
    isSublist: false,
    sortOrder: null
  };
  
  // If this is a list out or sold status, create sublists
  if (includePartnerLists && (progression.status === 'List Out' || progression.status === 'Sold')) {
    const sublistData = await createPartnerListSublist(pipelineItem, leadData.bdr);
    if (sublistData) {
      return { mainItem: pipelineItem, sublist: sublistData };
    }
  }
  
  return { mainItem: pipelineItem };
}

function determineSalesProgression(startDate: Date, currentDate: Date) {
  const daysSinceStart = Math.floor((currentDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  const random = Math.random();
  
  // Determine call date based on status
  let callDate: Date;
  let status: string;
  let category: string;
  let value: number | null = null;
  let probability: number | null = null;
  let expectedCloseDate: Date | null = null;
  let notes: string;
  
  if (random < 0.15) {
    // Call Booked - future call
    status = SALES_PROCESS_STATUSES.CALL_BOOKED;
    category = 'Calls';
    callDate = addDays(currentDate, Math.floor(Math.random() * 14) + 1); // 1-14 days in future
    notes = generateCallNotes();
  } else if (random < 0.25) {
    // Call Completed - recent call
    status = SALES_PROCESS_STATUSES.CALL_COMPLETED;
    category = 'Calls';
    callDate = subDays(currentDate, Math.floor(Math.random() * 7)); // Past week
    notes = generateCallNotes();
  } else if (random < 0.30) {
    // No Show
    status = SALES_PROCESS_STATUSES.CALL_NO_SHOW;
    category = 'Declined_Rescheduled';
    callDate = subDays(currentDate, Math.floor(Math.random() * 7)); // Past week
    notes = 'Call scheduled but prospect did not show up';
  } else if (random < 0.35) {
    // Rescheduled
    status = SALES_PROCESS_STATUSES.CALL_RESCHEDULED;
    category = 'Declined_Rescheduled';
    callDate = subDays(currentDate, Math.floor(Math.random() * 7)); // Past week
    notes = 'Call rescheduled by prospect';
  } else if (random < 0.45) {
    // Proposal stage
    status = Math.random() < 0.5 ? SALES_PROCESS_STATUSES.SOFT_YES_PROPOSAL : SALES_PROCESS_STATUSES.SOFT_YES_MEDIA;
    category = 'Pipeline';
    callDate = subDays(currentDate, Math.floor(Math.random() * 14) + 7); // Past 1-3 weeks
    value = generateDealValue();
    probability = 60;
    expectedCloseDate = addDays(currentDate, Math.floor(Math.random() * 30) + 15);
    notes = 'Proposal sent, waiting for response';
  } else if (random < 0.55) {
    // Agreement stage
    status = Math.random() < 0.5 ? SALES_PROCESS_STATUSES.HARD_YES_AGREEMENT : SALES_PROCESS_STATUSES.HARD_YES_MEDIA;
    category = 'Pipeline';
    callDate = subDays(currentDate, Math.floor(Math.random() * 21) + 14); // Past 2-5 weeks
    value = generateDealValue();
    probability = 80;
    expectedCloseDate = addDays(currentDate, Math.floor(Math.random() * 14) + 7);
    notes = 'Agreement reached, preparing partner list';
  } else if (random < 0.65) {
    // Partner List Pending
    status = SALES_PROCESS_STATUSES.PARTNER_LIST_PENDING;
    category = 'Lists_Media_QA';
    callDate = subDays(currentDate, Math.floor(Math.random() * 28) + 21); // Past 3-7 weeks
    value = generateDealValue();
    probability = 85;
    expectedCloseDate = addDays(currentDate, Math.floor(Math.random() * 7) + 3);
    notes = 'Agreement confirmed, partner list in preparation';
  } else if (random < 0.75) {
    // Partner List Sent
    status = SALES_PROCESS_STATUSES.PARTNER_LIST_SENT;
    category = 'Lists_Media_QA';
    callDate = subDays(currentDate, Math.floor(Math.random() * 35) + 28); // Past 4-9 weeks
    value = generateDealValue();
    probability = 90;
    expectedCloseDate = addDays(currentDate, Math.floor(Math.random() * 14) + 7);
    notes = 'Partner list sent, waiting for responses';
  } else if (random < 0.85) {
    // List Out - Not Sold
    status = SALES_PROCESS_STATUSES.LIST_OUT_NOT_SOLD;
    category = 'Lists_Media_QA';
    callDate = subDays(currentDate, Math.floor(Math.random() * 42) + 35); // Past 5-11 weeks
    value = generateDealValue();
    probability = 95;
    expectedCloseDate = subDays(currentDate, Math.floor(Math.random() * 7));
    notes = getListOutcomeNotes(status);
  } else {
    // Sold
    status = SALES_PROCESS_STATUSES.SOLD;
    category = 'Lists_Media_QA';
    callDate = subDays(currentDate, Math.floor(Math.random() * 49) + 42); // Past 6-13 weeks
    value = generateDealValue();
    probability = 100;
    expectedCloseDate = subDays(currentDate, Math.floor(Math.random() * 14));
    notes = 'Deal closed successfully';
  }
  
  return {
    status,
    category,
    callDate,
    value,
    probability,
    expectedCloseDate,
    notes
  };
}

async function createPartnerListSublist(mainItem: any, bdr: string) {
  const listSize = Math.floor(Math.random() * 20) + 5; // 5-25 partners
  const sublistName = `${mainItem.company} Partner List`;
  
  // Create sublist container
  const sublist = {
    name: sublistName,
    title: 'Partner List',
    addedDate: mainItem.addedDate,
    lastUpdated: new Date(),
    bdr,
    company: mainItem.company,
    category: 'Lists_Media_QA',
    status: mainItem.status,
    value: mainItem.value,
    probability: mainItem.probability,
    expectedCloseDate: mainItem.expectedCloseDate,
    callDate: null,
    link: null,
    phone: null,
    notes: `Partner list with ${listSize} contacts`,
    email: null,
    leadId: null,
    isSublist: true,
    sublistName: sublistName,
    sortOrder: 1,
    parentId: null
  };
  
  // Create partner contacts as subitems
  const partnerContacts = [];
  for (let i = 0; i < listSize; i++) {
    const partnerContact = {
      name: `${generateFirstName()} ${generateLastName()}`,
      title: generateJobTitle(),
      addedDate: mainItem.addedDate,
      lastUpdated: new Date(),
      bdr,
      company: generatePartnerCompanyName(),
      category: 'Partner_Contacts',
      status: determinePartnerStatus(),
      value: mainItem.status === 'Sold' ? Math.floor(Math.random() * 5000) + 500 : null,
      probability: null,
      expectedCloseDate: null,
      callDate: null,
      link: null,
      phone: generatePhoneNumber(),
      notes: mainItem.status === 'Sold' ? `Deal: £${Math.floor(Math.random() * 5000) + 500}` : generatePartnerNotes(),
      email: `${generateFirstName().toLowerCase()}.${generateLastName().toLowerCase()}@${generatePartnerCompanyName().toLowerCase().replace(/\s+/g, '')}.com`,
      leadId: null,
      isSublist: false,
      sortOrder: i + 1,
      parentId: null // Will be set after sublist creation
    };
    partnerContacts.push(partnerContact);
  }
  
  return { sublist, partnerContacts };
}

async function createFutureCalls(endDate: Date, bdrNames: string[], existingEmails: Set<string>, existingNames: Set<string>) {
  console.log('📅 Creating future calls for each BDR...');
  
  for (const bdr of bdrNames) {
    const callsForBdr = Math.floor(Math.random() * 5) + 2; // 2-7 calls per BDR
    
    for (let i = 0; i < callsForBdr; i++) {
      const callDate = addDays(new Date(), Math.floor(Math.random() * 14) + 1); // 1-14 days in future
      
      let attempts = 0;
      let leadData;
      
      do {
        const firstName = generateFirstName();
        const lastName = generateLastName();
        const name = `${firstName} ${lastName}`;
        const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}@${generateCompanyName().toLowerCase().replace(/\s+/g, '')}.com`;
        
        if (!existingEmails.has(email) && !existingNames.has(name.toLowerCase())) {
          leadData = {
            name,
            title: generateJobTitle(),
            addedDate: new Date(),
            bdr,
            company: generateCompanyName(),
            source: LEAD_SOURCES[Math.floor(Math.random() * LEAD_SOURCES.length)],
            status: 'Call Booked',
            link: `https://linkedin.com/in/${firstName.toLowerCase()}-${lastName.toLowerCase()}`,
            phone: generatePhoneNumber(),
            notes: `Call scheduled for ${format(callDate, 'dd/MM/yyyy HH:mm')}`,
            email
          };
          break;
        }
        attempts++;
      } while (attempts < 10);
      
      if (leadData) {
        try {
          // Insert the lead into database
          const createdLead = await prisma.lead.create({
            data: leadData
          });
          
          existingEmails.add(leadData.email);
          existingNames.add(leadData.name.toLowerCase());
          
          // Create pipeline item for future call
          await prisma.pipelineItem.create({
            data: {
              name: leadData.name,
              title: leadData.title,
              addedDate: leadData.addedDate,
              lastUpdated: new Date(),
              bdr,
              company: leadData.company,
              category: 'Calls',
              status: 'Call Booked',
              value: null,
              probability: null,
              expectedCloseDate: null,
              callDate: callDate,
              link: leadData.link,
              phone: leadData.phone,
              notes: leadData.notes,
              email: leadData.email,
              leadId: createdLead.id,
              isSublist: false,
              sortOrder: null
            }
          });
        } catch (error) {
          console.error(`Error creating future call for ${bdr}:`, error);
        }
      }
    }
  }
}

// Helper functions for generating realistic data
function generateFirstName(): string {
  const names = [
    'James', 'John', 'Robert', 'Michael', 'William', 'David', 'Richard', 'Joseph', 'Thomas', 'Christopher',
    'Charles', 'Daniel', 'Matthew', 'Anthony', 'Mark', 'Donald', 'Steven', 'Paul', 'Andrew', 'Joshua',
    'Kenneth', 'Kevin', 'Brian', 'George', 'Edward', 'Ronald', 'Timothy', 'Jason', 'Jeffrey', 'Ryan',
    'Jacob', 'Gary', 'Nicholas', 'Eric', 'Jonathan', 'Stephen', 'Larry', 'Justin', 'Scott', 'Brandon',
    'Benjamin', 'Samuel', 'Frank', 'Gregory', 'Raymond', 'Alexander', 'Patrick', 'Jack', 'Dennis', 'Jerry',
    'Tyler', 'Aaron', 'Jose', 'Adam', 'Nathan', 'Henry', 'Douglas', 'Zachary', 'Peter', 'Kyle',
    'Walter', 'Ethan', 'Jeremy', 'Harold', 'Carl', 'Keith', 'Roger', 'Gerald', 'Lawrence', 'Sean',
    'Christian', 'Andrew', 'Joshua', 'Kenneth', 'Kevin', 'Brian', 'George', 'Edward', 'Ronald', 'Timothy',
    'Mary', 'Patricia', 'Jennifer', 'Linda', 'Elizabeth', 'Barbara', 'Susan', 'Jessica', 'Sarah', 'Karen',
    'Nancy', 'Lisa', 'Betty', 'Helen', 'Sandra', 'Donna', 'Carol', 'Ruth', 'Sharon', 'Michelle',
    'Laura', 'Emily', 'Kimberly', 'Deborah', 'Dorothy', 'Lisa', 'Nancy', 'Karen', 'Betty', 'Helen',
    'Sandra', 'Donna', 'Carol', 'Ruth', 'Sharon', 'Michelle', 'Laura', 'Emily', 'Kimberly', 'Deborah',
    'Dorothy', 'Lisa', 'Nancy', 'Karen', 'Betty', 'Helen', 'Sandra', 'Donna', 'Carol', 'Ruth'
  ];
  return names[Math.floor(Math.random() * names.length)];
}

function generateLastName(): string {
  const names = [
    'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez',
    'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin',
    'Lee', 'Perez', 'Thompson', 'White', 'Harris', 'Sanchez', 'Clark', 'Ramirez', 'Lewis', 'Robinson',
    'Walker', 'Young', 'Allen', 'King', 'Wright', 'Scott', 'Torres', 'Nguyen', 'Hill', 'Flores',
    'Green', 'Adams', 'Nelson', 'Baker', 'Hall', 'Rivera', 'Campbell', 'Mitchell', 'Carter', 'Roberts',
    'Gomez', 'Phillips', 'Evans', 'Turner', 'Diaz', 'Parker', 'Cruz', 'Edwards', 'Collins', 'Reyes',
    'Stewart', 'Morris', 'Morales', 'Murphy', 'Cook', 'Rogers', 'Gutierrez', 'Ortiz', 'Morgan', 'Cooper',
    'Peterson', 'Bailey', 'Reed', 'Kelly', 'Howard', 'Ramos', 'Kim', 'Cox', 'Ward', 'Torres',
    'Peterson', 'Gray', 'Ramirez', 'James', 'Watson', 'Brooks', 'Kelly', 'Sanders', 'Price', 'Bennett',
    'Wood', 'Barnes', 'Ross', 'Henderson', 'Coleman', 'Jenkins', 'Perry', 'Powell', 'Long', 'Patterson'
  ];
  return names[Math.floor(Math.random() * names.length)];
}

function generateCompanyName(): string {
  const prefixes = ['Global', 'Advanced', 'Innovative', 'Strategic', 'Premier', 'Elite', 'Dynamic', 'Creative', 'Professional', 'Expert'];
  const industries = INDUSTRIES;
  const suffixes = ['Solutions', 'Systems', 'Technologies', 'Services', 'Consulting', 'Group', 'Partners', 'Associates', 'Enterprises', 'Corporation'];
  
  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
  const industry = industries[Math.floor(Math.random() * industries.length)];
  const suffix = suffixes[Math.floor(Math.random() * suffixes.length)];
  
  return `${prefix} ${industry} ${suffix}`;
}

function generatePartnerCompanyName(): string {
  const prefixes = ['Tech', 'Digital', 'Smart', 'Next', 'Future', 'Modern', 'Agile', 'Swift', 'Rapid', 'Quick'];
  const industries = ['Solutions', 'Systems', 'Tech', 'Digital', 'Media', 'Marketing', 'Consulting', 'Services'];
  const suffixes = ['Ltd', 'Inc', 'Corp', 'LLC', 'Partners', 'Group', 'Associates'];
  
  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
  const industry = industries[Math.floor(Math.random() * industries.length)];
  const suffix = suffixes[Math.floor(Math.random() * suffixes.length)];
  
  return `${prefix} ${industry} ${suffix}`;
}

function generateJobTitle(): string {
  const titles = [
    'CEO', 'CTO', 'CFO', 'COO', 'VP of Sales', 'VP of Marketing', 'VP of Operations',
    'Director of Sales', 'Director of Marketing', 'Director of Business Development',
    'Sales Manager', 'Marketing Manager', 'Business Development Manager',
    'Senior Sales Executive', 'Senior Marketing Executive', 'Senior Business Development Executive',
    'Sales Executive', 'Marketing Executive', 'Business Development Executive',
    'Account Manager', 'Client Success Manager', 'Partnership Manager',
    'Head of Sales', 'Head of Marketing', 'Head of Business Development',
    'Commercial Director', 'Sales Director', 'Marketing Director'
  ];
  return titles[Math.floor(Math.random() * titles.length)];
}

function generatePhoneNumber(): string {
  const areaCodes = ['020', '0113', '0114', '0115', '0116', '0117', '0118', '0121', '0122', '0123'];
  const areaCode = areaCodes[Math.floor(Math.random() * areaCodes.length)];
  const number = Math.floor(Math.random() * 9000000) + 1000000; // 7-digit number
  return `${areaCode} ${number.toString().slice(0, 4)} ${number.toString().slice(4)}`;
}

function generateInitialNotes(bdr: string): string {
  const notes = [
    `Initial contact made by ${bdr}`,
    `Prospect showed interest in our services`,
    `Qualified lead from LinkedIn outreach`,
    `Referred by existing client`,
    `Met at industry conference`,
    `Cold outreach successful`,
    `Follow-up required`,
    `High potential opportunity`
  ];
  return notes[Math.floor(Math.random() * notes.length)];
}

function generateCallNotes(): string {
  const notes = [
    'Call went well, prospect engaged and interested',
    'Discussed business challenges and potential solutions',
    'Explained our value proposition and services',
    'Prospect asked good questions about implementation',
    'Agreed to next steps and follow-up',
    'Call was productive, moving to proposal stage',
    'Prospect seemed interested in our approach',
    'Good conversation about their needs and our capabilities'
  ];
  return notes[Math.floor(Math.random() * notes.length)];
}

function generatePartnerNotes(): string {
  const notes = [
    'Partner contact made, awaiting response',
    'Initial outreach sent, following up',
    'Partner showed interest in collaboration',
    'Discussed partnership opportunities',
    'Partner requested more information',
    'Follow-up scheduled with partner',
    'Partner considering our proposal',
    'Partnership discussions ongoing'
  ];
  return notes[Math.floor(Math.random() * notes.length)];
}

function determineLeadStatus(): string {
  const statuses = [
    'BDR Followed Up',
    'Call Proposed',
    'Call Booked',
    'Call Conducted',
    'Passed Over',
    'DECLINED',
    'Proposal - Profile',
    'Proposal - Media Sales',
    'Agreement - Profile',
    'Agreement - Media',
    'Partner List Pending',
    'Partner List Sent',
    'List Out',
    'List Out - Not Sold',
    'Free Q&A Offered',
    'Sold'
  ];
  return statuses[Math.floor(Math.random() * statuses.length)];
}

function determineCallOutcome(): string {
  const outcomes = [
    'Call Booked',
    'Call Completed',
    'No Show',
    'Rescheduled'
  ];
  return outcomes[Math.floor(Math.random() * outcomes.length)];
}

function determineListOutcome(): string {
  const outcomes = [
    'List Out',
    'List Out - Not Sold',
    'Sold'
  ];
  return outcomes[Math.floor(Math.random() * outcomes.length)];
}

function determinePartnerStatus(): string {
  const statuses = [
    'Contacted',
    'Interested',
    'Declined',
    'Sold',
    'Follow-up Required',
    'Not Responsive'
  ];
  return statuses[Math.floor(Math.random() * statuses.length)];
}

function generateDealValue(): number {
  const baseValues = [500, 1000, 1500, 2000, 2500, 3000, 3500, 4000, 4500, 5000];
  const baseValue = baseValues[Math.floor(Math.random() * baseValues.length)];
  const multiplier = Math.random() * 0.4 + 0.8; // 0.8 to 1.2
  return Math.floor(baseValue * multiplier);
}

function generateDeclineReason(): string {
  const reasons = [
    'Budget constraints',
    'Timing not right',
    'Not the right fit',
    'Going with competitor',
    'Internal changes',
    'No longer interested',
    'Decision maker changed',
    'Company restructuring'
  ];
  return reasons[Math.floor(Math.random() * reasons.length)];
}

function getListOutcomeDescription(status: string): string {
  switch (status) {
    case 'List Out':
      return 'Partner list sent and responses received';
    case 'List Out - Not Sold':
      return 'Partner list sent but no sales yet';
    case 'Sold':
      return 'Successful sales from partner list';
    default:
      return 'Partner list in progress';
  }
}

function getListOutcomeNotes(status: string): string {
  switch (status) {
    case 'List Out':
      return 'Partner list sent, responses coming in';
    case 'List Out - Not Sold':
      return 'Partner list sent, no sales yet but potential remains';
    case 'Sold':
      return 'Successful sales recorded from partner list';
    default:
      return 'Partner list in preparation';
  }
}

async function printTestDataSummary() {
  console.log('\n📊 Test Data Summary:');
  console.log('=====================');
  
  const totalLeads = await prisma.lead.count();
  const totalPipelineItems = await prisma.pipelineItem.count();
  const totalActivityLogs = await prisma.activityLog.count();
  
  console.log(`Total Leads: ${totalLeads}`);
  console.log(`Total Pipeline Items: ${totalPipelineItems}`);
  console.log(`Total Activity Logs: ${totalActivityLogs}`);
  
  // Status breakdown
  const statusBreakdown = await prisma.pipelineItem.groupBy({
    by: ['status'],
    _count: {
      status: true
    }
  });
  
  console.log('\nPipeline Status Breakdown:');
  statusBreakdown.forEach(item => {
    console.log(`  ${item.status}: ${item._count.status}`);
  });
  
  // BDR breakdown
  const bdrBreakdown = await prisma.pipelineItem.groupBy({
    by: ['bdr'],
    _count: {
      bdr: true
    }
  });
  
  console.log('\nBDR Breakdown:');
  bdrBreakdown.forEach(item => {
    console.log(`  ${item.bdr}: ${item._count.bdr}`);
  });
  
  // Category breakdown
  const categoryBreakdown = await prisma.pipelineItem.groupBy({
    by: ['category'],
    _count: {
      category: true
    }
  });
  
  console.log('\nCategory Breakdown:');
  categoryBreakdown.forEach(item => {
    console.log(`  ${item.category}: ${item._count.category}`);
  });
  
  console.log('\n✅ Test data generation complete!');
}

async function main() {
  try {
    console.log('🎯 Starting comprehensive test data generation...');
    
    // Delete existing pipeline data
    await deleteExistingPipelineData();
    
    // Configuration for test data
    const config: TestDataConfig = {
      totalMainLeads: 200,           // Total leads to generate
      daysBackToGenerate: 90,        // How far back to generate data
      daysForwardToGenerate: 14,     // How far forward to generate data
      includePartnerLists: true,     // Include partner list sublists
      includeActivityLogs: false     // Don't include activity logs for now
    };
    
    // Generate comprehensive test data
    await addComprehensiveTestData(config);
    
    console.log('🎉 Test data generation completed successfully!');
  } catch (error) {
    console.error('❌ Error generating test data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
main(); 