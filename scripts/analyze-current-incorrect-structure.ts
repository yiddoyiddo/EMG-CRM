import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function analyzeCurrentIncorrectStructure() {
  try {
    console.log('🔍 Analyzing current incorrect structure...\n');

    // 1. Find all pipeline items with deals in notes
    const pipelineItemsWithDealsInNotes = await prisma.pipelineItem.findMany({
      where: {
        OR: [
          { notes: { contains: 'deal' } },
          { notes: { contains: 'sold' } },
          { notes: { contains: 'purchase' } },
          { notes: { contains: 'bought' } },
          { notes: { contains: 'payment' } },
          { notes: { contains: 'invoice' } },
          { notes: { contains: 'revenue' } },
          { notes: { contains: '£' } },
          { notes: { contains: '$' } },
        ]
      },
      include: {
        activityLogs: {
          orderBy: { timestamp: 'desc' }
        },
        children: {
          include: {
            activityLogs: {
              orderBy: { timestamp: 'desc' }
            }
          }
        }
      }
    });

    console.log(`📊 Found ${pipelineItemsWithDealsInNotes.length} pipeline items with deals in notes`);

    // 2. Analyze sublists with deals in notes
    const sublistsWithDealsInNotes = pipelineItemsWithDealsInNotes.filter(item => item.isSublist);
    console.log(`📋 Found ${sublistsWithDealsInNotes.length} sublists with deals in notes`);

    // 3. Analyze individual items with deals in notes
    const individualItemsWithDealsInNotes = pipelineItemsWithDealsInNotes.filter(item => !item.isSublist);
    console.log(`📝 Found ${individualItemsWithDealsInNotes.length} individual items with deals in notes`);

    // 4. Check for proper activity logs
    const itemsWithProperActivityLogs = await prisma.pipelineItem.findMany({
      where: {
        activityLogs: {
          some: {
            OR: [
              { activityType: 'Deal_Closed' },
              { activityType: 'Sale_Completed' },
              { description: { contains: 'deal' } },
              { description: { contains: 'sold' } },
              { notes: { contains: 'deal' } },
              { notes: { contains: 'sold' } },
            ]
          }
        }
      },
      include: {
        activityLogs: {
          where: {
            OR: [
              { activityType: 'Deal_Closed' },
              { activityType: 'Sale_Completed' },
              { description: { contains: 'deal' } },
              { description: { contains: 'sold' } },
              { notes: { contains: 'deal' } },
              { notes: { contains: 'sold' } },
            ]
          },
          orderBy: { timestamp: 'desc' }
        }
      }
    });

    console.log(`✅ Found ${itemsWithProperActivityLogs.length} items with proper activity logs for deals`);

    // 5. Detailed analysis of problematic items
    console.log('\n🔍 DETAILED ANALYSIS:');
    console.log('=====================');

    for (const item of pipelineItemsWithDealsInNotes) {
      console.log(`\n📋 Item: ${item.name} (ID: ${item.id})`);
      console.log(`   Category: ${item.category}`);
      console.log(`   Status: ${item.status}`);
      console.log(`   Is Sublist: ${item.isSublist}`);
      console.log(`   Value: £${item.value || 0}`);
      
      if (item.notes) {
        console.log(`   Notes with deals: ${item.notes.substring(0, 200)}${item.notes.length > 200 ? '...' : ''}`);
      }

      // Check if it has proper activity logs
      const hasProperActivityLogs = item.activityLogs.some(log => 
        log.activityType === 'Deal_Closed' || 
        log.activityType === 'Sale_Completed' ||
        log.description.toLowerCase().includes('deal') ||
        log.description.toLowerCase().includes('sold') ||
        (log.notes && (log.notes.toLowerCase().includes('deal') || log.notes.toLowerCase().includes('sold')))
      );

      console.log(`   Has proper activity logs: ${hasProperActivityLogs ? '✅' : '❌'}`);
      
      if (item.children.length > 0) {
        console.log(`   Children: ${item.children.length}`);
        for (const child of item.children) {
          const childHasDealsInNotes = child.notes && (
            child.notes.toLowerCase().includes('deal') ||
            child.notes.toLowerCase().includes('sold') ||
            child.notes.toLowerCase().includes('£') ||
            child.notes.toLowerCase().includes('$')
          );
          
          const childHasProperActivityLogs = child.activityLogs.some(log => 
            log.activityType === 'Deal_Closed' || 
            log.activityType === 'Sale_Completed' ||
            log.description.toLowerCase().includes('deal') ||
            log.description.toLowerCase().includes('sold') ||
            (log.notes && (log.notes.toLowerCase().includes('deal') || log.notes.toLowerCase().includes('sold')))
          );

          console.log(`     - ${child.name}: Notes with deals: ${childHasDealsInNotes ? '❌' : '✅'}, Activity logs: ${childHasProperActivityLogs ? '✅' : '❌'}`);
        }
      }
    }

    // 6. Summary statistics
    console.log('\n📊 SUMMARY STATISTICS:');
    console.log('======================');
    
    const totalItemsWithDealsInNotes = pipelineItemsWithDealsInNotes.length;
    const totalItemsWithProperActivityLogs = itemsWithProperActivityLogs.length;
    const itemsNeedingMigration = totalItemsWithDealsInNotes - totalItemsWithProperActivityLogs;
    
    console.log(`Total items with deals in notes: ${totalItemsWithDealsInNotes}`);
    console.log(`Total items with proper activity logs: ${totalItemsWithProperActivityLogs}`);
    console.log(`Items needing migration: ${itemsNeedingMigration}`);
    
    // 7. Check for items that have both notes and activity logs (conflicts)
    const itemsWithBoth = pipelineItemsWithDealsInNotes.filter(item => {
      const hasDealsInNotes = item.notes && (
        item.notes.toLowerCase().includes('deal') ||
        item.notes.toLowerCase().includes('sold') ||
        item.notes.toLowerCase().includes('£') ||
        item.notes.toLowerCase().includes('$')
      );
      
      const hasProperActivityLogs = item.activityLogs.some(log => 
        log.activityType === 'Deal_Closed' || 
        log.activityType === 'Sale_Completed' ||
        log.description.toLowerCase().includes('deal') ||
        log.description.toLowerCase().includes('sold') ||
        (log.notes && (log.notes.toLowerCase().includes('deal') || log.notes.toLowerCase().includes('sold')))
      );
      
      return hasDealsInNotes && hasProperActivityLogs;
    });
    
    console.log(`Items with both notes and activity logs (conflicts): ${itemsWithBoth.length}`);

    // 8. Recommendations
    console.log('\n🎯 RECOMMENDATIONS:');
    console.log('===================');
    console.log('1. Clear all partner sublists with incorrect note-based deals');
    console.log('2. Recreate sublists with proper activity log structure');
    console.log('3. Ensure deal activities are timestamped in activity logs');
    console.log('4. Verify reporting can find deals by searching activity logs');
    console.log('5. Test time-based reporting (this week vs past sales)');

  } catch (error) {
    console.error('Error analyzing current structure:', error);
  } finally {
    await prisma.$disconnect();
  }
}

analyzeCurrentIncorrectStructure(); 