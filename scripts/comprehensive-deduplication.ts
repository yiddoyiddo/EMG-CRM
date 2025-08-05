import { PrismaClient } from '@prisma/client';
import fs from 'fs';

const prisma = new PrismaClient();

interface MergeStrategy {
  keepRecordId: number;
  mergeFromIds: number[];
  mergedData: any;
  reason: string;
}

async function createBackup() {
  console.log('📁 Creating backup before deduplication...');
  const backupData = {
    timestamp: new Date().toISOString(),
    leads: await prisma.lead.findMany(),
    pipelineItems: await prisma.pipelineItem.findMany(),
    activityLogs: await prisma.activityLog.findMany()
  };
  
  const backupPath = `backup/dedup-backup-${Date.now()}.json`;
  fs.writeFileSync(backupPath, JSON.stringify(backupData, null, 2));
  console.log(`✅ Backup created: ${backupPath}`);
  return backupPath;
}

function selectBestRecord(records: any[], criteria: string[]): any {
  // Score records based on data completeness
  const scoredRecords = records.map(record => {
    let score = 0;
    
    // Score for having email
    if (record.email && record.email.trim()) score += 10;
    
    // Score for having phone
    if (record.phone && record.phone.trim()) score += 5;
    
    // Score for having notes
    if (record.notes && record.notes.trim()) score += 3;
    
    // Score for having title
    if (record.title && record.title.trim()) score += 2;
    
    // Score for having link
    if (record.link && record.link.trim()) score += 1;
    
    // Score for more recent dates
    if (record.lastUpdated) {
      const daysSinceUpdate = (Date.now() - new Date(record.lastUpdated).getTime()) / (1000 * 60 * 60 * 24);
      score += Math.max(0, 10 - daysSinceUpdate); // Recent updates get higher score
    }
    
    // Score for having more activity logs
    if (record.activityLogs && record.activityLogs.length > 0) {
      score += record.activityLogs.length * 2;
    }
    
    return { record, score };
  });
  
  // Sort by score (highest first), then by ID (oldest first as tiebreaker)
  scoredRecords.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.record.id - b.record.id;
  });
  
  return scoredRecords[0].record;
}

function mergeRecordData(best: any, others: any[]): any {
  const merged = { ...best };
  
  // Merge non-empty fields from other records
  others.forEach(other => {
    Object.keys(other).forEach(key => {
      if (key === 'id' || key === 'addedDate') return; // Don't merge these
      
      if (!merged[key] || merged[key] === '' || merged[key] === null) {
        if (other[key] && other[key] !== '' && other[key] !== null) {
          merged[key] = other[key];
        }
      }
    });
    
    // Special handling for notes - concatenate if different
    if (other.notes && other.notes.trim() && other.notes !== merged.notes) {
      if (merged.notes && merged.notes.trim()) {
        merged.notes = `${merged.notes}\n\n--- Merged from duplicate record ---\n${other.notes}`;
      } else {
        merged.notes = other.notes;
      }
    }
  });
  
  return merged;
}

async function dedupePipelineItems() {
  console.log('\n🔄 Processing Pipeline Item duplicates...');
  
  // Get all duplicate groups
  const duplicateGroups = await prisma.$queryRaw`
    SELECT name, company, GROUP_CONCAT(id) as ids
    FROM "PipelineItem"
    GROUP BY name, company
    HAVING COUNT(*) > 1
  ` as any[];
  
  const strategies: MergeStrategy[] = [];
  
  for (const group of duplicateGroups) {
    const ids = group.ids.split(',').map((id: string) => parseInt(id));
    console.log(`\n📋 Processing: ${group.name} @ ${group.company} (IDs: ${ids.join(', ')})`);
    
    // Get full records with related data
    const records = await prisma.pipelineItem.findMany({
      where: { id: { in: ids } },
      include: { activityLogs: true }
    });
    
    // Select the best record to keep
    const bestRecord = selectBestRecord(records, ['email', 'phone', 'notes', 'lastUpdated']);
    const otherRecords = records.filter(r => r.id !== bestRecord.id);
    
    console.log(`  🎯 Keeping record ID ${bestRecord.id} (best data quality)`);
    console.log(`  🗑️  Merging from IDs: ${otherRecords.map(r => r.id).join(', ')}`);
    
    // Create merged data
    const mergedData = mergeRecordData(bestRecord, otherRecords);
    
    strategies.push({
      keepRecordId: bestRecord.id,
      mergeFromIds: otherRecords.map(r => r.id),
      mergedData,
      reason: `Pipeline duplicate: ${group.name} @ ${group.company}`
    });
  }
  
  return strategies;
}

async function handleCrossTableDuplicates() {
  console.log('\n🔄 Processing cross-table duplicates...');
  
  // Get cross-table duplicates
  const crossDuplicates = await prisma.$queryRaw`
    SELECT 
      l.email,
      l.id as lead_id,
      l.name as lead_name,
      l.company as lead_company,
      p.id as pipeline_id,
      p.name as pipeline_name,
      p.company as pipeline_company
    FROM "Lead" l
    INNER JOIN "PipelineItem" p ON l.email = p.email
    WHERE l.email IS NOT NULL AND l.email != ''
    ORDER BY l.email
  ` as any[];
  
  const strategies: MergeStrategy[] = [];
  
  for (const dup of crossDuplicates) {
    console.log(`\n📧 Cross-table duplicate: ${dup.email}`);
    console.log(`  Lead: ID ${dup.lead_id} - ${dup.lead_name} @ ${dup.lead_company}`);
    console.log(`  Pipeline: ID ${dup.pipeline_id} - ${dup.pipeline_name} @ ${dup.pipeline_company}`);
    
    // Get full records
    const leadRecord = await prisma.lead.findUnique({
      where: { id: dup.lead_id },
      include: { activityLogs: true }
    });
    
    const pipelineRecord = await prisma.pipelineItem.findUnique({
      where: { id: dup.pipeline_id },
      include: { activityLogs: true }
    });
    
    if (leadRecord && pipelineRecord) {
      // Generally keep pipeline record as it's more advanced in the sales process
      // But merge any additional data from lead
      console.log(`  🎯 Keeping Pipeline record ID ${pipelineRecord.id}`);
      console.log(`  🔗 Will link and merge Lead ID ${leadRecord.id} data`);
      
      // Update pipeline record to reference the lead
      const mergedData = mergeRecordData(pipelineRecord, [leadRecord]);
      mergedData.leadId = leadRecord.id; // Establish the relationship
      
      strategies.push({
        keepRecordId: pipelineRecord.id,
        mergeFromIds: [], // Don't delete lead, just merge data
        mergedData,
        reason: `Cross-table link: ${dup.email}`
      });
    }
  }
  
  return strategies;
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
  ` as any[];
  
  for (const log of orphanedLogs) {
    console.log(`\n🔗 Orphaned Activity Log ID ${log.id}`);
    console.log(`  Description: ${log.description}`);
    console.log(`  Lead ID: ${log.leadId}, Pipeline ID: ${log.pipelineItemId}`);
    
    // Try to find a related record by name or other criteria
    let fixApplied = false;
    
    if (log.leadId) {
      console.log(`  ❌ Lead ID ${log.leadId} not found - setting to null`);
      await prisma.activityLog.update({
        where: { id: log.id },
        data: { leadId: null }
      });
      fixApplied = true;
    }
    
    if (log.pipelineItemId) {
      console.log(`  ❌ Pipeline ID ${log.pipelineItemId} not found - setting to null`);
      await prisma.activityLog.update({
        where: { id: log.id },
        data: { pipelineItemId: null }
      });
      fixApplied = true;
    }
    
    if (fixApplied) {
      console.log(`  ✅ Fixed orphaned references`);
    }
  }
}

async function executeMergeStrategies(strategies: MergeStrategy[]) {
  console.log('\n🚀 Executing merge strategies...');
  
  for (const strategy of strategies) {
    console.log(`\n📝 ${strategy.reason}`);
    console.log(`  Updating record ID ${strategy.keepRecordId}`);
    
    // Update the record with merged data
    await prisma.pipelineItem.update({
      where: { id: strategy.keepRecordId },
      data: {
        name: strategy.mergedData.name,
        title: strategy.mergedData.title,
        bdr: strategy.mergedData.bdr,
        company: strategy.mergedData.company,
        category: strategy.mergedData.category,
        status: strategy.mergedData.status,
        value: strategy.mergedData.value,
        probability: strategy.mergedData.probability,
        expectedCloseDate: strategy.mergedData.expectedCloseDate,
        link: strategy.mergedData.link,
        phone: strategy.mergedData.phone,
        notes: strategy.mergedData.notes,
        email: strategy.mergedData.email,
        leadId: strategy.mergedData.leadId,
        callDate: strategy.mergedData.callDate,
        lastUpdated: new Date()
      }
    });
    
    // Move activity logs from records being deleted
    if (strategy.mergeFromIds.length > 0) {
      for (const fromId of strategy.mergeFromIds) {
        await prisma.activityLog.updateMany({
          where: { pipelineItemId: fromId },
          data: { pipelineItemId: strategy.keepRecordId }
        });
      }
      
      // Delete the duplicate records
      await prisma.pipelineItem.deleteMany({
        where: { id: { in: strategy.mergeFromIds } }
      });
      
      console.log(`  🗑️  Deleted duplicate IDs: ${strategy.mergeFromIds.join(', ')}`);
    }
    
    console.log(`  ✅ Merge completed`);
  }
}

async function comprehensiveDeduplication() {
  try {
    console.log('🚀 Starting Comprehensive Deduplication Process');
    console.log('=' .repeat(60));
    
    // Step 1: Create backup
    await createBackup();
    
    // Step 2: Handle Pipeline Item duplicates
    const pipelineStrategies = await dedupePipelineItems();
    
    // Step 3: Handle cross-table duplicates
    const crossTableStrategies = await handleCrossTableDuplicates();
    
    // Step 4: Fix orphaned activity logs
    await fixOrphanedActivityLogs();
    
    // Step 5: Execute all merge strategies
    const allStrategies = [...pipelineStrategies, ...crossTableStrategies];
    await executeMergeStrategies(allStrategies);
    
    // Step 6: Final verification
    console.log('\n✅ DEDUPLICATION COMPLETE!');
    console.log('🔍 Running final verification...');
    
    const finalPipelineDuplicates = await prisma.$queryRaw`
      SELECT name, company, COUNT(*) as count
      FROM "PipelineItem"
      GROUP BY name, company
      HAVING COUNT(*) > 1
    ` as any[];
    
    console.log(`📊 Remaining pipeline duplicates: ${finalPipelineDuplicates.length}`);
    
    const finalCrossDuplicates = await prisma.$queryRaw`
      SELECT COUNT(*) as count
      FROM "Lead" l
      INNER JOIN "PipelineItem" p ON l.email = p.email
      WHERE l.email IS NOT NULL AND l.email != ''
    ` as any[];
    
    console.log(`🔗 Remaining cross-table matches: ${finalCrossDuplicates[0]?.count || 0}`);
    
    console.log('\n' + '='.repeat(60));
    console.log('🎉 Deduplication process completed successfully!');
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
if (require.main === module) {
  comprehensiveDeduplication();
}

export { comprehensiveDeduplication }; 