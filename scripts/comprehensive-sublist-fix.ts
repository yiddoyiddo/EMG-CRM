import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function comprehensiveSublistFix() {
  console.log('🔧 Starting comprehensive sublist fix...');
  
  try {
    // Step 1: Find all orphaned items that should be in sublists
    const orphanedItems = await prisma.pipelineItem.findMany({
      where: {
        parentId: null,
        isSublist: false,
        category: 'Lists_Media_QA',
        status: {
          in: ['Contacted', 'Interested', 'Sold', 'Follow-up Required', 'Declined']
        }
      }
    });
    
    console.log(`📋 Found ${orphanedItems.length} orphaned sublist items`);
    
    // Step 2: Group orphaned items by leadId, bdr, and company
    const groups = new Map<string, any[]>();
    
    for (const item of orphanedItems) {
      const key = `${item.leadId}-${item.bdr}-${item.company}`;
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(item);
    }
    
    console.log(`📊 Grouped into ${groups.size} potential sublist groups`);
    
    let createdContainers = 0;
    let linkedItems = 0;
    
    // Step 3: Create containers and link items for each group
    for (const [key, items] of Array.from(groups)) {
      if (items.length > 0) {
        const firstItem = items[0];
        
        // Check if a container already exists for this group
        const existingContainer = await prisma.pipelineItem.findFirst({
          where: {
            leadId: firstItem.leadId,
            bdr: firstItem.bdr,
            company: firstItem.company,
            isSublist: true
          }
        });
        
        let container;
        
        if (existingContainer) {
          container = existingContainer;
          console.log(`   Using existing container for ${firstItem.company}`);
        } else {
          // Create a new sublist container
          container = await prisma.pipelineItem.create({
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
          console.log(`   Created new container for ${firstItem.company} with ${items.length} items`);
        }
        
        // Link all items in this group to the container
        for (let i = 0; i < items.length; i++) {
          await prisma.pipelineItem.update({
            where: { id: items[i].id },
            data: {
              parentId: container.id,
              sortOrder: i + 2
            }
          });
          linkedItems++;
        }
      }
    }
    
    console.log(`\n✅ Created ${createdContainers} new containers`);
    console.log(`✅ Linked ${linkedItems} items to containers`);
    
    // Step 4: Clean up any duplicate containers
    await cleanupDuplicateContainers();
    
    // Step 5: Verify the final structure
    await verifyFinalStructure();
    
  } catch (error) {
    console.error('❌ Error in comprehensive sublist fix:', error);
    throw error;
  }
}

async function cleanupDuplicateContainers() {
  console.log('\n🧹 Cleaning up duplicate containers...');
  
  // Find all sublist containers
  const containers = await prisma.pipelineItem.findMany({
    where: { isSublist: true },
    include: {
      children: true
    }
  });
  
  // Group containers by leadId, bdr, and company
  const containerGroups = new Map<string, any[]>();
  
  for (const container of containers) {
    const key = `${container.leadId}-${container.bdr}-${container.company}`;
    if (!containerGroups.has(key)) {
      containerGroups.set(key, []);
    }
    containerGroups.get(key)!.push(container);
  }
  
  let deletedContainers = 0;
  
  for (const [key, groupContainers] of Array.from(containerGroups)) {
    if (groupContainers.length > 1) {
      // Keep the first container, delete the rest
      const [keepContainer, ...duplicates] = groupContainers;
      
      for (const duplicate of duplicates) {
        // Move all children to the keep container
        const children = await prisma.pipelineItem.findMany({
          where: { parentId: duplicate.id }
        });
        
        for (const child of children) {
          await prisma.pipelineItem.update({
            where: { id: child.id },
            data: { parentId: keepContainer.id }
          });
        }
        
        // Delete the duplicate container
        await prisma.pipelineItem.delete({
          where: { id: duplicate.id }
        });
        
        deletedContainers++;
      }
    }
  }
  
  console.log(`✅ Deleted ${deletedContainers} duplicate containers`);
}

async function verifyFinalStructure() {
  console.log('\n🔍 Verifying final sublist structure...');
  
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
      category: 'Lists_Media_QA',
      status: {
        in: ['Contacted', 'Interested', 'Sold', 'Follow-up Required', 'Declined']
      }
    }
  });
  
  console.log(`📊 Final Sublist Structure:`);
  console.log(`   Sublist Containers: ${containerCount}`);
  console.log(`   Subitems: ${subitemCount}`);
  console.log(`   Orphaned Items: ${orphanedCount}`);
  
  if (orphanedCount > 0) {
    console.log(`⚠️  Still have ${orphanedCount} orphaned items`);
  } else {
    console.log(`✅ All sublist relationships are properly structured!`);
  }
  
  // Show some examples of the structure
  const sampleContainers = await prisma.pipelineItem.findMany({
    where: { isSublist: true },
    take: 5,
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
  
  // Show BDR breakdown for sublists
  const bdrBreakdown = await prisma.pipelineItem.groupBy({
    by: ['bdr'],
    where: { isSublist: true },
    _count: { bdr: true }
  });
  
  console.log(`\n👥 BDR Sublist Breakdown:`);
  bdrBreakdown.forEach(item => {
    console.log(`   ${item.bdr}: ${item._count.bdr} sublists`);
  });
}

async function main() {
  try {
    await comprehensiveSublistFix();
    
    console.log('\n🎉 Comprehensive sublist fix completed!');
    
  } catch (error) {
    console.error('❌ Error in main execution:', error);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  main().catch(console.error);
}

export { comprehensiveSublistFix }; 