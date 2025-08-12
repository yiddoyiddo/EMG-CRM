import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function clearPartnerSublistsWithIncorrectNotes() {
  try {
    console.log('🧹 Clearing partner sublists with incorrect note-based deals...\n');

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
        children: true,
        activityLogs: {
          orderBy: { timestamp: 'desc' }
        }
      }
    });

    console.log(`📊 Found ${pipelineItemsWithDealsInNotes.length} pipeline items with deals in notes`);

    // 2. Create backup of current data before clearing
    const backupData = pipelineItemsWithDealsInNotes.map(item => ({
      id: item.id,
      name: item.name,
      notes: item.notes,
      value: item.value,
      status: item.status,
      category: item.category,
      bdr: item.bdr,
      company: item.company,
      children: item.children.map(child => ({
        id: child.id,
        name: child.name,
        notes: child.notes,
        value: child.value,
        status: child.status,
        category: child.category,
        bdr: child.bdr,
        company: child.company,
      }))
    }));

    // Save backup to file
    const fs = require('fs');
    const backupFileName = `backup/incorrect-notes-backup-${Date.now()}.json`;
    fs.writeFileSync(backupFileName, JSON.stringify(backupData, null, 2));
    console.log(`💾 Backup saved to: ${backupFileName}`);

    // 3. Clear notes from items with deals
    let clearedCount = 0;
    let childrenClearedCount = 0;

    for (const item of pipelineItemsWithDealsInNotes) {
      // Check if this item has deals in notes
      const hasDealsInNotes = item.notes && (
        item.notes.toLowerCase().includes('deal') ||
        item.notes.toLowerCase().includes('sold') ||
        item.notes.toLowerCase().includes('£') ||
        item.notes.toLowerCase().includes('$')
      );

      if (hasDealsInNotes) {
        // Clear the notes but keep other information
        await prisma.pipelineItem.update({
          where: { id: item.id },
          data: { 
            notes: null,
            lastUpdated: new Date()
          }
        });
        clearedCount++;
        console.log(`🧹 Cleared notes from: ${item.name} (ID: ${item.id})`);
      }

      // Clear notes from children that have deals
      for (const child of item.children) {
        const childHasDealsInNotes = child.notes && (
          child.notes.toLowerCase().includes('deal') ||
          child.notes.toLowerCase().includes('sold') ||
          child.notes.toLowerCase().includes('£') ||
          child.notes.toLowerCase().includes('$')
        );

        if (childHasDealsInNotes) {
          await prisma.pipelineItem.update({
            where: { id: child.id },
            data: { 
              notes: null,
              lastUpdated: new Date()
            }
          });
          childrenClearedCount++;
          console.log(`  🧹 Cleared notes from child: ${child.name} (ID: ${child.id})`);
        }
      }
    }

    console.log('\n📊 CLEARING SUMMARY:');
    console.log('=====================');
    console.log(`Items with notes cleared: ${clearedCount}`);
    console.log(`Children with notes cleared: ${childrenClearedCount}`);
    console.log(`Total items processed: ${pipelineItemsWithDealsInNotes.length}`);

    // 4. Verify clearing was successful
    const remainingItemsWithDealsInNotes = await prisma.pipelineItem.findMany({
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
      }
    });

    console.log(`\n✅ Verification: ${remainingItemsWithDealsInNotes.length} items still have deals in notes (should be 0)`);

    if (remainingItemsWithDealsInNotes.length === 0) {
      console.log('🎉 SUCCESS: All deals have been cleared from notes!');
      console.log('📋 Next step: Recreate sublists with proper activity log structure');
    } else {
      console.log('⚠️  WARNING: Some items still have deals in notes');
      for (const item of remainingItemsWithDealsInNotes) {
        console.log(`   - ${item.name} (ID: ${item.id}): ${item.notes?.substring(0, 100)}...`);
      }
    }

  } catch (error) {
    console.error('Error clearing partner sublists:', error);
  } finally {
    await prisma.$disconnect();
  }
}

clearPartnerSublistsWithIncorrectNotes(); 