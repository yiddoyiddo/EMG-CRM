import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verifySublistStructure() {
  console.log('🔍 Verifying Sublist Structure...\n');
  
  // Get sublist parents (sold items with partner networks)
  const sublistParents = await prisma.pipelineItem.findMany({
    where: {
      isSublist: true,
      status: 'Sold'
    },
    include: {
      children: {
        orderBy: { sortOrder: 'asc' }
      }
    },
    take: 3 // Show first 3 examples
  });
  
  console.log('📊 SOLD ITEMS WITH PARTNER SUBLISTS:');
  console.log('=====================================');
  
  for (const parent of sublistParents) {
    const dealsInSublist = parent.children.filter(child => child.status === 'Sold');
    const totalDealValue = dealsInSublist.reduce((sum, child) => sum + (child.value || 0), 0);
    
    console.log(`\n🏢 ${parent.name} - ${parent.company}`);
    console.log(`   Status: ${parent.status} | BDR: ${parent.bdr}`);
    console.log(`   Partner List Size: ${parent.children.length} partners`);
    console.log(`   Deals Closed: ${dealsInSublist.length} deals`);
    console.log(`   Total Revenue: £${totalDealValue.toLocaleString()}`);
    console.log('   📋 Partners:');
    
    for (const child of parent.children.slice(0, 5)) { // Show first 5 partners
      const statusIcon = child.status === 'Sold' ? '💰' : 
                        child.status === 'Interested' ? '👀' : 
                        child.status === 'Follow-up Required' ? '📞' : 
                        child.status === 'Contacted' ? '📧' : '❌';
      
      console.log(`      ${statusIcon} ${child.name} (${child.company})`);
      console.log(`         Status: ${child.status}`);
      if (child.value && child.status === 'Sold') {
        console.log(`         Deal: £${child.value.toLocaleString()}`);
      }
      console.log(`         Notes: ${child.notes?.substring(0, 80)}...`);
    }
    
    if (parent.children.length > 5) {
      console.log(`      ... and ${parent.children.length - 5} more partners`);
    }
  }
  
  // Get list out items with sublists but no deals yet
  const listOutParents = await prisma.pipelineItem.findMany({
    where: {
      isSublist: true,
      OR: [
        { status: 'Partner List Sent' },
        { status: 'List Out' },
        { status: 'List Out - Not Sold' }
      ]
    },
    include: {
      children: {
        orderBy: { sortOrder: 'asc' }
      }
    },
    take: 2 // Show first 2 examples
  });
  
  console.log('\n\n📋 LIST OUT ITEMS WITH PARTNER SUBLISTS:');
  console.log('=========================================');
  
  for (const parent of listOutParents) {
    const dealsInSublist = parent.children.filter(child => child.status === 'Sold');
    const interestedPartners = parent.children.filter(child => child.status === 'Interested');
    
    console.log(`\n🏢 ${parent.name} - ${parent.company}`);
    console.log(`   Status: ${parent.status} | BDR: ${parent.bdr}`);
    console.log(`   Partner List Size: ${parent.children.length} partners`);
    console.log(`   Early Deals: ${dealsInSublist.length} deals`);
    console.log(`   Interested: ${interestedPartners.length} prospects`);
    console.log('   📋 Partners:');
    
    for (const child of parent.children.slice(0, 4)) { // Show first 4 partners
      const statusIcon = child.status === 'Sold' ? '💰' : 
                        child.status === 'Interested' ? '👀' : 
                        child.status === 'Follow-up Required' ? '📞' : 
                        child.status === 'Contacted' ? '📧' : '❌';
      
      console.log(`      ${statusIcon} ${child.name} (${child.company})`);
      console.log(`         Status: ${child.status}`);
      if (child.value && child.status === 'Sold') {
        console.log(`         Early Deal: £${child.value.toLocaleString()}`);
      }
      console.log(`         Notes: ${child.notes?.substring(0, 80)}...`);
    }
    
    if (parent.children.length > 4) {
      console.log(`      ... and ${parent.children.length - 4} more partners`);
    }
  }
  
  // Summary statistics
  const totalSublistParents = await prisma.pipelineItem.count({ where: { isSublist: true } });
  const totalPartnerContacts = await prisma.pipelineItem.count({ where: { parentId: { not: null } } });
  const totalIndividualDeals = await prisma.pipelineItem.count({ 
    where: { 
      parentId: { not: null },
      status: 'Sold'
    }
  });
  
  const totalDealValueAgg = await prisma.pipelineItem.aggregate({
    where: {
      parentId: { not: null },
      status: 'Sold'
    },
    _sum: { value: true }
  });
  
  const soldParents = await prisma.pipelineItem.count({ 
    where: { 
      isSublist: true,
      status: 'Sold'
    }
  });
  
  const listOutParentsCount = await prisma.pipelineItem.count({ 
    where: { 
      isSublist: true,
      OR: [
        { status: 'Partner List Sent' },
        { status: 'List Out' },
        { status: 'List Out - Not Sold' }
      ]
    }
  });
  
  console.log('\n\n📊 SUBLIST STRUCTURE SUMMARY:');
  console.log('==============================');
  console.log(`🏢 Total Sublist Parents: ${totalSublistParents}`);
  console.log(`   - Sold (with deals): ${soldParents}`);
  console.log(`   - List Out (early stage): ${listOutParentsCount}`);
  console.log(`👥 Total Partner Contacts: ${totalPartnerContacts}`);
  console.log(`💰 Individual Deals Closed: ${totalIndividualDeals}`);
  console.log(`💷 Total Deal Value: £${totalDealValueAgg._sum.value?.toLocaleString() || 0}`);
  console.log(`📈 Average Deal Size: £${totalIndividualDeals > 0 ? Math.round((totalDealValueAgg._sum.value || 0) / totalIndividualDeals).toLocaleString() : 0}`);
  
  console.log('\n✅ PERFECT! Now when reporting shows "Sold", it can drill down into:');
  console.log('   • The partner list that was sent');
  console.log('   • Individual partners in that list');
  console.log('   • Specific deals closed with amounts');
  console.log('   • Partners still in progress');
  console.log('\n✅ And "List Out" items show the partner engagement process!');
}

async function main() {
  try {
    await verifySublistStructure();
  } catch (error) {
    console.error('Error verifying sublist structure:', error);
    throw error;
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());