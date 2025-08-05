import { PrismaClient } from '@prisma/client';
import { addDays, subDays, format } from 'date-fns';

const prisma = new PrismaClient();

async function updateAgreementDateSemantics() {
  console.log('🔄 Updating agreement date semantics...');
  
  try {
    // Get all agreement items that are using expectedCloseDate as partner list due date
    const agreementItems = await prisma.pipelineItem.findMany({
      where: {
        status: { contains: 'Agreement' },
        expectedCloseDate: { not: null }
      }
    });
    
    console.log(`📋 Found ${agreementItems.length} agreement items to update`);
    
    let updatedCount = 0;
    
    for (const item of agreementItems) {
      // Move expectedCloseDate to partnerListDueDate and set agreement date
      const agreementDate = item.lastUpdated; // When the agreement was reached
      const partnerListDueDate = item.expectedCloseDate; // This was being used as list due date
      const actualCloseDate = addDays(partnerListDueDate!, Math.floor(Math.random() * 30) + 30); // Real deal close date
      
      await prisma.pipelineItem.update({
        where: { id: item.id },
        data: {
          agreementDate: agreementDate,
          partnerListDueDate: partnerListDueDate,
          expectedCloseDate: actualCloseDate, // Set to proper deal close date
          // If we already have a partnerListSentDate, keep it
          partnerListSentDate: item.partnerListSentDate || (
            // If list should have been sent (due date passed), randomly decide if it was sent
            partnerListDueDate! < new Date() ? 
              (Math.random() > 0.3 ? addDays(partnerListDueDate!, Math.floor(Math.random() * 5)) : null) : 
              null
          )
        }
      });
      
      updatedCount++;
      
      if (updatedCount % 10 === 0) {
        console.log(`📊 Updated ${updatedCount}/${agreementItems.length} agreement items...`);
      }
    }
    
    // Update any items that have been sold to have proper dates
    const soldItems = await prisma.pipelineItem.findMany({
      where: {
        status: 'Sold',
        firstSaleDate: null
      }
    });
    
    console.log(`💰 Found ${soldItems.length} sold items missing first sale dates`);
    
    for (const item of soldItems) {
      const saleDate = item.partnerListSentDate ? 
        addDays(item.partnerListSentDate, Math.floor(Math.random() * 21) + 7) : // 1-3 weeks after list sent
        addDays(item.lastUpdated, Math.floor(Math.random() * 30) + 7); // Or some time after last update
      
      await prisma.pipelineItem.update({
        where: { id: item.id },
        data: {
          firstSaleDate: saleDate,
          totalSalesFromList: Math.floor(Math.random() * 3) + 1 // 1-3 sales
        }
      });
    }
    
    // Create activity logs for agreement dates
    console.log('📝 Creating agreement activity logs...');
    
    const agreementItemsWithDates = await prisma.pipelineItem.findMany({
      where: {
        agreementDate: { not: null }
      }
    });
    
    for (const item of agreementItemsWithDates) {
      // Check if we already have an agreement activity log
      const existingLog = await prisma.activityLog.findFirst({
        where: {
          pipelineItemId: item.id,
          activityType: 'Agreement_Sent'
        }
      });
      
      if (!existingLog) {
        await prisma.activityLog.create({
          data: {
            timestamp: item.agreementDate!,
            bdr: item.bdr,
            activityType: 'Agreement_Sent',
            description: `Agreement reached with partner list due date: ${format(item.partnerListDueDate!, 'dd/MM/yy')}`,
            scheduledDate: item.partnerListDueDate,
            completedDate: item.agreementDate,
            notes: `Partner list to be sent by ${format(item.partnerListDueDate!, 'dd/MM/yy')}`,
            pipelineItemId: item.id,
            previousStatus: 'Call Conducted',
            newStatus: item.status
          }
        });
      }
      
      // Create partner list sent activity if applicable
      if (item.partnerListSentDate) {
        const existingListLog = await prisma.activityLog.findFirst({
          where: {
            pipelineItemId: item.id,
            activityType: 'Partner_List_Sent'
          }
        });
        
        if (!existingListLog) {
          await prisma.activityLog.create({
            data: {
              timestamp: item.partnerListSentDate,
              bdr: item.bdr,
              activityType: 'Partner_List_Sent',
              description: `Partner list sent with ${item.partnerListSize || 'multiple'} contacts`,
              scheduledDate: item.partnerListDueDate,
              completedDate: item.partnerListSentDate,
              notes: item.partnerListSentDate <= item.partnerListDueDate! ? 'Sent on time' : 'Sent late',
              pipelineItemId: item.id,
              previousStatus: item.status,
              newStatus: 'Partner List Sent'
            }
          });
        }
      }
    }
    
    console.log('✅ Agreement date semantics updated successfully!');
    
    // Print summary
    const summary = await generateSummary();
    console.log('\n📊 UPDATED DATA SUMMARY:');
    console.log(`📋 Agreements with due dates: ${summary.agreementsWithDueDates}`);
    console.log(`📤 Partner lists sent: ${summary.partnerListsSent}`);
    console.log(`⏰ Overdue lists: ${summary.overdueLists}`);
    console.log(`💰 Items with sales: ${summary.itemsWithSales}`);
    
  } catch (error) {
    console.error('❌ Error updating agreement date semantics:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

async function generateSummary() {
  const [
    agreementsWithDueDates,
    partnerListsSent,
    overdueLists,
    itemsWithSales
  ] = await Promise.all([
    prisma.pipelineItem.count({
      where: {
        partnerListDueDate: { not: null }
      }
    }),
    prisma.pipelineItem.count({
      where: {
        partnerListSentDate: { not: null }
      }
    }),
    prisma.pipelineItem.count({
      where: {
        partnerListDueDate: { lt: new Date() },
        partnerListSentDate: null
      }
    }),
    prisma.pipelineItem.count({
      where: {
        firstSaleDate: { not: null }
      }
    })
  ]);
  
  return {
    agreementsWithDueDates,
    partnerListsSent,
    overdueLists,
    itemsWithSales
  };
}

// Run if this script is executed directly
if (require.main === module) {
  updateAgreementDateSemantics().catch(console.error);
}

export { updateAgreementDateSemantics }; 