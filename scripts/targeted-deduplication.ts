import { PrismaClient } from '@prisma/client';
import fs from 'fs';

const prisma = new PrismaClient();

async function createBackup() {
  console.log('📁 Creating backup before deduplication...');
  const timestamp = Date.now();
  const backupData = {
    timestamp: new Date().toISOString(),
    leads: await prisma.lead.findMany(),
    pipelineItems: await prisma.pipelineItem.findMany(),
    activityLogs: await prisma.activityLog.findMany()
  };
  
  const backupPath = `backup/dedup-backup-${timestamp}.json`;
  fs.writeFileSync(backupPath, JSON.stringify(backupData, null, 2));
  console.log(`✅ Backup created: ${backupPath}`);
  return backupPath;
}

async function fixPipelineDuplicates() {
  console.log('\n🔄 Fixing Pipeline Item duplicates...');
  
  // Get all duplicate groups (we know there are 11 groups from analysis)
  const duplicateGroups = await prisma.$queryRaw`
    SELECT name, company, GROUP_CONCAT(id) as ids, COUNT(*) as count
    FROM "PipelineItem"
    GROUP BY name, company
    HAVING COUNT(*) > 1
  ` as Array<{name: string, company: string, ids: string, count: number}>;
  
  console.log(`Found ${duplicateGroups.length} duplicate groups to process`);
  
  for (const group of duplicateGroups) {
    const ids = group.ids.split(',').map(id => parseInt(id.trim()));
    console.log(`\n📋 Processing: "${group.name}" @ "${group.company}"`);
    console.log(`   IDs to merge: [${ids.join(', ')}]`);
    
    // Get all records in this group
    const records = await prisma.pipelineItem.findMany({
      where: { id: { in: ids } },
      orderBy: { id: 'asc' }
    });
    
    if (records.length <= 1) {
      console.log('   ⚠️  No duplicates found, skipping');
      continue;
    }
    
    // Choose the record to keep (prefer one with more data)
    let bestRecord = records[0];
    let bestScore = 0;
    
    for (const record of records) {
      let score = 0;
      if (record.email && record.email.trim()) score += 10;
      if (record.phone && record.phone.trim()) score += 5;
      if (record.notes && record.notes.trim()) score += 3;
      if (record.title && record.title.trim()) score += 2;
      if (record.link && record.link.trim()) score += 1;
      
      if (score > bestScore) {
        bestScore = score;
        bestRecord = record;
      }
    }
    
    const recordsToDelete = records.filter(r => r.id !== bestRecord.id);
    console.log(`   🎯 Keeping record ID ${bestRecord.id} (score: ${bestScore})`);
    console.log(`   🗑️  Will delete IDs: [${recordsToDelete.map(r => r.id).join(', ')}]`);
    
    // Merge data into the best record
    let mergedNotes = bestRecord.notes || '';
    let mergedEmail = bestRecord.email;
    let mergedPhone = bestRecord.phone;
    let mergedTitle = bestRecord.title;
    let mergedLink = bestRecord.link;
    
    for (const record of recordsToDelete) {
      // Merge email if best doesn't have one
      if (!mergedEmail && record.email) mergedEmail = record.email;
      
      // Merge phone if best doesn't have one
      if (!mergedPhone && record.phone) mergedPhone = record.phone;
      
      // Merge title if best doesn't have one
      if (!mergedTitle && record.title) mergedTitle = record.title;
      
      // Merge link if best doesn't have one
      if (!mergedLink && record.link) mergedLink = record.link;
      
      // Merge notes
      if (record.notes && record.notes.trim() && record.notes !== mergedNotes) {
        if (mergedNotes && mergedNotes.trim()) {
          mergedNotes = `${mergedNotes}\n\n--- Merged from duplicate (ID ${record.id}) ---\n${record.notes}`;
        } else {
          mergedNotes = record.notes;
        }
      }
    }
    
    // Update the best record with merged data
    await prisma.pipelineItem.update({
      where: { id: bestRecord.id },
      data: {
        email: mergedEmail,
        phone: mergedPhone,
        title: mergedTitle,
        link: mergedLink,
        notes: mergedNotes,
        lastUpdated: new Date()
      }
    });
    
    // Move activity logs to the best record
    for (const record of recordsToDelete) {
      await prisma.activityLog.updateMany({
        where: { pipelineItemId: record.id },
        data: { pipelineItemId: bestRecord.id }
      });
    }
    
    // Delete the duplicate records
    await prisma.pipelineItem.deleteMany({
      where: { id: { in: recordsToDelete.map(r => r.id) } }
    });
    
    console.log(`   ✅ Successfully merged and deleted ${recordsToDelete.length} duplicates`);
  }
}

async function linkCrossTableDuplicates() {
  console.log('\n🔄 Linking cross-table duplicates...');
  
  // Get cross-table duplicates (same email in Lead and PipelineItem)
  const crossDuplicates = await prisma.$queryRaw`
    SELECT 
      l.email,
      l.id as lead_id,
      l.name as lead_name,
      l.company as lead_company,
      p.id as pipeline_id,
      p.name as pipeline_name,
      p.company as pipeline_company,
      p.leadId as current_lead_id
    FROM "Lead" l
    INNER JOIN "PipelineItem" p ON l.email = p.email
    WHERE l.email IS NOT NULL AND l.email != ''
    ORDER BY l.email
  ` as Array<{
    email: string,
    lead_id: number,
    lead_name: string,
    lead_company: string,
    pipeline_id: number,
    pipeline_name: string,
    pipeline_company: string,
    current_lead_id: number | null
  }>;
  
  console.log(`Found ${crossDuplicates.length} cross-table matches`);
  
  for (const match of crossDuplicates) {
    console.log(`\n📧 Processing: ${match.email}`);
    console.log(`   Lead: ID ${match.lead_id} - ${match.lead_name} @ ${match.lead_company}`);
    console.log(`   Pipeline: ID ${match.pipeline_id} - ${match.pipeline_name} @ ${match.pipeline_company}`);
    
    // If pipeline item doesn't already have a leadId, link it
    if (!match.current_lead_id) {
      await prisma.pipelineItem.update({
        where: { id: match.pipeline_id },
        data: { 
          leadId: match.lead_id,
          lastUpdated: new Date()
        }
      });
      console.log(`   🔗 Linked Pipeline ID ${match.pipeline_id} to Lead ID ${match.lead_id}`);
    } else {
      console.log(`   ℹ️  Pipeline item already linked to Lead ID ${match.current_lead_id}`);
    }
  }
}

async function fixOrphanedActivityLogs() {
  console.log('\n🔄 Fixing orphaned activity logs...');
  
  const orphanedLogs = await prisma.$queryRaw`
    SELECT a.id, a.leadId, a.pipelineItemId, a.description
    FROM "ActivityLog" a
    LEFT JOIN "Lead" l ON a.leadId = l.id
    LEFT JOIN "PipelineItem" p ON a.pipelineItemId = p.id
    WHERE (a.leadId IS NOT NULL AND l.id IS NULL)
       OR (a.pipelineItemId IS NOT NULL AND p.id IS NULL)
  ` as Array<{
    id: number,
    leadId: number | null,
    pipelineItemId: number | null,
    description: string
  }>;
  
  console.log(`Found ${orphanedLogs.length} orphaned activity logs`);
  
  for (const log of orphanedLogs) {
    console.log(`\n🔗 Orphaned Activity Log ID ${log.id}: "${log.description}"`);
    
    let updated = false;
    
    if (log.leadId) {
      console.log(`   ❌ Lead ID ${log.leadId} not found - setting to null`);
      await prisma.activityLog.update({
        where: { id: log.id },
        data: { leadId: null }
      });
      updated = true;
    }
    
    if (log.pipelineItemId) {
      console.log(`   ❌ Pipeline ID ${log.pipelineItemId} not found - setting to null`);
      await prisma.activityLog.update({
        where: { id: log.id },
        data: { pipelineItemId: null }
      });
      updated = true;
    }
    
    if (updated) {
      console.log(`   ✅ Fixed orphaned references`);
    }
  }
}

async function runVerification() {
  console.log('\n🔍 Running final verification...');
  
  // Check for remaining pipeline duplicates
  const remainingPipelineDuplicates = await prisma.$queryRaw`
    SELECT name, company, COUNT(*) as count
    FROM "PipelineItem"
    GROUP BY name, company
    HAVING COUNT(*) > 1
  ` as Array<{name: string, company: string, count: number}>;
  
  console.log(`📊 Remaining pipeline duplicates: ${remainingPipelineDuplicates.length}`);
  if (remainingPipelineDuplicates.length > 0) {
    remainingPipelineDuplicates.forEach(dup => {
      console.log(`   - ${dup.name} @ ${dup.company} (${dup.count} records)`);
    });
  }
  
  // Check for remaining cross-table duplicates without links
  const unlinkedCrossDuplicates = await prisma.$queryRaw`
    SELECT COUNT(*) as count
    FROM "Lead" l
    INNER JOIN "PipelineItem" p ON l.email = p.email
    WHERE l.email IS NOT NULL AND l.email != '' AND p.leadId IS NULL
  ` as Array<{count: number}>;
  
  console.log(`🔗 Unlinked cross-table matches: ${unlinkedCrossDuplicates[0]?.count || 0}`);
  
  // Check for remaining orphaned logs
  const remainingOrphans = await prisma.$queryRaw`
    SELECT COUNT(*) as count
    FROM "ActivityLog" a
    LEFT JOIN "Lead" l ON a.leadId = l.id
    LEFT JOIN "PipelineItem" p ON a.pipelineItemId = p.id
    WHERE (a.leadId IS NOT NULL AND l.id IS NULL)
       OR (a.pipelineItemId IS NOT NULL AND p.id IS NULL)
  ` as Array<{count: number}>;
  
  console.log(`🔗 Remaining orphaned activity logs: ${remainingOrphans[0]?.count || 0}`);
}

async function targetedDeduplication() {
  try {
    console.log('🚀 Starting Targeted Deduplication Process');
    console.log('=' .repeat(60));
    
    // Step 1: Create backup
    await createBackup();
    
    // Step 2: Fix Pipeline Item duplicates
    await fixPipelineDuplicates();
    
    // Step 3: Link cross-table duplicates
    await linkCrossTableDuplicates();
    
    // Step 4: Fix orphaned activity logs
    await fixOrphanedActivityLogs();
    
    // Step 5: Run verification
    await runVerification();
    
    console.log('\n' + '='.repeat(60));
    console.log('🎉 Targeted deduplication completed successfully!');
    console.log('📁 Data backup available for rollback if needed');
    
  } catch (error) {
    console.error('❌ Error during deduplication:', error);
    console.log('📁 Data backup available for recovery');
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Execute if run directly
targetedDeduplication(); 