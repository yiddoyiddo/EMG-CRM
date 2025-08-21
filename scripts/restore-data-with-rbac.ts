import { PrismaClient } from '@prisma/client'
import fs from 'fs'
import path from 'path'

const prisma = new PrismaClient()

const BDR_USER_MAPPING = {
  'Naeem Patel': {
    name: 'Naeem Patel',
    email: 'naeem.patel@busenq.com',
    role: 'BDR' as const
  },
  'Jennifer Davies': {
    name: 'Jennifer Davies', 
    email: 'jennifer.davies@busenq.com',
    role: 'BDR' as const
  },
  'Mark Cawston': {
    name: 'Mark Cawston',
    email: 'mark.cawston@busenq.com', 
    role: 'BDR' as const
  },
  'Rupert Kay': {
    name: 'Rupert Kay',
    email: 'rupert.kay@busenq.com',
    role: 'BDR' as const
  },
  'Verity Kay': {
    name: 'Verity Kay',
    email: 'verity.kay@busenq.com',
    role: 'BDR' as const
  }
}

async function main() {
  console.log('🔧 Starting data restoration with RBAC migration...')

  // Read backup data
  const backupPath = path.join(process.cwd(), 'backup', 'final-dedup-backup-1753740024060.json')
  const backupData = JSON.parse(fs.readFileSync(backupPath, 'utf8'))

  console.log('📁 Backup data loaded successfully')
  console.log(`   - Pipeline Items: ${backupData.pipelineItems?.length || 0}`)
  console.log(`   - Activity Logs: ${backupData.activityLogs?.length || 0}`)

  // Step 1: Create User records
  console.log('\n👥 Creating User records...')
  const userMap = new Map<string, string>() // bdr name -> user id

  for (const [bdrName, userData] of Object.entries(BDR_USER_MAPPING)) {
    console.log(`   Creating user: ${bdrName}`)
    
    const user = await prisma.user.create({
      data: {
        name: userData.name,
        email: userData.email,
        hashedPassword: 'temp_password_' + Date.now(), // Temporary - should be updated
        role: userData.role
      }
    })
    
    userMap.set(bdrName, user.id)
    console.log(`   ✅ Created: ${user.name} (${user.id})`)
  }

  // Step 2: Restore Pipeline Items with User relations
  const oldToNewPipelineIds = new Map<number, number>() // old id -> new id
  
  if (backupData.pipelineItems?.length > 0) {
    console.log('\n📊 Restoring Pipeline Items...')
    
    let pipelineCount = 0
    for (const item of backupData.pipelineItems) {
      const bdrId = userMap.get(item.bdr)
      if (!bdrId) {
        console.warn(`   ⚠️  Unknown BDR: ${item.bdr} for pipeline item ${item.name}`)
        continue
      }

      const newPipelineItem = await prisma.pipelineItem.create({
        data: {
          name: item.name,
          title: item.title,
          addedDate: item.addedDate ? new Date(item.addedDate) : new Date(),
          lastUpdated: item.lastUpdated ? new Date(item.lastUpdated) : new Date(),
          bdrId: bdrId,
          company: item.company,
          category: item.category,
          status: item.status,
          value: item.value,
          probability: item.probability,
          expectedCloseDate: item.expectedCloseDate ? new Date(item.expectedCloseDate) : null,
          link: item.link,
          phone: item.phone,
          notes: item.notes,
          email: item.email,
          leadId: item.leadId,
          callDate: item.callDate ? new Date(item.callDate) : null,
          parentId: item.parentId,
          isSublist: item.isSublist || false,
          sublistName: item.sublistName,
          sortOrder: item.sortOrder,
          agreementDate: item.agreementDate ? new Date(item.agreementDate) : null,
          partnerListDueDate: item.partnerListDueDate ? new Date(item.partnerListDueDate) : null,
          partnerListSentDate: item.partnerListSentDate ? new Date(item.partnerListSentDate) : null,
          firstSaleDate: item.firstSaleDate ? new Date(item.firstSaleDate) : null,
          partnerListSize: item.partnerListSize,
          totalSalesFromList: item.totalSalesFromList
        }
      })
      
      // Map old ID to new ID
      oldToNewPipelineIds.set(item.id, newPipelineItem.id)
      
      pipelineCount++
      if (pipelineCount % 100 === 0) {
        console.log(`   📈 Restored ${pipelineCount} pipeline items...`)
      }
    }
    
    console.log(`   ✅ Restored ${pipelineCount} pipeline items`)
  }

  // Step 3: Restore Activity Logs with User relations
  if (backupData.activityLogs?.length > 0) {
    console.log('\n📝 Restoring Activity Logs...')
    
    let activityCount = 0
    for (const log of backupData.activityLogs) {
      const bdrId = userMap.get(log.bdr)
      if (!bdrId) {
        console.warn(`   ⚠️  Unknown BDR: ${log.bdr} for activity log ${log.id}`)
        continue
      }

      // Map old pipeline item ID to new ID if it exists
      let newPipelineItemId = null
      if (log.pipelineItemId) {
        newPipelineItemId = oldToNewPipelineIds.get(log.pipelineItemId)
        if (!newPipelineItemId) {
          console.warn(`   ⚠️  Unknown pipeline item ID: ${log.pipelineItemId} for activity log ${log.id}`)
          continue // Skip this activity log if we can't map the pipeline item
        }
      }

      await prisma.activityLog.create({
        data: {
          timestamp: log.timestamp ? new Date(log.timestamp) : new Date(),
          bdrId: bdrId,
          activityType: log.activityType,
          description: log.description,
          scheduledDate: log.scheduledDate ? new Date(log.scheduledDate) : null,
          completedDate: log.completedDate ? new Date(log.completedDate) : null,
          notes: log.notes,
          leadId: log.leadId, // Note: This may need similar handling if you have Lead data
          pipelineItemId: newPipelineItemId,
          previousStatus: log.previousStatus,
          newStatus: log.newStatus,
          previousCategory: log.previousCategory,
          newCategory: log.newCategory
        }
      })
      
      activityCount++
      if (activityCount % 100 === 0) {
        console.log(`   📝 Restored ${activityCount} activity logs...`)
      }
    }
    
    console.log(`   ✅ Restored ${activityCount} activity logs`)
  }

  // Step 4: Create admin user
  console.log('\n🔑 Creating admin user...')
  const adminUser = await prisma.user.create({
    data: {
      name: 'Admin User',
      email: 'admin@busenq.com',
      hashedPassword: 'temp_admin_password_' + Date.now(),
      role: 'ADMIN'
    }
  })
  console.log(`   ✅ Created admin user: ${adminUser.name} (${adminUser.id})`)

  // Summary
  console.log('\n📊 Restoration Summary:')
  console.log(`   👥 Users created: ${Object.keys(BDR_USER_MAPPING).length + 1} (${Object.keys(BDR_USER_MAPPING).length} BDRs + 1 admin)`)
  
  const finalPipelineCount = await prisma.pipelineItem.count()
  const finalActivityCount = await prisma.activityLog.count()
  const finalUserCount = await prisma.user.count()
  
  console.log(`   📊 Pipeline Items: ${finalPipelineCount}`)
  console.log(`   📝 Activity Logs: ${finalActivityCount}`)
  console.log(`   👥 Total Users: ${finalUserCount}`)
  
  console.log('\n✅ Data restoration with RBAC migration completed successfully!')
  console.log('\n⚠️  Important Notes:')
  console.log('   - All users have temporary passwords that should be updated')
  console.log('   - Admin user created with email: admin@busenq.com')
  console.log('   - Review user emails and update as needed')
}

main()
  .catch((e) => {
    console.error('❌ Error during data restoration:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })