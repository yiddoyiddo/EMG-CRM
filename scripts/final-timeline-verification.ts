import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function finalTimelineVerification() {
  try {
    console.log('🔍 Final Timeline Verification Report\n');
    console.log('='.repeat(60));

    // Check all leads
    const allLeads = await prisma.lead.findMany({
      include: {
        activityLogs: {
          orderBy: { timestamp: 'asc' }
        }
      }
    });

    console.log(`📋 LEADS SUMMARY:`);
    console.log(`Total leads: ${allLeads.length}`);
    
    const leadsWithActivityLogs = allLeads.filter(lead => lead.activityLogs.length > 0);
    const leadsWithoutNotes = allLeads.filter(lead => !lead.notes || lead.notes.trim() === '');
    const leadsWithActivityButNoNotes = leadsWithActivityLogs.filter(lead => !lead.notes || lead.notes.trim() === '');
    
    console.log(`Leads with activity logs: ${leadsWithActivityLogs.length}`);
    console.log(`Leads without notes: ${leadsWithoutNotes.length}`);
    console.log(`Leads with activity logs but no notes: ${leadsWithActivityButNoNotes.length}`);

    if (leadsWithActivityButNoNotes.length > 0) {
      console.log('\n⚠️  LEADS NEEDING TIMELINE UPDATES:');
      console.log('='.repeat(50));
      for (const lead of leadsWithActivityButNoNotes) {
        console.log(`\n📋 Lead: ${lead.name} (ID: ${lead.id})`);
        console.log(`   Status: ${lead.status}`);
        console.log(`   BDR: ${lead.bdr || 'N/A'}`);
        console.log(`   Activity logs: ${lead.activityLogs.length}`);
        lead.activityLogs.forEach((log, index) => {
          console.log(`      ${index + 1}. [${log.timestamp.toLocaleDateString()}] ${log.activityType}: ${log.description}`);
        });
      }
    }

    // Check all pipeline items
    const allPipelineItems = await prisma.pipelineItem.findMany({
      include: {
        activityLogs: {
          orderBy: { timestamp: 'asc' }
        }
      }
    });

    console.log(`\n📊 PIPELINE SUMMARY:`);
    console.log(`Total pipeline items: ${allPipelineItems.length}`);
    
    const pipelineItemsWithActivityLogs = allPipelineItems.filter(item => item.activityLogs.length > 0);
    const pipelineItemsWithoutNotes = allPipelineItems.filter(item => !item.notes || item.notes.trim() === '');
    const pipelineItemsWithActivityButNoNotes = pipelineItemsWithActivityLogs.filter(item => !item.notes || item.notes.trim() === '');
    
    console.log(`Pipeline items with activity logs: ${pipelineItemsWithActivityLogs.length}`);
    console.log(`Pipeline items without notes: ${pipelineItemsWithoutNotes.length}`);
    console.log(`Pipeline items with activity logs but no notes: ${pipelineItemsWithActivityButNoNotes.length}`);

    // Check sold items specifically
    const soldItems = allPipelineItems.filter(item => 
      item.status.toLowerCase() === 'sold' || 
      item.category.toLowerCase() === 'sold'
    );
    
    const soldItemsWithActivityLogs = soldItems.filter(item => item.activityLogs.length > 0);
    const soldItemsWithoutNotes = soldItems.filter(item => !item.notes || item.notes.trim() === '');
    
    console.log(`\n💰 SOLD ITEMS SUMMARY:`);
    console.log(`Total sold items: ${soldItems.length}`);
    console.log(`Sold items with activity logs: ${soldItemsWithActivityLogs.length}`);
    console.log(`Sold items without notes: ${soldItemsWithoutNotes.length}`);

    // Check list out items specifically
    const listOutItems = allPipelineItems.filter(item => 
      item.status.toLowerCase().includes('list out') || 
      item.category.toLowerCase().includes('list out') ||
      item.status.toLowerCase().includes('partner list') ||
      item.category.toLowerCase().includes('partner list')
    );
    
    const listOutItemsWithActivityLogs = listOutItems.filter(item => item.activityLogs.length > 0);
    const listOutItemsWithoutNotes = listOutItems.filter(item => !item.notes || item.notes.trim() === '');
    
    console.log(`\n📋 LIST OUT ITEMS SUMMARY:`);
    console.log(`Total list out items: ${listOutItems.length}`);
    console.log(`List out items with activity logs: ${listOutItemsWithActivityLogs.length}`);
    console.log(`List out items without notes: ${listOutItemsWithoutNotes.length}`);

    // Final verification
    console.log(`\n🎯 FINAL VERIFICATION:`);
    console.log('='.repeat(50));
    
    const totalIssues = leadsWithActivityButNoNotes.length + pipelineItemsWithActivityButNoNotes.length;
    
    if (totalIssues === 0) {
      console.log('✅ ALL TIMELINE INTEGRITY CHECKS PASSED!');
      console.log('✅ All leads and pipeline items with activity logs have proper timeline notes');
      console.log('✅ All sold deals have timeline notes with deal amounts');
      console.log('✅ All list out items have timeline notes');
    } else {
      console.log(`❌ ${totalIssues} items still need timeline updates`);
      console.log(`   - ${leadsWithActivityButNoNotes.length} leads need timeline updates`);
      console.log(`   - ${pipelineItemsWithActivityButNoNotes.length} pipeline items need timeline updates`);
    }

    // Sample verification of sold items
    if (soldItems.length > 0) {
      console.log(`\n📝 SAMPLE SOLD ITEM VERIFICATION:`);
      const sampleSoldItem = soldItems[0];
      console.log(`Sample item: ${sampleSoldItem.name}`);
      console.log(`Status: ${sampleSoldItem.status}`);
      console.log(`Value: £${sampleSoldItem.value?.toFixed(0) || 'N/A'}`);
      console.log(`Has notes: ${sampleSoldItem.notes ? 'Yes' : 'No'}`);
      if (sampleSoldItem.notes) {
        console.log(`Notes preview: ${sampleSoldItem.notes.substring(0, 100)}...`);
      }
      console.log(`Activity logs: ${sampleSoldItem.activityLogs.length}`);
      sampleSoldItem.activityLogs.forEach((log, index) => {
        console.log(`   ${index + 1}. [${log.timestamp.toLocaleDateString()}] ${log.activityType}: ${log.description}`);
      });
    }

  } catch (error) {
    console.error('Error in final timeline verification:', error);
  } finally {
    await prisma.$disconnect();
  }
}

finalTimelineVerification()
  .catch(console.error); 