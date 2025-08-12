import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('📊 Analyzing Current CRM Data Structure\n');
  
  // Get current BDRs
  const leads = await prisma.lead.findMany();
  const pipelineItems = await prisma.pipelineItem.findMany();
  const activityLogs = await prisma.activityLog.findMany();
  
  // Extract unique BDRs
  const bdrSet = new Set<string>();
  leads.forEach(lead => lead.bdr && bdrSet.add(lead.bdr));
  pipelineItems.forEach(item => item.bdr && bdrSet.add(item.bdr));
  activityLogs.forEach(log => log.bdr && bdrSet.add(log.bdr));
  
  const bdrs = Array.from(bdrSet).filter(bdr => bdr);
  
  console.log('👥 Current BDRs:', bdrs.length);
  bdrs.forEach(bdr => console.log(`  - ${bdr}`));
  
  // Analyze data by BDR
  console.log('\n📊 Performance by BDR:');
  for (const bdr of bdrs) {
    const bdrLeads = leads.filter(l => l.bdr === bdr).length;
    const bdrPipeline = pipelineItems.filter(p => p.bdr === bdr).length;
    const bdrActivities = activityLogs.filter(a => a.bdr === bdr).length;
    const bdrCalls = activityLogs.filter(a => a.bdr === bdr && a.activityType === 'Call_Completed').length;
    const bdrAgreements = activityLogs.filter(a => a.bdr === bdr && a.activityType === 'Agreement_Sent').length;
    const bdrLists = activityLogs.filter(a => a.bdr === bdr && a.activityType === 'Partner_List_Sent').length;
    const bdrSold = pipelineItems.filter(p => p.bdr === bdr && p.status === 'Sold').length;
    
    console.log(`\n${bdr}:`);
    console.log(`  Leads: ${bdrLeads}, Pipeline: ${bdrPipeline}, Activities: ${bdrActivities}`);
    console.log(`  Calls: ${bdrCalls}, Agreements: ${bdrAgreements}, Lists: ${bdrLists}, Sold: ${bdrSold}`);
  }
  
  // Analyze date ranges
  const oldestLead = leads.reduce((oldest, lead) => 
    lead.addedDate < oldest.addedDate ? lead : oldest
  );
  const newestLead = leads.reduce((newest, lead) => 
    lead.addedDate > newest.addedDate ? lead : newest
  );
  
  console.log('\n📅 Date Range:');
  console.log(`  Oldest Lead: ${oldestLead.addedDate}`);
  console.log(`  Newest Lead: ${newestLead.addedDate}`);
  
  // Analyze activity types
  const activityTypes = new Map<string, number>();
  activityLogs.forEach(log => {
    activityTypes.set(log.activityType, (activityTypes.get(log.activityType) || 0) + 1);
  });
  
  console.log('\n📋 Activity Types:');
  Array.from(activityTypes.entries())
    .sort((a, b) => b[1] - a[1])
    .forEach(([type, count]) => console.log(`  ${type}: ${count}`));
  
  // Analyze statuses
  const statuses = new Map<string, number>();
  pipelineItems.forEach(item => {
    statuses.set(item.status, (statuses.get(item.status) || 0) + 1);
  });
  
  console.log('\n📈 Pipeline Statuses:');
  Array.from(statuses.entries())
    .sort((a, b) => b[1] - a[1])
    .forEach(([status, count]) => console.log(`  ${status}: ${count}`));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());