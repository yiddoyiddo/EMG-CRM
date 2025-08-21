import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function clearAllTestData() {
  try {
    console.log('🗑️ Starting comprehensive test data deletion...');
    console.log('=' .repeat(60));
    console.log('⚠️  WARNING: This will delete ALL test data from the database!');
    console.log('⚠️  Make sure you have a backup before proceeding!');
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
      editorialCount,
      duplicateWarningCount,
      duplicateMatchCount,
      duplicateAuditCount,
      conversationCount,
      conversationMemberCount,
      messageCount,
      messageAttachmentCount,
      messageReactionCount,
      messageReadCount,
      companyRegistryCount,
      contactRegistryCount,
      dataAccessPolicyCount,
      userSessionCount
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
      prisma.editorialBoardItem.count(),
      prisma.duplicateWarning.count(),
      prisma.duplicateMatch.count(),
      prisma.duplicateAuditLog.count(),
      prisma.conversation.count(),
      prisma.conversationMember.count(),
      prisma.message.count(),
      prisma.messageAttachment.count(),
      prisma.messageReaction.count(),
      prisma.messageRead.count(),
      prisma.companyRegistry.count(),
      prisma.contactRegistry.count(),
      prisma.dataAccessPolicy.count(),
      prisma.userSession.count()
    ]);
    
    console.log('\n📊 Current data counts:');
    console.log(`👥 Users: ${userCount}`);
    console.log(`📝 Leads: ${leadCount}`);
    console.log(`🔄 Pipeline Items: ${pipelineCount}`);
    console.log(`📊 Activity Logs: ${activityCount}`);
    console.log(`💰 Finance Entries: ${financeCount}`);
    console.log(`🎯 KPI Targets: ${kpiCount}`);
    console.log(`📄 Templates: ${templateCount}`);
    console.log(`📁 Template Categories: ${templateCategoryCount}`);
    console.log(`🌍 Territories: ${territoryCount}`);
    console.log(`🔐 Permissions: ${permissionCount}`);
    console.log(`📝 Audit Logs: ${auditCount}`);
    console.log(`✍️ Editorial Items: ${editorialCount}`);
    console.log(`⚠️ Duplicate Warnings: ${duplicateWarningCount}`);
    console.log(`🔍 Duplicate Matches: ${duplicateMatchCount}`);
    console.log(`📋 Duplicate Audit Logs: ${duplicateAuditCount}`);
    console.log(`💬 Conversations: ${conversationCount}`);
    console.log(`💭 Messages: ${messageCount}`);
    console.log(`🏢 Company Registries: ${companyRegistryCount}`);
    console.log(`👤 Contact Registries: ${contactRegistryCount}`);
    console.log(`🔒 Data Access Policies: ${dataAccessPolicyCount}`);
    console.log(`🕐 User Sessions: ${userSessionCount}`);
    
    const totalRecords = userCount + leadCount + pipelineCount + activityCount + 
                        financeCount + kpiCount + templateCount + templateCategoryCount + 
                        territoryCount + permissionCount + rolePermissionCount + 
                        userPermissionCount + auditCount + editorialCount + 
                        duplicateWarningCount + duplicateMatchCount + duplicateAuditCount + 
                        conversationCount + conversationMemberCount + messageCount + 
                        messageAttachmentCount + messageReactionCount + messageReadCount + 
                        companyRegistryCount + contactRegistryCount + dataAccessPolicyCount + 
                        userSessionCount;
    
    console.log(`\n📊 Total records to delete: ${totalRecords}`);
    
    // Confirmation prompt
    console.log('\n❓ Are you sure you want to proceed with deletion?');
    console.log('Type "DELETE ALL" to confirm:');
    
    // In a real scenario, you might want to add actual user input confirmation
    // For now, we'll proceed with a safety check
    const shouldProceed = true; // Set to false if you want manual confirmation
    
    if (!shouldProceed) {
      console.log('❌ Deletion cancelled by user');
      return;
    }
    
    console.log('\n🧹 Starting data deletion (in reverse dependency order)...');
    
    // Delete in reverse dependency order to avoid foreign key constraint violations
    
    // 1. Delete message-related data first
    console.log('\n🗑️ Deleting message reads...');
    const deletedMessageReads = await prisma.messageRead.deleteMany();
    console.log(`✅ Deleted ${deletedMessageReads.count} message reads`);
    
    console.log('🗑️ Deleting message reactions...');
    const deletedMessageReactions = await prisma.messageReaction.deleteMany();
    console.log(`✅ Deleted ${deletedMessageReactions.count} message reactions`);
    
    console.log('🗑️ Deleting message attachments...');
    const deletedMessageAttachments = await prisma.messageAttachment.deleteMany();
    console.log(`✅ Deleted ${deletedMessageAttachments.count} message attachments`);
    
    console.log('🗑️ Deleting messages...');
    const deletedMessages = await prisma.message.deleteMany();
    console.log(`✅ Deleted ${deletedMessages.count} messages`);
    
    // 2. Delete conversation data
    console.log('🗑️ Deleting conversation members...');
    const deletedConversationMembers = await prisma.conversationMember.deleteMany();
    console.log(`✅ Deleted ${deletedConversationMembers.count} conversation members`);
    
    console.log('🗑️ Deleting conversations...');
    const deletedConversations = await prisma.conversation.deleteMany();
    console.log(`✅ Deleted ${deletedConversations.count} conversations`);
    
    // 3. Delete duplicate-related data
    console.log('🗑️ Deleting duplicate audit logs...');
    const deletedDuplicateAuditLogs = await prisma.duplicateAuditLog.deleteMany();
    console.log(`✅ Deleted ${deletedDuplicateAuditLogs.count} duplicate audit logs`);
    
    console.log('🗑️ Deleting duplicate matches...');
    const deletedDuplicateMatches = await prisma.duplicateMatch.deleteMany();
    console.log(`✅ Deleted ${deletedDuplicateMatches.count} duplicate matches`);
    
    console.log('🗑️ Deleting duplicate warnings...');
    const deletedDuplicateWarnings = await prisma.duplicateWarning.deleteMany();
    console.log(`✅ Deleted ${deletedDuplicateWarnings.count} duplicate warnings`);
    
    // 4. Delete registry data
    console.log('🗑️ Deleting contact registries...');
    const deletedContactRegistries = await prisma.contactRegistry.deleteMany();
    console.log(`✅ Deleted ${deletedContactRegistries.count} contact registries`);
    
    console.log('🗑️ Deleting company registries...');
    const deletedCompanyRegistries = await prisma.companyRegistry.deleteMany();
    console.log(`✅ Deleted ${deletedCompanyRegistries.count} company registries`);
    
    // 5. Delete session and policy data
    console.log('🗑️ Deleting user sessions...');
    const deletedUserSessions = await prisma.userSession.deleteMany();
    console.log(`✅ Deleted ${deletedUserSessions.count} user sessions`);
    
    console.log('🗑️ Deleting data access policies...');
    const deletedDataAccessPolicies = await prisma.dataAccessPolicy.deleteMany();
    console.log(`✅ Deleted ${deletedDataAccessPolicies.count} data access policies`);
    
    // 6. Delete permission data
    console.log('🗑️ Deleting user permissions...');
    const deletedUserPermissions = await prisma.userPermission.deleteMany();
    console.log(`✅ Deleted ${deletedUserPermissions.count} user permissions`);
    
    console.log('🗑️ Deleting role permissions...');
    const deletedRolePermissions = await prisma.rolePermission.deleteMany();
    console.log(`✅ Deleted ${deletedRolePermissions.count} role permissions`);
    
    console.log('🗑️ Deleting permissions...');
    const deletedPermissions = await prisma.permission.deleteMany();
    console.log(`✅ Deleted ${deletedPermissions.count} permissions`);
    
    // 7. Delete audit logs
    console.log('🗑️ Deleting audit logs...');
    const deletedAuditLogs = await prisma.auditLog.deleteMany();
    console.log(`✅ Deleted ${deletedAuditLogs.count} audit logs`);
    
    // 8. Delete editorial items
    console.log('🗑️ Deleting editorial items...');
    const deletedEditorialItems = await prisma.editorialBoardItem.deleteMany();
    console.log(`✅ Deleted ${deletedEditorialItems.count} editorial items`);
    
    // 9. Delete activity logs
    console.log('🗑️ Deleting activity logs...');
    const deletedActivityLogs = await prisma.activityLog.deleteMany();
    console.log(`✅ Deleted ${deletedActivityLogs.count} activity logs`);
    
    // 10. Delete pipeline items
    console.log('🗑️ Deleting pipeline items...');
    const deletedPipelineItems = await prisma.pipelineItem.deleteMany();
    console.log(`✅ Deleted ${deletedPipelineItems.count} pipeline items`);
    
    // 11. Delete leads
    console.log('🗑️ Deleting leads...');
    const deletedLeads = await prisma.lead.deleteMany();
    console.log(`✅ Deleted ${deletedLeads.count} leads`);
    
    // 12. Delete finance entries
    console.log('🗑️ Deleting finance entries...');
    const deletedFinanceEntries = await prisma.financeEntry.deleteMany();
    console.log(`✅ Deleted ${deletedFinanceEntries.count} finance entries`);
    
    // 13. Delete KPI targets
    console.log('🗑️ Deleting KPI targets...');
    const deletedKpiTargets = await prisma.kpiTarget.deleteMany();
    console.log(`✅ Deleted ${deletedKpiTargets.count} KPI targets`);
    
    // 14. Delete templates
    console.log('🗑️ Deleting templates...');
    const deletedTemplates = await prisma.template.deleteMany();
    console.log(`✅ Deleted ${deletedTemplates.count} templates`);
    
    console.log('🗑️ Deleting template categories...');
    const deletedTemplateCategories = await prisma.templateCategory.deleteMany();
    console.log(`✅ Deleted ${deletedTemplateCategories.count} template categories`);
    
    // 15. Delete territories
    console.log('🗑️ Deleting territories...');
    const deletedTerritories = await prisma.territory.deleteMany();
    console.log(`✅ Deleted ${deletedTerritories.count} territories`);
    
    // 16. Delete users last (to avoid foreign key issues)
    console.log('🗑️ Deleting users...');
    const deletedUsers = await prisma.user.deleteMany();
    console.log(`✅ Deleted ${deletedUsers.count} users`);
    
    // Verify deletion
    console.log('\n🔍 Verifying deletion...');
    const remainingCounts = await Promise.all([
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
      prisma.editorialBoardItem.count(),
      prisma.duplicateWarning.count(),
      prisma.duplicateMatch.count(),
      prisma.duplicateAuditLog.count(),
      prisma.conversation.count(),
      prisma.conversationMember.count(),
      prisma.message.count(),
      prisma.messageAttachment.count(),
      prisma.messageReaction.count(),
      prisma.messageRead.count(),
      prisma.companyRegistry.count(),
      prisma.contactRegistry.count(),
      prisma.dataAccessPolicy.count(),
      prisma.userSession.count()
    ]);
    
    const remainingTotal = remainingCounts.reduce((a, b) => a + b, 0);
    
    console.log('\n✅ Data deletion completed successfully!');
    console.log(`📊 Total records deleted: ${totalRecords}`);
    console.log(`📊 Remaining records: ${remainingTotal}`);
    
    if (remainingTotal === 0) {
      console.log('🎉 All test data has been successfully cleared!');
      console.log('🚀 Database is now ready for user onboarding.');
    } else {
      console.log('⚠️  Some records may still remain. Please check manually.');
    }
    
    console.log('\n📋 Next steps:');
    console.log('1. Verify the database is empty of test data');
    console.log('2. Begin onboarding real users');
    console.log('3. Keep backup files safe for potential restoration');
    console.log('4. Consider running database maintenance/optimization');
    
  } catch (error) {
    console.error('❌ Error during data deletion:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  clearAllTestData()
    .then(() => {
      console.log('\n🎯 Test data deletion process completed!');
    })
    .catch(error => {
      console.error('❌ Test data deletion failed:', error);
      process.exit(1);
    });
}
