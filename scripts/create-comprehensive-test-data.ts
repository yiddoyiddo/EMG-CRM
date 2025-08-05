import { PrismaClient } from '@prisma/client';
import { addDays, addWeeks, addMonths, subDays, subWeeks, subMonths, format } from 'date-fns';

const prisma = new PrismaClient();

// BDRs from the validation
const BDRS = [
  "Dan Reeves",
  "Jess Collins", 
  "Jamie Waite",
  "Stephen Vivian",
  "Thomas Hardy",
  "Adel Mhiri",
  "Gary Smith",
  "Naeem Patel",
  "Jennifer Davies",
  "Verity Kay",
  "Rupert Kay",
  "Mark Cawston",
  "Thomas Corcoran"
];

// Pipeline categories and their statuses
const PIPELINE_CATEGORIES = {
  Calls: ["Call Proposed", "Call Booked", "Call Conducted"],
  Pipeline: ["Proposal - Media", "Proposal - Profile", "Agreement - Media", "Agreement - Profile", "Partner List Pending"],
  Lists_Media_QA: ["Partner List Sent", "List Out", "List Out - Not Sold", "Media Sales", "Q&A", "Free Q&A Offered", "Sold"],
  Declined_Rescheduled: ["Declined_Rescheduled", "Rescheduled", "Lost"],
  Partner_Contacts: ["Contacted", "Interested", "Declined", "Sold", "Follow-up Required", "Not Responsive"]
};

// Activity types
const ACTIVITY_TYPES = [
  "Call_Proposed",
  "Call_Scheduled", 
  "Call_Completed",
  "Call_Missed",
  "Call_Rescheduled",
  "Proposal_Sent",
  "Agreement_Sent",
  "Partner_List_Sent",
  "Status_Change",
  "Pipeline_Move",
  "Email_Sent",
  "Note_Added",
  "Value_Updated",
  "Lead_Created",
  "Lead_Converted",
  "BDR_Update",
  "Partner_Added",
  "Sale_Recorded",
  "Follow_Up_Scheduled"
];

// Sample companies for variety
const COMPANIES = [
  "TechCorp Solutions",
  "Digital Dynamics",
  "Innovation Labs",
  "Future Systems",
  "Smart Solutions Inc",
  "NextGen Technologies",
  "Cloud Computing Ltd",
  "Data Analytics Corp",
  "AI Innovations",
  "Cyber Security Pro",
  "Mobile Development Co",
  "Web Solutions Ltd",
  "Software Engineering",
  "IT Consulting Group",
  "Digital Marketing Pro"
];

// Sample names for variety
const NAMES = [
  "John Smith", "Sarah Johnson", "Michael Brown", "Emily Davis", "David Wilson",
  "Lisa Anderson", "James Taylor", "Jennifer Martinez", "Robert Garcia", "Amanda Rodriguez",
  "Christopher Lee", "Michelle White", "Daniel Thompson", "Jessica Clark", "Matthew Lewis",
  "Ashley Hall", "Andrew Allen", "Nicole Young", "Kevin King", "Stephanie Wright",
  "Brian Green", "Rachel Baker", "Steven Adams", "Lauren Nelson", "Timothy Carter",
  "Amber Mitchell", "Jeffrey Perez", "Melissa Roberts", "Ryan Turner", "Heather Phillips"
];

// Sample titles
const TITLES = [
  "CEO", "CTO", "CFO", "VP of Sales", "VP of Marketing", "VP of Engineering",
  "Director of Operations", "Director of Business Development", "Sales Manager",
  "Marketing Manager", "Product Manager", "Project Manager", "Business Analyst",
  "Senior Developer", "Lead Engineer", "Account Executive", "Sales Representative"
];

// Helper function to get random item from array
function getRandomItem<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

// Helper function to get random date in range
function getRandomDate(start: Date, end: Date): Date {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

// Helper function to get call date based on status
function getCallDateForStatus(status: string): Date | null {
  const now = new Date();
  
  switch (status) {
    case "Call Booked":
      // Future dates for booked calls
      return addDays(now, Math.floor(Math.random() * 30) + 1);
    case "Call Conducted":
      // Past dates for conducted calls
      return subDays(now, Math.floor(Math.random() * 30) + 1);
    case "Call Proposed":
      // No call date for proposed calls
      return null;
    default:
      // For other statuses, random past dates
      return subDays(now, Math.floor(Math.random() * 90) + 1);
  }
}

// Helper function to create activity log
async function createActivityLog(pipelineItemId: number, bdr: string, activityType: string, description: string, timestamp: Date) {
  return await prisma.activityLog.create({
    data: {
      bdr,
      activityType,
      description,
      timestamp,
      pipelineItemId,
      notes: `Test activity log for ${activityType}`
    }
  });
}

async function createComprehensiveTestData() {
  try {
    console.log('Starting comprehensive test data creation...');
    
    // First, delete all existing pipeline items and activity logs
    console.log('Deleting existing pipeline data...');
    await prisma.activityLog.deleteMany({});
    await prisma.pipelineItem.deleteMany({});
    
    console.log('Creating test data...');
    
    // Create main pipeline items (not sublists)
    const mainPipelineItems = [];
    
    // Create items for each category and status
    for (const [category, statuses] of Object.entries(PIPELINE_CATEGORIES)) {
      for (const status of statuses) {
        // Create multiple items per status for variety
        const itemCount = status === "Sold" ? 8 : 5; // More sold items for testing
        
        for (let i = 0; i < itemCount; i++) {
          const bdr = getRandomItem(BDRS);
          const name = getRandomItem(NAMES);
          const company = getRandomItem(COMPANIES);
          const title = getRandomItem(TITLES);
          const callDate = getCallDateForStatus(status);
          
          // Generate value and probability for pipeline items
          const value = status.includes("Sold") || status.includes("Agreement") 
            ? Math.floor(Math.random() * 50000) + 5000 
            : Math.floor(Math.random() * 20000) + 1000;
          
          const probability = status.includes("Sold") ? 100 : 
                           status.includes("Agreement") ? 90 :
                           status.includes("Proposal") ? 70 :
                           status.includes("Call") ? 50 : 30;
          
          const pipelineItem = await prisma.pipelineItem.create({
            data: {
              name,
              title,
              bdr,
              company,
              category,
              status,
              value: status.includes("Sold") || status.includes("Agreement") ? value : null,
              probability,
              callDate,
              lastUpdated: new Date(),
              notes: `Test ${status} item for ${category}`,
              email: `${name.toLowerCase().replace(' ', '.')}@${company.toLowerCase().replace(' ', '')}.com`,
              phone: `+44 ${Math.floor(Math.random() * 900) + 100} ${Math.floor(Math.random() * 900) + 100} ${Math.floor(Math.random() * 900) + 100}`,
              // Enhanced fields for sold items
              agreementDate: status.includes("Agreement") ? subDays(new Date(), Math.floor(Math.random() * 30)) : null,
              partnerListSentDate: status.includes("Partner List Sent") ? subDays(new Date(), Math.floor(Math.random() * 30)) : null,
              firstSaleDate: status.includes("Sold") ? subDays(new Date(), Math.floor(Math.random() * 30)) : null,
              partnerListSize: status.includes("Partner List") ? Math.floor(Math.random() * 50) + 10 : null,
              totalSalesFromList: status.includes("Sold") ? Math.floor(Math.random() * 20) + 1 : null
            }
          });
          
          mainPipelineItems.push(pipelineItem);
          
          // Create activity logs for this item
          const activityCount = Math.floor(Math.random() * 5) + 2;
          for (let j = 0; j < activityCount; j++) {
            const activityType = getRandomItem(ACTIVITY_TYPES);
            const activityDate = subDays(new Date(), Math.floor(Math.random() * 60));
            
            await createActivityLog(
              pipelineItem.id,
              bdr,
              activityType,
              `Activity ${j + 1} for ${name} - ${activityType}`,
              activityDate
            );
          }
        }
      }
    }
    
    // Create sublists with subitems
    console.log('Creating sublists with subitems...');
    
    // Create "Lists Out" sublists that haven't sold yet
    for (let i = 0; i < 5; i++) {
      const bdr = getRandomItem(BDRS);
      const company = getRandomItem(COMPANIES);
      
      const sublist = await prisma.pipelineItem.create({
        data: {
          name: `Partner List ${i + 1}`,
          title: "Partner List",
          bdr,
          company,
          category: "Lists_Media_QA",
          status: "List Out",
          isSublist: true,
          sublistName: `Partner List ${i + 1}`,
          sortOrder: i,
          partnerListSize: Math.floor(Math.random() * 50) + 20,
          partnerListSentDate: subDays(new Date(), Math.floor(Math.random() * 30)),
          lastUpdated: new Date(),
          notes: `Test partner list that hasn't sold yet`
        }
      });
      
      // Create subitems for this sublist
      const subitemCount = Math.floor(Math.random() * 8) + 3;
      for (let j = 0; j < subitemCount; j++) {
        const subitemName = getRandomItem(NAMES);
        const subitemStatus = getRandomItem(["Contacted", "Interested", "Follow-up Required", "Not Responsive"]);
        
        const subitem = await prisma.pipelineItem.create({
          data: {
            name: subitemName,
            title: "Partner Contact",
            bdr,
            company,
            category: "Partner_Contacts",
            status: subitemStatus,
            parentId: sublist.id,
            sortOrder: j,
            lastUpdated: new Date(),
            notes: `Subitem ${j + 1} for partner list`
          }
        });
        
        // Create activity logs for subitem
        const activityCount = Math.floor(Math.random() * 3) + 1;
        for (let k = 0; k < activityCount; k++) {
          const activityType = getRandomItem(ACTIVITY_TYPES);
          const activityDate = subDays(new Date(), Math.floor(Math.random() * 30));
          
          await createActivityLog(
            subitem.id,
            bdr,
            activityType,
            `Subitem activity ${k + 1} for ${subitemName}`,
            activityDate
          );
        }
      }
    }
    
    // Create sold lists with subitems that have sales updates
    for (let i = 0; i < 8; i++) {
      const bdr = getRandomItem(BDRS);
      const company = getRandomItem(COMPANIES);
      const dealValue = Math.floor(Math.random() * 50000) + 10000;
      
      const soldSublist = await prisma.pipelineItem.create({
        data: {
          name: `Sold Partner List ${i + 1}`,
          title: "Partner List",
          bdr,
          company,
          category: "Lists_Media_QA",
          status: "Sold",
          value: dealValue,
          probability: 100,
          isSublist: true,
          sublistName: `Sold Partner List ${i + 1}`,
          sortOrder: i + 100,
          partnerListSize: Math.floor(Math.random() * 50) + 20,
          partnerListSentDate: subDays(new Date(), Math.floor(Math.random() * 60)),
          firstSaleDate: subDays(new Date(), Math.floor(Math.random() * 30)),
          totalSalesFromList: Math.floor(Math.random() * 15) + 1,
          lastUpdated: new Date(),
          notes: `Test sold partner list with deal value of £${dealValue.toLocaleString()}`
        }
      });
      
      // Create subitems for sold sublist
      const subitemCount = Math.floor(Math.random() * 10) + 5;
      for (let j = 0; j < subitemCount; j++) {
        const subitemName = getRandomItem(NAMES);
        const subitemStatus = getRandomItem(["Sold", "Interested", "Contacted"]);
        const subitemValue = subitemStatus === "Sold" ? Math.floor(Math.random() * 5000) + 500 : null;
        
        const subitem = await prisma.pipelineItem.create({
          data: {
            name: subitemName,
            title: "Partner Contact",
            bdr,
            company,
            category: "Partner_Contacts",
            status: subitemStatus,
            value: subitemValue,
            parentId: soldSublist.id,
            sortOrder: j,
            lastUpdated: new Date(),
            notes: subitemStatus === "Sold" ? `Sold for £${subitemValue?.toLocaleString()}` : `Subitem ${j + 1} for sold list`
          }
        });
        
        // Create activity logs for subitem with sales updates
        const activityCount = Math.floor(Math.random() * 4) + 2;
        for (let k = 0; k < activityCount; k++) {
          let activityType = getRandomItem(ACTIVITY_TYPES);
          let description = `Subitem activity ${k + 1} for ${subitemName}`;
          
          // Add sales-specific activities for sold items
          if (subitemStatus === "Sold" && k === activityCount - 1) {
            activityType = "Sale_Recorded";
            description = `Sale recorded for £${subitemValue?.toLocaleString()}`;
          }
          
          const activityDate = subDays(new Date(), Math.floor(Math.random() * 30));
          
          await createActivityLog(
            subitem.id,
            bdr,
            activityType,
            description,
            activityDate
          );
        }
      }
    }
    
    // Ensure all BDRs have leads in different stages
    console.log('Ensuring all BDRs have leads in different stages...');
    
    for (const bdr of BDRS) {
      // Check if BDR has enough variety
      const bdrItems = await prisma.pipelineItem.findMany({
        where: { bdr },
        select: { status: true, category: true }
      });
      
      // If BDR doesn't have enough variety, add more items
      if (bdrItems.length < 10) {
        const missingCategories = Object.keys(PIPELINE_CATEGORIES).filter(cat => 
          !bdrItems.some(item => item.category === cat)
        );
        
        for (const category of missingCategories.slice(0, 2)) {
          const status = getRandomItem(PIPELINE_CATEGORIES[category as keyof typeof PIPELINE_CATEGORIES]);
          const name = getRandomItem(NAMES);
          const company = getRandomItem(COMPANIES);
          const callDate = getCallDateForStatus(status);
          
          const pipelineItem = await prisma.pipelineItem.create({
            data: {
              name,
              title: getRandomItem(TITLES),
              bdr,
              company,
              category,
              status,
              callDate,
              lastUpdated: new Date(),
              notes: `Additional test item for ${bdr} in ${category}`
            }
          });
          
          // Create activity logs
          const activityCount = Math.floor(Math.random() * 3) + 1;
          for (let j = 0; j < activityCount; j++) {
            const activityType = getRandomItem(ACTIVITY_TYPES);
            const activityDate = subDays(new Date(), Math.floor(Math.random() * 30));
            
            await createActivityLog(
              pipelineItem.id,
              bdr,
              activityType,
              `Additional activity ${j + 1} for ${name}`,
              activityDate
            );
          }
        }
      }
    }
    
    console.log('Comprehensive test data creation completed!');
    console.log('Created pipeline items with:');
    console.log('- All pipeline categories and statuses');
    console.log('- Mix of leads at different stages');
    console.log('- Lists out with subitems that haven\'t sold yet');
    console.log('- Sold lists with subitems that have sales updates');
    console.log('- Call dates appropriate for each stage');
    console.log('- All BDRs with leads in different stages');
    console.log('- Comprehensive activity logs');
    
  } catch (error) {
    console.error('Error creating test data:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
createComprehensiveTestData()
  .then(() => {
    console.log('Test data creation completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Failed to create test data:', error);
    process.exit(1);
  }); 