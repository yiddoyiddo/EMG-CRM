import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixSublistRelationships() {
  console.log('🔧 Fixing sublist relationships...');
  
  try {
    // Find all sublist containers (items with isSublist = true)
    const sublistContainers = await prisma.pipelineItem.findMany({
      where: {
        isSublist: true
      }
    });
    
    console.log(`📋 Found ${sublistContainers.length} sublist containers`);
    
    let fixedCount = 0;
    
    for (const container of sublistContainers) {
      console.log(`\n🔗 Processing sublist: ${container.sublistName}`);
      
      // Find all items that should be subitems of this container
      // They should have the same leadId, bdr, and company but not be the container itself
      const potentialSubitems = await prisma.pipelineItem.findMany({
        where: {
          leadId: container.leadId,
          bdr: container.bdr,
          company: container.company,
          isSublist: false,
          parentId: null, // Only get items that aren't already linked
          id: {
            not: container.id // Exclude the container itself
          }
        }
      });
      
      console.log(`   Found ${potentialSubitems.length} potential subitems`);
      
      // Update each subitem to link to the container
      for (let i = 0; i < potentialSubitems.length; i++) {
        const subitem = potentialSubitems[i];
        
        await prisma.pipelineItem.update({
          where: { id: subitem.id },
          data: {
            parentId: container.id,
            sortOrder: i + 2 // Start from 2 since container has sortOrder 1
          }
        });
        
        fixedCount++;
      }
      
      // Also update the container to ensure it has the right sortOrder
      await prisma.pipelineItem.update({
        where: { id: container.id },
        data: {
          sortOrder: 1
        }
      });
    }
    
    console.log(`\n✅ Fixed ${fixedCount} sublist relationships`);
    
    // Verify the fix
    await verifySublistStructure();
    
  } catch (error) {
    console.error('❌ Error fixing sublist relationships:', error);
    throw error;
  }
}

async function verifySublistStructure() {
  console.log('\n🔍 Verifying sublist structure...');
  
  // Count sublist containers
  const containerCount = await prisma.pipelineItem.count({
    where: { isSublist: true }
  });
  
  // Count subitems (items with parentId)
  const subitemCount = await prisma.pipelineItem.count({
    where: {
      parentId: {
        not: null
      }
    }
  });
  
  // Count orphaned items (items that should be subitems but aren't linked)
  const orphanedCount = await prisma.pipelineItem.count({
    where: {
      parentId: null,
      isSublist: false,
      category: 'Lists_Media_QA'
    }
  });
  
  console.log(`📊 Sublist Structure Summary:`);
  console.log(`   Sublist Containers: ${containerCount}`);
  console.log(`   Subitems: ${subitemCount}`);
  console.log(`   Orphaned Items: ${orphanedCount}`);
  
  if (orphanedCount > 0) {
    console.log(`⚠️  Found ${orphanedCount} orphaned items that should be subitems`);
  } else {
    console.log(`✅ All sublist relationships look good!`);
  }
  
  // Show some examples of the structure
  const sampleContainers = await prisma.pipelineItem.findMany({
    where: { isSublist: true },
    take: 3,
    include: {
      children: {
        take: 5,
        orderBy: { sortOrder: 'asc' }
      }
    }
  });
  
  console.log(`\n📋 Sample Sublist Structure:`);
  for (const container of sampleContainers) {
    console.log(`   ${container.sublistName}:`);
    console.log(`     Container: ${container.name} (ID: ${container.id})`);
    console.log(`     Subitems: ${container.children.length}`);
    for (const child of container.children.slice(0, 3)) {
      console.log(`       - ${child.name} (ID: ${child.id}, Parent: ${child.parentId})`);
    }
    if (container.children.length > 3) {
      console.log(`       ... and ${container.children.length - 3} more`);
    }
  }
}

async function createMissingSublists() {
  console.log('\n🔧 Creating missing sublist containers...');
  
  // Find items that should be in sublists but don't have a parent
  const orphanedItems = await prisma.pipelineItem.findMany({
    where: {
      parentId: null,
      isSublist: false,
      category: 'Lists_Media_QA',
      status: {
        in: ['Contacted', 'Interested', 'Sold', 'Follow-up Required']
      }
    }
  });
  
  console.log(`📋 Found ${orphanedItems.length} orphaned sublist items`);
  
  // Group orphaned items by leadId, bdr, and company
  const groups = new Map<string, any[]>();
  
  for (const item of orphanedItems) {
    const key = `${item.leadId}-${item.bdr}-${item.company}`;
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(item);
  }
  
  let createdContainers = 0;
  
  for (const [key, items] of groups) {
    if (items.length > 1) { // Only create containers for groups with multiple items
      const firstItem = items[0];
      
      // Create a sublist container
      const container = await prisma.pipelineItem.create({
        data: {
          name: firstItem.name,
          title: firstItem.title,
          addedDate: firstItem.addedDate,
          lastUpdated: new Date(),
          bdr: firstItem.bdr,
          company: firstItem.company,
          category: 'Lists_Media_QA',
          status: 'List Out',
          value: null,
          probability: 60,
          expectedCloseDate: null,
          link: firstItem.link,
          phone: firstItem.phone,
          notes: `Partner list with ${items.length} contacts`,
          email: firstItem.email,
          leadId: firstItem.leadId,
          callDate: null,
          parentId: null,
          isSublist: true,
          sublistName: `${firstItem.company} Partner List`,
          sortOrder: 1
        }
      });
      
      createdContainers++;
      
      // Update all items in this group to be subitems
      for (let i = 0; i < items.length; i++) {
        await prisma.pipelineItem.update({
          where: { id: items[i].id },
          data: {
            parentId: container.id,
            sortOrder: i + 2
          }
        });
      }
      
      console.log(`   Created container for ${firstItem.company} with ${items.length} subitems`);
    }
  }
  
  console.log(`✅ Created ${createdContainers} new sublist containers`);
}

async function main() {
  try {
    console.log('🔧 Starting sublist relationship fixes...');
    
    // First, create missing sublist containers
    await createMissingSublists();
    
    // Then fix existing relationships
    await fixSublistRelationships();
    
    console.log('\n🎉 Sublist relationship fixes completed!');
    
  } catch (error) {
    console.error('❌ Error in main execution:', error);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  main().catch(console.error);
}

export { fixSublistRelationships, createMissingSublists, verifySublistStructure }; 