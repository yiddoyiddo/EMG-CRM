import { prisma } from "../src/lib/db";

async function updateLeadsLastUpdated() {
  try {
    console.log('Updating leads with lastUpdated field...');
    
    // Get all leads
    const leads = await prisma.lead.findMany();
    console.log(`Found ${leads.length} leads to update`);
    
    // Update each lead to set lastUpdated to addedDate
    for (const lead of leads) {
      await prisma.lead.update({
        where: { id: lead.id },
        data: {
          lastUpdated: lead.addedDate,
        },
      });
    }
    
    console.log('Successfully updated all leads with lastUpdated field');
  } catch (error) {
    console.error('Error updating leads:', error);
  } finally {
    await prisma.$disconnect();
  }
}

updateLeadsLastUpdated()
  .catch(console.error); 