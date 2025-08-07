import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('📊 Data Verification Results:')
  console.log('=' + '='.repeat(50))

  // Verify Users
  const users = await prisma.user.findMany()
  console.log(`\n👥 Users (${users.length} total):`)
  users.forEach(u => {
    console.log(`   - ${u.name} (${u.role}): ${u.email}`)
  })

  // Verify Pipeline Items with BDR relationships
  const pipelineItems = await prisma.pipelineItem.findMany({ 
    include: { bdr: true } 
  })
  console.log(`\n📈 Pipeline Items (${pipelineItems.length} total):`)
  
  const bdrCounts: Record<string, number> = {}
  pipelineItems.forEach(p => {
    const bdrName = p.bdr?.name || 'Unknown'
    bdrCounts[bdrName] = (bdrCounts[bdrName] || 0) + 1
  })
  
  Object.entries(bdrCounts).forEach(([name, count]) => {
    console.log(`   - ${name}: ${count} items`)
  })

  // Verify Activity Logs with relationships
  const activityLogs = await prisma.activityLog.findMany({ 
    include: { 
      bdr: true, 
      pipelineItem: { include: { bdr: true } } 
    } 
  })
  console.log(`\n📝 Activity Logs (${activityLogs.length} total):`)
  
  const activityBdrCounts: Record<string, number> = {}
  let linkedToPipeline = 0
  
  activityLogs.forEach(a => {
    const bdrName = a.bdr?.name || 'Unknown'
    activityBdrCounts[bdrName] = (activityBdrCounts[bdrName] || 0) + 1
    if (a.pipelineItem) linkedToPipeline++
  })
  
  Object.entries(activityBdrCounts).forEach(([name, count]) => {
    console.log(`   - ${name}: ${count} activities`)
  })
  console.log(`   - Linked to pipeline items: ${linkedToPipeline}`)

  // Check for any data integrity issues
  console.log(`\n🔍 Data Integrity Checks:`)
  
  const orphanedActivityLogs = activityLogs.filter(a => a.pipelineItemId && !a.pipelineItem)
  console.log(`   - Orphaned activity logs: ${orphanedActivityLogs.length}`)
  
  const usersWithoutData = users.filter(u => 
    !pipelineItems.some(p => p.bdrId === u.id) && 
    !activityLogs.some(a => a.bdrId === u.id)
  )
  console.log(`   - Users without data: ${usersWithoutData.length}`)
  
  // Sample some data to verify structure
  console.log(`\n📋 Sample Data:`)
  const samplePipeline = pipelineItems[0]
  if (samplePipeline) {
    console.log(`   Sample Pipeline Item:`)
    console.log(`      - Name: ${samplePipeline.name}`)
    console.log(`      - BDR: ${samplePipeline.bdr?.name}`)
    console.log(`      - Company: ${samplePipeline.company}`)
    console.log(`      - Status: ${samplePipeline.status}`)
  }
  
  const sampleActivity = activityLogs[0]
  if (sampleActivity) {
    console.log(`   Sample Activity Log:`)
    console.log(`      - Type: ${sampleActivity.activityType}`)
    console.log(`      - BDR: ${sampleActivity.bdr?.name}`)
    console.log(`      - Description: ${sampleActivity.description.substring(0, 50)}...`)
  }

  console.log(`\n✅ Data restoration verification completed!`)
  console.log(`   Total records restored: ${users.length + pipelineItems.length + activityLogs.length}`)
}

main()
  .catch((e) => {
    console.error('❌ Error during verification:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })