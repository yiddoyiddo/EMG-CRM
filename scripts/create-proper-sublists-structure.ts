import { PrismaClient } from '@prisma/client';
import { faker } from '@faker-js/faker';
import { addDays, subDays, addWeeks, subWeeks } from 'date-fns';

const prisma = new PrismaClient();

const partnerCompanies = [
  "Media Partners Ltd", "Digital Solutions Group", "Marketing Pro Services", "Creative Agency Hub",
  "Strategic Media Co", "Premier Marketing", "Elite Digital", "Innovation Studios",
  "Growth Marketing", "Success Partners", "Dynamic Media", "Forward Thinking Agency",
  "Peak Performance", "Excellence Marketing", "Prime Digital", "Superior Solutions",
  "Breakthrough Media", "Advantage Marketing", "Professional Services Co", "Expert Solutions Ltd",
  "Trusted Partners", "Quality First Media", "Reliable Marketing", "Outstanding Results",
  "Top Tier Partners", "Premium Services", "First Class Media", "Leading Edge Marketing",
  "Cutting Edge Solutions", "State of Art Media", "Best Practice Partners", "Industry Leaders",
  "Market Champions", "Performance Specialists", "Revenue Generators", "Profit Maximizers",
  "Success Drivers", "Growth Accelerators", "Results Focused", "Achievement Partners"
];

const dealTypes = [
  "Profile Package", "Media Package", "Premium Package", "Enterprise Solution",
  "Growth Package", "Starter Package", "Professional Package", "Executive Package"
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

async function createProperSublistStructure() {
  console.log('🏗️ Creating proper sublist structure for CRM data...\n');
  
  // Get all current sold items that should have sublists
  const soldItems = await prisma.pipelineItem.findMany({
    where: { status: 'Sold' }
  });
  
  console.log(`Found ${soldItems.length} sold items that need sublists`);
  
  // Get items that are "Partner List Sent" or "List Out" that should also have sublists
  const listOutItems = await prisma.pipelineItem.findMany({
    where: { 
      OR: [
        { status: 'Partner List Sent' },
        { status: 'List Out' },
        { status: 'List Out - Not Sold' }
      ]
    }
  });
  
  console.log(`Found ${listOutItems.length} list out items that need sublists`);
  
  const newSublistItems = [];
  const newActivityLogs = [];
  
  // Process sold items - these should have sublists with deals
  for (const soldItem of soldItems) {
    if (soldItem.isSublist) continue; // Skip if already a sublist parent
    
    console.log(`📊 Creating sublist for sold item: ${soldItem.name} (${soldItem.company})`);
    
    // Update the main item to be a sublist parent
    await prisma.pipelineItem.update({
      where: { id: soldItem.id },
      data: {
        isSublist: true,
        sublistName: `${soldItem.company} - Partner Network`,
        status: 'Sold',
        category: 'Lists_Media_QA'
      }
    });
    
    // Create 8-15 partner sub-items under this sold item
    const numPartners = 8 + Math.floor(Math.random() * 8); // 8-15 partners
    const numWithDeals = Math.floor(numPartners * 0.3); // ~30% have deals (what makes it "sold")
    
    for (let i = 0; i < numPartners; i++) {
      const partnerCompany = partnerCompanies[Math.floor(Math.random() * partnerCompanies.length)];
      const hasDeal = i < numWithDeals;
      const dealValue = hasDeal ? 2000 + Math.random() * 8000 : null; // £2k-£10k deals
      const dealType = dealTypes[Math.floor(Math.random() * dealTypes.length)];
      
      const partnerAddedDate = generateRandomDate(
        soldItem.partnerListSentDate || addDays(soldItem.addedDate, 5),
        soldItem.firstSaleDate || soldItem.lastUpdated
      );
      
      let partnerStatus = "Contacted";
      let partnerNotes = `Partner from ${soldItem.company} network. Initial contact made.`;
      
      if (hasDeal) {
        partnerStatus = "Sold";
        partnerNotes = `✅ DEAL: £${dealValue?.toFixed(0)} - ${dealType}. Partner from ${soldItem.company} network. Deal closed successfully!`;
      } else {
        // Various stages for non-deal partners
        const rand = Math.random();
        if (rand < 0.3) {
          partnerStatus = "Not Responsive";
          partnerNotes = `Partner from ${soldItem.company} network. No response after multiple attempts.`;
        } else if (rand < 0.5) {
          partnerStatus = "Follow-up Required";
          partnerNotes = `Partner from ${soldItem.company} network. Showed initial interest, follow-up scheduled.`;
        } else if (rand < 0.7) {
          partnerStatus = "Interested";
          partnerNotes = `Partner from ${soldItem.company} network. Expressed interest in ${dealType}.`;
        } else {
          partnerStatus = "Proposal Sent";
          partnerNotes = `Partner from ${soldItem.company} network. ${dealType} proposal sent, awaiting response.`;
        }
      }
      
      const sublistItem = {
        name: faker.person.fullName(),
        title: faker.person.jobTitle(),
        email: faker.internet.email(),
        phone: faker.phone.number(),
        company: partnerCompany,
        bdr: soldItem.bdr,
        category: "Partner_Contacts",
        status: partnerStatus,
        value: dealValue,
        probability: hasDeal ? 100 : (partnerStatus === "Interested" ? 60 : partnerStatus === "Proposal Sent" ? 80 : 20),
        callDate: null,
        addedDate: partnerAddedDate,
        lastUpdated: hasDeal ? generateRandomDate(partnerAddedDate, soldItem.firstSaleDate || soldItem.lastUpdated) : partnerAddedDate,
        expectedCloseDate: null,
        agreementDate: null,
        partnerListSentDate: null,
        firstSaleDate: hasDeal ? generateRandomDate(partnerAddedDate, soldItem.firstSaleDate || soldItem.lastUpdated) : null,
        partnerListSize: null,
        totalSalesFromList: null,
        notes: partnerNotes,
        parentId: soldItem.id,
        isSublist: false,
        sublistName: null,
        sortOrder: i + 1
      };
      
      newSublistItems.push(sublistItem);
      
      // Create activity logs for partners with deals
      if (hasDeal) {
        newActivityLogs.push({
          timestamp: sublistItem.firstSaleDate!,
          bdr: soldItem.bdr,
          activityType: "Sale_Recorded",
          description: `Deal closed with ${sublistItem.name} at ${partnerCompany}`,
          notes: `£${dealValue?.toFixed(0)} ${dealType} - Partner from ${soldItem.company} network`,
          previousStatus: "Interested",
          newStatus: "Sold",
          pipelineItemId: null // Will be updated after creation
        });
      }
    }
  }
  
  // Process list out items - these should have sublists but mostly no deals yet
  for (const listItem of listOutItems) {
    if (listItem.isSublist) continue; // Skip if already a sublist parent
    
    console.log(`📋 Creating sublist for list out item: ${listItem.name} (${listItem.company})`);
    
    // Update the main item to be a sublist parent
    await prisma.pipelineItem.update({
      where: { id: listItem.id },
      data: {
        isSublist: true,
        sublistName: `${listItem.company} - Partner List`,
        status: listItem.status,
        category: 'Lists_Media_QA'
      }
    });
    
    // Create 6-12 partner sub-items under this list out item
    const numPartners = 6 + Math.floor(Math.random() * 7); // 6-12 partners
    const numWithDeals = Math.floor(numPartners * 0.1); // ~10% have deals (early success)
    
    for (let i = 0; i < numPartners; i++) {
      const partnerCompany = partnerCompanies[Math.floor(Math.random() * partnerCompanies.length)];
      const hasDeal = i < numWithDeals;
      const dealValue = hasDeal ? 1500 + Math.random() * 6000 : null; // Smaller deals for list out
      const dealType = dealTypes[Math.floor(Math.random() * dealTypes.length)];
      
      const partnerAddedDate = generateRandomDate(
        listItem.partnerListSentDate || addDays(listItem.addedDate, 3),
        listItem.lastUpdated
      );
      
      let partnerStatus = "Contacted";
      let partnerNotes = `Partner from ${listItem.company} list. Initial outreach completed.`;
      
      if (hasDeal) {
        partnerStatus = "Sold";
        partnerNotes = `✅ DEAL: £${dealValue?.toFixed(0)} - ${dealType}. Early success from ${listItem.company} partner list!`;
      } else {
        // Mostly early stage for list out items
        const rand = Math.random();
        if (rand < 0.4) {
          partnerStatus = "Contacted";
          partnerNotes = `Partner from ${listItem.company} list. Initial contact made, building relationship.`;
        } else if (rand < 0.6) {
          partnerStatus = "Follow-up Required";
          partnerNotes = `Partner from ${listItem.company} list. Good initial response, scheduling follow-up.`;
        } else if (rand < 0.8) {
          partnerStatus = "Interested";
          partnerNotes = `Partner from ${listItem.company} list. Showing interest in ${dealType} services.`;
        } else {
          partnerStatus = "Not Responsive";
          partnerNotes = `Partner from ${listItem.company} list. No response to initial outreach.`;
        }
      }
      
      const sublistItem = {
        name: faker.person.fullName(),
        title: faker.person.jobTitle(),
        email: faker.internet.email(),
        phone: faker.phone.number(),
        company: partnerCompany,
        bdr: listItem.bdr,
        category: "Partner_Contacts",
        status: partnerStatus,
        value: dealValue,
        probability: hasDeal ? 100 : (partnerStatus === "Interested" ? 40 : partnerStatus === "Follow-up Required" ? 30 : 10),
        callDate: null,
        addedDate: partnerAddedDate,
        lastUpdated: hasDeal ? generateRandomDate(partnerAddedDate, listItem.lastUpdated) : partnerAddedDate,
        expectedCloseDate: partnerStatus === "Interested" ? addWeeks(partnerAddedDate, 2 + Math.random() * 4) : null,
        agreementDate: null,
        partnerListSentDate: null,
        firstSaleDate: hasDeal ? generateRandomDate(partnerAddedDate, listItem.lastUpdated) : null,
        partnerListSize: null,
        totalSalesFromList: null,
        notes: partnerNotes,
        parentId: listItem.id,
        isSublist: false,
        sublistName: null,
        sortOrder: i + 1
      };
      
      newSublistItems.push(sublistItem);
      
      // Create activity logs for partners with deals
      if (hasDeal) {
        newActivityLogs.push({
          timestamp: sublistItem.firstSaleDate!,
          bdr: listItem.bdr,
          activityType: "Sale_Recorded",
          description: `Early deal closed with ${sublistItem.name} at ${partnerCompany}`,
          notes: `£${dealValue?.toFixed(0)} ${dealType} - Early success from ${listItem.company} partner list`,
          previousStatus: "Interested",
          newStatus: "Sold",
          pipelineItemId: null // Will be updated after creation
        });
      }
    }
  }
  
  // Create all sublist items
  if (newSublistItems.length > 0) {
    console.log(`📝 Creating ${newSublistItems.length} partner sublist items...`);
    await prisma.pipelineItem.createMany({ data: newSublistItems });
  }
  
  // Create activity logs
  if (newActivityLogs.length > 0) {
    console.log(`📋 Creating ${newActivityLogs.length} deal activity logs...`);
    await prisma.activityLog.createMany({ data: newActivityLogs });
  }
  
  // Update parent items with correct totals
  console.log('🔄 Updating parent items with sublist totals...');
  
  const allSublistParents = await prisma.pipelineItem.findMany({
    where: { isSublist: true },
    include: { children: true }
  });
  
  for (const parent of allSublistParents) {
    const soldChildren = parent.children.filter(child => child.status === 'Sold');
    const totalRevenue = soldChildren.reduce((sum, child) => sum + (child.value || 0), 0);
    const partnerListSize = parent.children.length;
    
    await prisma.pipelineItem.update({
      where: { id: parent.id },
      data: {
        partnerListSize: partnerListSize,
        totalSalesFromList: soldChildren.length,
        value: totalRevenue > 0 ? totalRevenue : parent.value // Use sublist total if there are deals
      }
    });
  }
  
  // Final summary
  const totalSublistParents = await prisma.pipelineItem.count({ where: { isSublist: true } });
  const totalSublistItems = await prisma.pipelineItem.count({ where: { parentId: { not: null } } });
  const totalDeals = await prisma.pipelineItem.count({ 
    where: { 
      parentId: { not: null },
      status: 'Sold'
    }
  });
  
  const totalDealValue = await prisma.pipelineItem.aggregate({
    where: {
      parentId: { not: null },
      status: 'Sold'
    },
    _sum: { value: true }
  });
  
  console.log('\n🎉 Proper Sublist Structure Created!');
  console.log('====================================');
  console.log(`📊 Sublist Parents: ${totalSublistParents}`);
  console.log(`👥 Partner Contacts: ${totalSublistItems}`);
  console.log(`💰 Individual Deals: ${totalDeals}`);
  console.log(`💷 Total Deal Value: £${totalDealValue._sum.value?.toLocaleString() || 0}`);
  console.log('\n✨ Reporting can now pull deal values from individual partners in sublists!');
}

async function main() {
  try {
    await createProperSublistStructure();
  } catch (error) {
    console.error('Error creating proper sublist structure:', error);
    throw error;
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());