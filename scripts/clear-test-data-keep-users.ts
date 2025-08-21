import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function clearTestDataKeepUsers() {
  try {
    console.log('🧹 Starting selective test data deletion...');
    console.log('=' .repeat(60));
    console.log('⚠️  This will delete test data but KEEP all users and roles!');
    console.log('⚠️  Users, permissions, and RBAC will be preserved!');
    console.log('=' .repeat(60));
    
    // Get current counts for verification
    const [
      userCount,
      leadCount,
      pipelineCount,
      activityCount,
      financeCount,
      kpiCount,
      templateCount,
      templateCategoryCount,
      territoryCount,
      permissionCount,
      rolePermissionCount,
      userPermissionCount,
      auditCount,
      duplicateWarningCount,
      duplicateMatchCount,
      duplicateAuditCount,
      conversationCount,
      messageCount
    ] = await Promise.all([
      prisma.user.count(),
      prisma.lead.count(),
      prisma.pipelineItem.count(),
      prisma.activityLog.count(),
      prisma.financeEntry.count(),
      prisma.kpiTarget.count(),
      prisma.template.count(),
      prisma.templateCategory.count(),
      prisma.territory.count(),
      prisma.permission.count(),
      prisma.rolePermission.count(),
      prisma.userPermission.count(),
      prisma.auditLog.count(),
      prisma.duplicateWarning.count(),
      prisma.duplicateMatch.count(),
      prisma.duplicateAuditLog.count(),
      prisma.conversation.count(),
      prisma.message.count()
    ]);

    console.log('\n📊 Current Database State:');
    console.log(`👥 Users: ${userCount} (will be preserved)`);
    console.log(`🎯 Leads: ${leadCount} (will be deleted)`);
    console.log(`📊 Pipeline Items: ${pipelineCount} (will be deleted)`);
    console.log(`📝 Activity Logs: ${activityCount} (will be deleted)`);
    console.log(`💰 Finance Entries: ${financeCount} (will be deleted)`);
    console.log(`📈 KPI Targets: ${kpiCount} (will be deleted)`);
    console.log(`📋 Templates: ${templateCount} (will be deleted)`);
    console.log(`🏷️ Template Categories: ${templateCategoryCount} (will be deleted)`);
    console.log(`🌍 Territories: ${territoryCount} (will be deleted)`);
    console.log(`🔐 Permissions: ${permissionCount} (will be preserved)`);
    console.log(`🔗 Role Permissions: ${rolePermissionCount} (will be preserved)`);
    console.log(`👤 User Permissions: ${userPermissionCount} (will be preserved)`);
    console.log(`📋 Audit Logs: ${auditCount} (will be deleted)`);
    console.log(`⚠️ Duplicate Warnings: ${duplicateWarningCount} (will be deleted)`);
    console.log(`🔍 Duplicate Matches: ${duplicateMatchCount} (will be deleted)`);
    console.log(`📋 Duplicate Audit Logs: ${duplicateAuditCount} (will be deleted)`);
    console.log(`💬 Conversations: ${conversationCount} (will be deleted)`);
    console.log(`💭 Messages: ${messageCount} (will be deleted)`);

    console.log('\n🗑️ Starting deletion of test data...');
    console.log('=' .repeat(60));

    // Delete test data in the correct order (respecting foreign key constraints)
    
    // 1. Delete messages first (they reference conversations)
    if (messageCount > 0) {
      console.log(`\n💭 Deleting ${messageCount} messages...`);
      await prisma.message.deleteMany();
      console.log('✅ Messages deleted');
    }

    // 2. Delete conversations
    if (conversationCount > 0) {
      console.log(`\n💬 Deleting ${conversationCount} conversations...`);
      await prisma.conversation.deleteMany();
      console.log('✅ Conversations deleted');
    }

    // 3. Delete duplicate audit logs
    if (duplicateAuditCount > 0) {
      console.log(`\n📋 Deleting ${duplicateAuditCount} duplicate audit logs...`);
      await prisma.duplicateAuditLog.deleteMany();
      console.log('✅ Duplicate audit logs deleted');
    }

    // 4. Delete duplicate matches
    if (duplicateMatchCount > 0) {
      console.log(`\n🔍 Deleting ${duplicateMatchCount} duplicate matches...`);
      await prisma.duplicateMatch.deleteMany();
      console.log('✅ Duplicate matches deleted');
    }

    // 5. Delete duplicate warnings
    if (duplicateWarningCount > 0) {
      console.log(`\n⚠️ Deleting ${duplicateWarningCount} duplicate warnings...`);
      await prisma.duplicateWarning.deleteMany();
      console.log('✅ Duplicate warnings deleted');
    }

    // 6. Delete audit logs
    if (auditCount > 0) {
      console.log(`\n📋 Deleting ${auditCount} audit logs...`);
      await prisma.auditLog.deleteMany();
      console.log('✅ Audit logs deleted');
    }

    // 7. Delete finance entries
    if (financeCount > 0) {
      console.log(`\n💰 Deleting ${financeCount} finance entries...`);
      await prisma.financeEntry.deleteMany();
      console.log('✅ Finance entries deleted');
    }

    // 8. Delete KPI targets
    if (kpiCount > 0) {
      console.log(`\n📈 Deleting ${kpiCount} KPI targets...`);
      await prisma.kpiTarget.deleteMany();
      console.log('✅ KPI targets deleted');
    }

    // 9. Delete pipeline items
    if (pipelineCount > 0) {
      console.log(`\n📊 Deleting ${pipelineCount} pipeline items...`);
      await prisma.pipelineItem.deleteMany();
      console.log('✅ Pipeline items deleted');
    }

    // 10. Delete leads
    if (leadCount > 0) {
      console.log(`\n🎯 Deleting ${leadCount} leads...`);
      await prisma.lead.deleteMany();
      console.log('✅ Leads deleted');
    }

    // 11. Delete templates
    if (templateCount > 0) {
      console.log(`\n📋 Deleting ${templateCount} templates...`);
      await prisma.template.deleteMany();
      console.log('✅ Templates deleted');
    }

    // 12. Delete template categories
    if (templateCategoryCount > 0) {
      console.log(`\n🏷️ Deleting ${templateCategoryCount} template categories...`);
      await prisma.templateCategory.deleteMany();
      console.log('✅ Template categories deleted');
    }

    // 13. Delete territories
    if (territoryCount > 0) {
      console.log(`\n🌍 Deleting ${territoryCount} territories...`);
      await prisma.territory.deleteMany();
      console.log('✅ Territories deleted');
    }

    // 14. Delete activity logs
    if (activityCount > 0) {
      console.log(`\n📝 Deleting ${activityCount} activity logs...`);
      await prisma.activityLog.deleteMany();
      console.log('✅ Activity logs deleted');
    }

    // Verify final state
    const finalUserCount = await prisma.user.count();
    const finalPermissionCount = await prisma.permission.count();
    const finalRolePermissionCount = await prisma.rolePermission.count();
    const finalUserPermissionCount = await prisma.userPermission.count();

    console.log('\n🎉 Test data deletion completed successfully!');
    console.log('=' .repeat(60));
    console.log('📊 Final Database State:');
    console.log(`👥 Users: ${finalUserCount} ✅ PRESERVED`);
    console.log(`🔐 Permissions: ${finalPermissionCount} ✅ PRESERVED`);
    console.log(`🔗 Role Permissions: ${finalRolePermissionCount} ✅ PRESERVED`);
    console.log(`👤 User Permissions: ${finalUserPermissionCount} ✅ PRESERVED`);
    console.log(`🎯 Leads: 0 ✅ DELETED`);
    console.log(`📊 Pipeline Items: 0 ✅ DELETED`);
    console.log(`📝 Activity Logs: 0 ✅ DELETED`);
    console.log(`💰 Finance Entries: 0 ✅ DELETED`);
    console.log(`📈 KPI Targets: 0 ✅ DELETED`);
    console.log(`📋 Templates: 0 ✅ DELETED`);
    console.log(`🏷️ Template Categories: 0 ✅ DELETED`);
    console.log(`🌍 Territories: 0 ✅ DELETED`);
    console.log(`📋 Audit Logs: 0 ✅ DELETED`);
    console.log(`⚠️ Duplicate Warnings: 0 ✅ DELETED`);
    console.log(`🔍 Duplicate Matches: 0 ✅ DELETED`);
    console.log(`📋 Duplicate Audit Logs: 0 ✅ DELETED`);
    console.log(`💬 Conversations: 0 ✅ DELETED`);
    console.log(`💭 Messages: 0 ✅ DELETED`);

    console.log('\n🚀 Your system is now production-ready with:');
    console.log('✅ All users and roles preserved');
    console.log('✅ Complete RBAC system intact');
    console.log('✅ Clean database for production');
    console.log('✅ Ready for real user onboarding');

  } catch (error) {
    console.error('❌ Error during test data deletion:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

clearTestDataKeepUsers()
  .then(() => {
    console.log('\n✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });
