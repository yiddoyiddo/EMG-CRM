import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

interface ComprehensiveBackup {
  timestamp: string;
  backupVersion: string;
  summary: {
    totalUsers: number;
    totalLeads: number;
    totalPipelineItems: number;
    totalActivityLogs: number;
    totalFinanceEntries: number;
    totalKpiTargets: number;
    totalTemplates: number;
    totalTemplateCategories: number;
    totalTerritories: number;
    totalPermissions: number;
    totalAuditLogs: number;
    totalEditorialItems: number;
    totalDuplicateWarnings: number;
    totalDuplicateMatches: number;
    totalDuplicateAuditLogs: number;
    totalConversations: number;
    totalMessages: number;
    totalCompanyRegistries: number;
    totalContactRegistries: number;
  };
  data: {
    users: any[];
    leads: any[];
    pipelineItems: any[];
    activityLogs: any[];
    financeEntries: any[];
    kpiTargets: any[];
    templates: any[];
    templateCategories: any[];
    territories: any[];
    permissions: any[];
    rolePermissions: any[];
    userPermissions: any[];
    auditLogs: any[];
    editorialItems: any[];
    duplicateWarnings: any[];
    duplicateMatches: any[];
    duplicateAuditLogs: any[];
    conversations: any[];
    conversationMembers: any[];
    messages: any[];
    messageAttachments: any[];
    messageReactions: any[];
    messageReads: any[];
    companyRegistries: any[];
    contactRegistries: any[];
    dataAccessPolicies: any[];
    userSessions: any[];
  };
}

async function createComprehensiveBackup(): Promise<string> {
  try {
    console.log('🚀 Starting comprehensive test data backup...');
    console.log('=' .repeat(60));
    
    const timestamp = Date.now();
    const backupPath = path.join(process.cwd(), 'backup', `comprehensive-test-data-backup-${timestamp}.json`);
    
    // Ensure backup directory exists
    const backupDir = path.dirname(backupPath);
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }
    
    console.log('📊 Collecting data from all tables...');
    
    // Collect all data from all tables
    const [
      users,
      leads,
      pipelineItems,
      activityLogs,
      financeEntries,
      kpiTargets,
      templates,
      templateCategories,
      territories,
      permissions,
      rolePermissions,
      userPermissions,
      auditLogs,
      editorialItems,
      duplicateWarnings,
      duplicateMatches,
      duplicateAuditLogs,
      conversations,
      conversationMembers,
      messages,
      messageAttachments,
      messageReactions,
      messageReads,
      companyRegistries,
      contactRegistries,
      dataAccessPolicies,
      userSessions
    ] = await Promise.all([
      prisma.user.findMany(),
      prisma.lead.findMany(),
      prisma.pipelineItem.findMany(),
      prisma.activityLog.findMany(),
      prisma.financeEntry.findMany(),
      prisma.kpiTarget.findMany(),
      prisma.template.findMany(),
      prisma.templateCategory.findMany(),
      prisma.territory.findMany(),
      prisma.permission.findMany(),
      prisma.rolePermission.findMany(),
      prisma.userPermission.findMany(),
      prisma.auditLog.findMany(),
      prisma.editorialBoardItem.findMany(),
      prisma.duplicateWarning.findMany(),
      prisma.duplicateMatch.findMany(),
      prisma.duplicateAuditLog.findMany(),
      prisma.conversation.findMany(),
      prisma.conversationMember.findMany(),
      prisma.message.findMany(),
      prisma.messageAttachment.findMany(),
      prisma.messageReaction.findMany(),
      prisma.messageRead.findMany(),
      prisma.companyRegistry.findMany(),
      prisma.contactRegistry.findMany(),
      prisma.dataAccessPolicy.findMany(),
      prisma.userSession.findMany()
    ]);
    
    console.log('✅ Data collection completed');
    
    // Create comprehensive backup object
    const backup: ComprehensiveBackup = {
      timestamp: new Date().toISOString(),
      backupVersion: '1.0.0',
      summary: {
        totalUsers: users.length,
        totalLeads: leads.length,
        totalPipelineItems: pipelineItems.length,
        totalActivityLogs: activityLogs.length,
        totalFinanceEntries: financeEntries.length,
        totalKpiTargets: kpiTargets.length,
        totalTemplates: templates.length,
        totalTemplateCategories: templateCategories.length,
        totalTerritories: territories.length,
        totalPermissions: permissions.length,
        totalAuditLogs: auditLogs.length,
        totalEditorialItems: editorialItems.length,
        totalDuplicateWarnings: duplicateWarnings.length,
        totalDuplicateMatches: duplicateMatches.length,
        totalDuplicateAuditLogs: duplicateAuditLogs.length,
        totalConversations: conversations.length,
        totalMessages: messages.length,
        totalCompanyRegistries: companyRegistries.length,
        totalContactRegistries: contactRegistries.length
      },
      data: {
        users,
        leads,
        pipelineItems,
        activityLogs,
        financeEntries,
        kpiTargets,
        templates,
        templateCategories,
        territories,
        permissions,
        rolePermissions,
        userPermissions,
        auditLogs,
        editorialItems,
        duplicateWarnings,
        duplicateMatches,
        duplicateAuditLogs,
        conversations,
        conversationMembers,
        messages,
        messageAttachments,
        messageReactions,
        messageReads,
        companyRegistries,
        contactRegistries,
        dataAccessPolicies,
        userSessions
      }
    };
    
    console.log('\n📋 Backup Summary:');
    console.log(`👥 Users: ${backup.summary.totalUsers}`);
    console.log(`📝 Leads: ${backup.summary.totalLeads}`);
    console.log(`🔄 Pipeline Items: ${backup.summary.totalPipelineItems}`);
    console.log(`📊 Activity Logs: ${backup.summary.totalActivityLogs}`);
    console.log(`💰 Finance Entries: ${backup.summary.totalFinanceEntries}`);
    console.log(`🎯 KPI Targets: ${backup.summary.totalKpiTargets}`);
    console.log(`📄 Templates: ${backup.summary.totalTemplates}`);
    console.log(`📁 Template Categories: ${backup.summary.totalTemplateCategories}`);
    console.log(`🌍 Territories: ${backup.summary.totalTerritories}`);
    console.log(`🔐 Permissions: ${backup.summary.totalPermissions}`);
    console.log(`📝 Audit Logs: ${backup.summary.totalAuditLogs}`);
    console.log(`✍️ Editorial Items: ${backup.summary.totalEditorialItems}`);
    console.log(`⚠️ Duplicate Warnings: ${backup.summary.totalDuplicateWarnings}`);
    console.log(`🔍 Duplicate Matches: ${backup.summary.totalDuplicateMatches}`);
    console.log(`📋 Duplicate Audit Logs: ${backup.summary.totalDuplicateAuditLogs}`);
    console.log(`💬 Conversations: ${backup.summary.totalConversations}`);
    console.log(`💭 Messages: ${backup.summary.totalMessages}`);
    console.log(`🏢 Company Registries: ${backup.summary.totalCompanyRegistries}`);
    console.log(`👤 Contact Registries: ${backup.summary.totalContactRegistries}`);
    
    // Write backup to file
    console.log('\n💾 Writing backup to file...');
    fs.writeFileSync(backupPath, JSON.stringify(backup, null, 2));
    
    console.log(`\n✅ Comprehensive backup completed successfully!`);
    console.log(`📁 Backup saved to: ${backupPath}`);
    console.log(`📊 Total records backed up: ${Object.values(backup.summary).reduce((a, b) => a + b, 0)}`);
    
    // Create a summary file for easy reference
    const summaryPath = path.join(process.cwd(), 'backup', `backup-summary-${timestamp}.txt`);
    const summaryContent = `COMPREHENSIVE TEST DATA BACKUP SUMMARY
Generated: ${new Date().toISOString()}
Backup File: comprehensive-test-data-backup-${timestamp}.json

RECORD COUNTS:
${Object.entries(backup.summary).map(([key, value]) => `${key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}: ${value}`).join('\n')}

TOTAL RECORDS: ${Object.values(backup.summary).reduce((a, b) => a + b, 0)}

NOTES:
- This backup contains ALL test data before deletion for user onboarding
- Use the JSON file for full data restoration if needed
- The backup includes all relationships and foreign key references
- All data is preserved in its current state

IMPORTANT: This backup should be kept safe as it contains all historical test data.
`;
    
    fs.writeFileSync(summaryPath, summaryContent);
    console.log(`📄 Summary file created: ${summaryPath}`);
    
    return backupPath;
    
  } catch (error) {
    console.error('❌ Error creating comprehensive backup:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Create a simple restoration script as well
async function createRestorationScript(backupPath: string): Promise<void> {
  const timestamp = Date.now();
  const restorationScriptPath = path.join(process.cwd(), 'backup', `restore-test-data-${timestamp}.ts`);
  
  const restorationScript = `import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function restoreTestData() {
  try {
    console.log('🔄 Restoring test data from backup...');
    
    // Read the backup file
    const backupPath = '${backupPath.replace(/\\/g, '/')}';
    const backupData = JSON.parse(fs.readFileSync(backupPath, 'utf-8'));
    
    console.log('📊 Backup contains:');
    console.log(\`  - \${backupData.summary.totalUsers} users\`);
    console.log(\`  - \${backupData.summary.totalLeads} leads\`);
    console.log(\`  - \${backupData.summary.totalPipelineItems} pipeline items\`);
    console.log(\`  - \${backupData.summary.totalActivityLogs} activity logs\`);
    console.log(\`  - \${backupData.summary.totalFinanceEntries} finance entries\`);
    console.log(\`  - \${backupData.summary.totalKpiTargets} KPI targets\`);
    console.log(\`  - \${backupData.summary.totalTemplates} templates\`);
    console.log(\`  - \${backupData.summary.totalTerritories} territories\`);
    console.log(\`  - \${backupData.summary.totalPermissions} permissions\`);
    
    // Clear existing data (in reverse dependency order)
    console.log('\\n🧹 Clearing existing data...');
    await prisma.messageRead.deleteMany();
    await prisma.messageReaction.deleteMany();
    await prisma.messageAttachment.deleteMany();
    await prisma.message.deleteMany();
    await prisma.conversationMember.deleteMany();
    await prisma.conversation.deleteMany();
    await prisma.duplicateAuditLog.deleteMany();
    await prisma.duplicateMatch.deleteMany();
    await prisma.duplicateWarning.deleteMany();
    await prisma.contactRegistry.deleteMany();
    await prisma.companyRegistry.deleteMany();
    await prisma.userSession.deleteMany();
    await prisma.dataAccessPolicy.deleteMany();
    await prisma.userPermission.deleteMany();
    await prisma.rolePermission.deleteMany();
    await prisma.permission.deleteMany();
    await prisma.auditLog.deleteMany();
    await prisma.editorialBoardItem.deleteMany();
    await prisma.activityLog.deleteMany();
    await prisma.pipelineItem.deleteMany();
    await prisma.lead.deleteMany();
    await prisma.financeEntry.deleteMany();
    await prisma.kpiTarget.deleteMany();
    await prisma.template.deleteMany();
    await prisma.templateCategory.deleteMany();
    await prisma.territory.deleteMany();
    await prisma.user.deleteMany();
    
    console.log('✅ Existing data cleared');
    
    // Restore data (in dependency order)
    console.log('\\n🔄 Restoring data...');
    
    // Restore users first
    if (backupData.data.users?.length > 0) {
      console.log(\`\\n👥 Restoring \${backupData.data.users.length} users...\`);
      for (const user of backupData.data.users) {
        try {
          await prisma.user.create({
            data: {
              id: user.id,
              name: user.name,
              email: user.email,
              hashedPassword: user.hashedPassword,
              role: user.role,
              createdAt: new Date(user.createdAt),
              updatedAt: new Date(user.updatedAt),
              isActive: user.isActive,
              lastLoginAt: user.lastLoginAt ? new Date(user.lastLoginAt) : null,
              territoryId: user.territoryId
            }
          });
        } catch (error) {
          console.error(\`Error restoring user \${user.email}:\`, error);
        }
      }
      console.log('✅ Users restored');
    }
    
    // Restore territories
    if (backupData.data.territories?.length > 0) {
      console.log(\`\\n🌍 Restoring \${backupData.data.territories.length} territories...\`);
      for (const territory of backupData.data.territories) {
        try {
          await prisma.territory.create({
            data: {
              id: territory.id,
              name: territory.name,
              description: territory.description,
              isActive: territory.isActive,
              createdAt: new Date(territory.createdAt),
              updatedAt: new Date(territory.updatedAt),
              managerId: territory.managerId
            }
          });
        } catch (error) {
          console.error(\`Error restoring territory \${territory.name}:\`, error);
        }
      }
      console.log('✅ Territories restored');
    }
    
    // Restore template categories
    if (backupData.data.templateCategories?.length > 0) {
      console.log(\`\\n📁 Restoring \${backupData.data.templateCategories.length} template categories...\`);
      for (const category of backupData.data.templateCategories) {
        try {
          await prisma.templateCategory.create({
            data: {
              id: category.id,
              name: category.name,
              description: category.description,
              sortOrder: category.sortOrder
            }
          });
        } catch (error) {
          console.error(\`Error restoring template category \${category.name}:\`, error);
        }
      }
      console.log('✅ Template categories restored');
    }
    
    // Restore templates
    if (backupData.data.templates?.length > 0) {
      console.log(\`\\n📄 Restoring \${backupData.data.templates.length} templates...\`);
      for (const template of backupData.data.templates) {
        try {
          await prisma.template.create({
            data: {
              id: template.id,
              title: template.title,
              content: template.content,
              type: template.type,
              tags: template.tags,
              isArchived: template.isArchived,
              createdAt: new Date(template.createdAt),
              updatedAt: new Date(template.updatedAt),
              createdById: template.createdById,
              updatedById: template.updatedById,
              categoryId: template.categoryId
            }
          });
        } catch (error) {
          console.error(\`Error restoring template \${template.title}:\`, error);
        }
      }
      console.log('✅ Templates restored');
    }
    
    // Restore permissions
    if (backupData.data.permissions?.length > 0) {
      console.log(\`\\n🔐 Restoring \${backupData.data.permissions.length} permissions...\`);
      for (const permission of backupData.data.permissions) {
        try {
          await prisma.permission.create({
            data: {
              id: permission.id,
              name: permission.name,
              resource: permission.resource,
              action: permission.action,
              description: permission.description,
              createdAt: new Date(permission.createdAt)
            }
          });
        } catch (error) {
          console.error(\`Error restoring permission \${permission.name}:\`, error);
        }
      }
      console.log('✅ Permissions restored');
    }
    
    // Restore role permissions
    if (backupData.data.rolePermissions?.length > 0) {
      console.log(\`\\n🔑 Restoring \${backupData.data.rolePermissions.length} role permissions...\`);
      for (const rolePerm of backupData.data.rolePermissions) {
        try {
          await prisma.rolePermission.create({
            data: {
              id: rolePerm.id,
              role: rolePerm.role,
              permissionId: rolePerm.permissionId,
              createdAt: new Date(rolePerm.createdAt)
            }
          });
        } catch (error) {
          console.error(\`Error restoring role permission \${rolePerm.id}:\`, error);
        }
      }
      console.log('✅ Role permissions restored');
    }
    
    // Restore user permissions
    if (backupData.data.userPermissions?.length > 0) {
      console.log(\`\\n👤 Restoring \${backupData.data.userPermissions.length} user permissions...\`);
      for (const userPerm of backupData.data.userPermissions) {
        try {
          await prisma.userPermission.create({
            data: {
              id: userPerm.id,
              userId: userPerm.userId,
              permissionId: userPerm.permissionId,
              grantedAt: new Date(userPerm.grantedAt),
              grantedBy: userPerm.grantedBy,
              expiresAt: userPerm.expiresAt ? new Date(userPerm.expiresAt) : null
            }
          });
        } catch (error) {
          console.error(\`Error restoring user permission \${userPerm.id}:\`, error);
        }
      }
      console.log('✅ User permissions restored');
    }
    
    // Restore KPI targets
    if (backupData.data.kpiTargets?.length > 0) {
      console.log(\`\\n🎯 Restoring \${backupData.data.kpiTargets.length} KPI targets...\`);
      for (const kpi of backupData.data.kpiTargets) {
        try {
          await prisma.kpiTarget.create({
            data: {
              id: kpi.id,
              name: kpi.name,
              value: kpi.value
            }
          });
        } catch (error) {
          console.error(\`Error restoring KPI target \${kpi.name}:\`, error);
        }
      }
      console.log('✅ KPI targets restored');
    }
    
    // Restore leads
    if (backupData.data.leads?.length > 0) {
      console.log(\`\\n📝 Restoring \${backupData.data.leads.length} leads...\`);
      for (const lead of backupData.data.leads) {
        try {
          await prisma.lead.create({
            data: {
              id: lead.id,
              name: lead.name,
              title: lead.title,
              addedDate: new Date(lead.addedDate),
              bdrId: lead.bdrId,
              company: lead.company,
              source: lead.source,
              status: lead.status,
              link: lead.link,
              phone: lead.phone,
              notes: lead.notes,
              email: lead.email
            }
          });
        } catch (error) {
          console.error(\`Error restoring lead \${lead.name}:\`, error);
        }
      }
      console.log('✅ Leads restored');
    }
    
    // Restore pipeline items
    if (backupData.data.pipelineItems?.length > 0) {
      console.log(\`\\n🔄 Restoring \${backupData.data.pipelineItems.length} pipeline items...\`);
      for (const item of backupData.data.pipelineItems) {
        try {
          await prisma.pipelineItem.create({
            data: {
              id: item.id,
              name: item.name,
              title: item.title,
              addedDate: new Date(item.addedDate),
              lastUpdated: new Date(item.lastUpdated),
              bdrId: item.bdrId,
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
              isSublist: item.isSublist,
              sublistName: item.sublistName,
              sortOrder: item.sortOrder,
              agreementDate: item.agreementDate ? new Date(item.agreementDate) : null,
              partnerListDueDate: item.partnerListDueDate ? new Date(item.partnerListDueDate) : null,
              partnerListSentDate: item.partnerListSentDate ? new Date(item.partnerListSentDate) : null,
              firstSaleDate: item.firstSaleDate ? new Date(item.firstSaleDate) : null,
              partnerListSize: item.partnerListSize,
              totalSalesFromList: item.totalSalesFromList
            }
          });
        } catch (error) {
          console.error(\`Error restoring pipeline item \${item.name}:\`, error);
        }
      }
      console.log('✅ Pipeline items restored');
    }
    
    // Restore finance entries
    if (backupData.data.financeEntries?.length > 0) {
      console.log(\`\\n💰 Restoring \${backupData.data.financeEntries.length} finance entries...\`);
      for (const entry of backupData.data.financeEntries) {
        try {
          await prisma.financeEntry.create({
            data: {
              id: entry.id,
              company: entry.company,
              bdrId: entry.bdrId,
              leadGen: entry.leadGen,
              status: entry.status,
              invoiceDate: entry.invoiceDate ? new Date(entry.invoiceDate) : null,
              dueDate: entry.dueDate ? new Date(entry.dueDate) : null,
              soldAmount: entry.soldAmount,
              gbpAmount: entry.gbpAmount,
              exchangeRate: entry.exchangeRate,
              exchangeRateDate: entry.exchangeRateDate ? new Date(entry.exchangeRateDate) : null,
              actualGbpReceived: entry.actualGbpReceived,
              notes: entry.notes,
              commissionPaid: entry.commissionPaid,
              danCommissionPaid: entry.danCommissionPaid,
              bdrCommissionAmount: entry.bdrCommissionAmount,
              danCommissionAmount: entry.danCommissionAmount,
              isMarkCawstonLead: entry.isMarkCawstonLead,
              month: entry.month,
              createdAt: new Date(entry.createdAt),
              updatedAt: new Date(entry.updatedAt)
            }
          });
        } catch (error) {
          console.error(\`Error restoring finance entry \${entry.company}:\`, error);
        }
      }
      console.log('✅ Finance entries restored');
    }
    
    // Restore activity logs
    if (backupData.data.activityLogs?.length > 0) {
      console.log(\`\\n📊 Restoring \${backupData.data.activityLogs.length} activity logs...\`);
      for (const log of backupData.data.activityLogs) {
        try {
          await prisma.activityLog.create({
            data: {
              id: log.id,
              timestamp: new Date(log.timestamp),
              bdrId: log.bdrId,
              activityType: log.activityType,
              description: log.description,
              scheduledDate: log.scheduledDate ? new Date(log.scheduledDate) : null,
              completedDate: log.completedDate ? new Date(log.completedDate) : null,
              notes: log.notes,
              leadId: log.leadId,
              pipelineItemId: log.pipelineItemId,
              previousStatus: log.previousStatus,
              newStatus: log.newStatus,
              previousCategory: log.previousCategory,
              newCategory: log.newCategory,
              editorialItemId: log.editorialItemId
            }
          });
        } catch (error) {
          console.error(\`Error restoring activity log \${log.id}:\`, error);
        }
      }
      console.log('✅ Activity logs restored');
    }
    
    // Restore editorial items
    if (backupData.data.editorialItems?.length > 0) {
      console.log(\`\\n✍️ Restoring \${backupData.data.editorialItems.length} editorial items...\`);
      for (const item of backupData.data.editorialItems) {
        try {
          await prisma.editorialBoardItem.create({
            data: {
              id: item.id,
              name: item.name,
              title: item.title,
              company: item.company,
              email: item.email,
              phone: item.phone,
              addedDate: new Date(item.addedDate),
              lastUpdated: new Date(item.lastUpdated),
              bdrId: item.bdrId,
              status: item.status,
              notes: item.notes,
              link: item.link,
              interviewDate: item.interviewDate ? new Date(item.interviewDate) : null,
              qaSubmissionDate: item.qaSubmissionDate ? new Date(item.qaSubmissionDate) : null,
              qaApprovedDate: item.qaApprovedDate ? new Date(item.qaApprovedDate) : null,
              publicationDate: item.publicationDate ? new Date(item.publicationDate) : null,
              publicationLink: item.publicationLink,
              leadId: item.leadId,
              pipelineItemId: item.pipelineItemId
            }
          });
        } catch (error) {
          console.error(\`Error restoring editorial item \${item.name}:\`, error);
        }
      }
      console.log('✅ Editorial items restored');
    }
    
    // Restore company registries
    if (backupData.data.companyRegistries?.length > 0) {
      console.log(\`\\n🏢 Restoring \${backupData.data.companyRegistries.length} company registries...\`);
      for (const company of backupData.data.companyRegistries) {
        try {
          await prisma.companyRegistry.create({
            data: {
              id: company.id,
              companyName: company.companyName,
              normalizedName: company.normalizedName,
              domain: company.domain,
              aliases: company.aliases,
              primaryEmail: company.primaryEmail,
              primaryPhone: company.primaryPhone,
              website: company.website,
              linkedinUrl: company.linkedinUrl,
              firstSeenAt: new Date(company.firstSeenAt),
              lastContactedAt: company.lastContactedAt ? new Date(company.lastContactedAt) : null,
              totalContacts: company.totalContacts,
              activeDeals: company.activeDeals,
              primaryTerritoryId: company.primaryTerritoryId
            }
          });
        } catch (error) {
          console.error(\`Error restoring company registry \${company.companyName}:\`, error);
        }
      }
      console.log('✅ Company registries restored');
    }
    
    // Restore contact registries
    if (backupData.data.contactRegistries?.length > 0) {
      console.log(\`\\n👤 Restoring \${backupData.data.contactRegistries.length} contact registries...\`);
      for (const contact of backupData.data.contactRegistries) {
        try {
          await prisma.contactRegistry.create({
            data: {
              id: contact.id,
              fullName: contact.fullName,
              normalizedName: contact.normalizedName,
              firstName: contact.firstName,
              lastName: contact.lastName,
              email: contact.email,
              normalizedEmail: contact.normalizedEmail,
              phone: contact.phone,
              normalizedPhone: contact.normalizedPhone,
              title: contact.title,
              linkedinUrl: contact.linkedinUrl,
              companyId: contact.companyId,
              firstSeenAt: new Date(contact.firstSeenAt),
              lastContactedAt: contact.lastContactedAt ? new Date(contact.lastContactedAt) : null,
              contactCount: contact.contactCount,
              primaryTerritoryId: contact.primaryTerritoryId
            }
          });
        } catch (error) {
          console.error(\`Error restoring contact registry \${contact.fullName}:\`, error);
        }
      }
      console.log('✅ Contact registries restored');
    }
    
    // Restore duplicate warnings
    if (backupData.data.duplicateWarnings?.length > 0) {
      console.log(\`\\n⚠️ Restoring \${backupData.data.duplicateWarnings.length} duplicate warnings...\`);
      for (const warning of backupData.data.duplicateWarnings) {
        try {
          await prisma.duplicateWarning.create({
            data: {
              id: warning.id,
              triggeredByUserId: warning.triggeredByUserId,
              triggerAction: warning.triggerAction,
              warningType: warning.warningType,
              severity: warning.severity,
              triggerData: warning.triggerData,
              userDecision: warning.userDecision,
              decisionMade: warning.decisionMade,
              decisionAt: warning.decisionAt ? new Date(warning.decisionAt) : null,
              proceedReason: warning.proceedReason,
              createdAt: new Date(warning.createdAt),
              updatedAt: new Date(warning.updatedAt)
            }
          });
        } catch (error) {
          console.error(\`Error restoring duplicate warning \${warning.id}:\`, error);
        }
      }
      console.log('✅ Duplicate warnings restored');
    }
    
    // Restore duplicate matches
    if (backupData.data.duplicateMatches?.length > 0) {
      console.log(\`\\n🔍 Restoring \${backupData.data.duplicateMatches.length} duplicate matches...\`);
      for (const match of backupData.data.duplicateMatches) {
        try {
          await prisma.duplicateMatch.create({
            data: {
              id: match.id,
              warningId: match.warningId,
              matchType: match.matchType,
              confidence: match.confidence,
              matchDetails: match.matchDetails,
              existingLeadId: match.existingLeadId,
              existingPipelineId: match.existingPipelineId,
              existingCompany: match.existingCompany,
              existingContactInfo: match.existingContactInfo,
              ownedByUserId: match.ownedByUserId,
              lastContactDate: match.lastContactDate ? new Date(match.lastContactDate) : null,
              recordStatus: match.recordStatus,
              createdAt: new Date(match.createdAt)
            }
          });
        } catch (error) {
          console.error(\`Error restoring duplicate match \${match.id}:\`, error);
        }
      }
      console.log('✅ Duplicate matches restored');
    }
    
    // Restore duplicate audit logs
    if (backupData.data.duplicateAuditLogs?.length > 0) {
      console.log(\`\\n📋 Restoring \${backupData.data.duplicateAuditLogs.length} duplicate audit logs...\`);
      for (const audit of backupData.data.duplicateAuditLogs) {
        try {
          await prisma.duplicateAuditLog.create({
            data: {
              id: audit.id,
              userId: audit.userId,
              action: audit.action,
              warningId: audit.warningId,
              entityType: audit.entityType,
              entityId: audit.entityId,
              decisionReason: audit.decisionReason,
              systemSuggestion: audit.systemSuggestion,
              actualOutcome: audit.actualOutcome,
              ipAddress: audit.ipAddress,
              userAgent: audit.userAgent,
              timestamp: new Date(audit.timestamp)
            }
          });
        } catch (error) {
          console.error(\`Error restoring duplicate audit log \${audit.id}:\`, error);
        }
      }
      console.log('✅ Duplicate audit logs restored');
    }
    
    // Restore conversations
    if (backupData.data.conversations?.length > 0) {
      console.log(\`\\n💬 Restoring \${backupData.data.conversations.length} conversations...\`);
      for (const conv of backupData.data.conversations) {
        try {
          await prisma.conversation.create({
            data: {
              id: conv.id,
              name: conv.name,
              isGroup: conv.isGroup,
              isLocked: conv.isLocked,
              createdAt: new Date(conv.createdAt),
              updatedAt: new Date(conv.updatedAt),
              createdById: conv.createdById,
              lastMessageAt: conv.lastMessageAt ? new Date(conv.lastMessageAt) : null
            }
          });
        } catch (error) {
          console.error(\`Error restoring conversation \${conv.id}:\`, error);
        }
      }
      console.log('✅ Conversations restored');
    }
    
    // Restore conversation members
    if (backupData.data.conversationMembers?.length > 0) {
      console.log(\`\\n👥 Restoring \${backupData.data.conversationMembers.length} conversation members...\`);
      for (const member of backupData.data.conversationMembers) {
        try {
          await prisma.conversationMember.create({
            data: {
              id: member.id,
              conversationId: member.conversationId,
              userId: member.userId,
              role: member.role,
              joinedAt: new Date(member.joinedAt)
            }
          });
        } catch (error) {
          console.error(\`Error restoring conversation member \${member.id}:\`, error);
        }
      }
      console.log('✅ Conversation members restored');
    }
    
    // Restore messages
    if (backupData.data.messages?.length > 0) {
      console.log(\`\\n💭 Restoring \${backupData.data.messages.length} messages...\`);
      for (const msg of backupData.data.messages) {
        try {
          await prisma.message.create({
            data: {
              id: msg.id,
              conversationId: msg.conversationId,
              senderId: msg.senderId,
              content: msg.content,
              parentId: msg.parentId,
              isEdited: msg.isEdited,
              isDeleted: msg.isDeleted,
              isPinned: msg.isPinned,
              createdAt: new Date(msg.createdAt),
              updatedAt: new Date(msg.updatedAt)
            }
          });
        } catch (error) {
          console.error(\`Error restoring message \${msg.id}:\`, error);
        }
      }
      console.log('✅ Messages restored');
    }
    
    // Restore message attachments
    if (backupData.data.messageAttachments?.length > 0) {
      console.log(\`\\n📎 Restoring \${backupData.data.messageAttachments.length} message attachments...\`);
      for (const attachment of backupData.data.messageAttachments) {
        try {
          await prisma.messageAttachment.create({
            data: {
              id: attachment.id,
              messageId: attachment.messageId,
              url: attachment.url,
              fileName: attachment.fileName,
              mimeType: attachment.mimeType,
              size: attachment.size,
              width: attachment.width,
              height: attachment.height
            }
          });
        } catch (error) {
          console.error(\`Error restoring message attachment \${attachment.id}:\`, error);
        }
      }
      console.log('✅ Message attachments restored');
    }
    
    // Restore message reactions
    if (backupData.data.messageReactions?.length > 0) {
      console.log(\`\\n😀 Restoring \${backupData.data.messageReactions.length} message reactions...\`);
      for (const reaction of backupData.data.messageReactions) {
        try {
          await prisma.messageReaction.create({
            data: {
              id: reaction.id,
              messageId: reaction.messageId,
              userId: reaction.userId,
              emoji: reaction.emoji,
              createdAt: new Date(reaction.createdAt)
            }
          });
        } catch (error) {
          console.error(\`Error restoring message reaction \${reaction.id}:\`, error);
        }
      }
      console.log('✅ Message reactions restored');
    }
    
    // Restore message reads
    if (backupData.data.messageReads?.length > 0) {
      console.log(\`\\n👁️ Restoring \${backupData.data.messageReads.length} message reads...\`);
      for (const read of backupData.data.messageReads) {
        try {
          await prisma.messageRead.create({
            data: {
              id: read.id,
              messageId: read.messageId,
              userId: read.userId,
              readAt: new Date(read.readAt)
            }
          });
        } catch (error) {
          console.error(\`Error restoring message read \${read.id}:\`, error);
        }
      }
      console.log('✅ Message reads restored');
    }
    
    // Restore data access policies
    if (backupData.data.dataAccessPolicies?.length > 0) {
      console.log(\`\\n🔒 Restoring \${backupData.data.dataAccessPolicies.length} data access policies...\`);
      for (const policy of backupData.data.dataAccessPolicies) {
        try {
          await prisma.dataAccessPolicy.create({
            data: {
              id: policy.id,
              userId: policy.userId,
              resource: policy.resource,
              conditions: policy.conditions,
              isActive: policy.isActive,
              createdAt: new Date(policy.createdAt),
              updatedAt: new Date(policy.updatedAt),
              createdBy: policy.createdBy
            }
          });
        } catch (error) {
          console.error(\`Error restoring data access policy \${policy.id}:\`, error);
        }
      }
      console.log('✅ Data access policies restored');
    }
    
    // Restore user sessions
    if (backupData.data.userSessions?.length > 0) {
      console.log(\`\\n🕐 Restoring \${backupData.data.userSessions.length} user sessions...\`);
      for (const session of backupData.data.userSessions) {
        try {
          await prisma.userSession.create({
            data: {
              id: session.id,
              userId: session.userId,
              sessionId: session.sessionId,
              ipAddress: session.ipAddress,
              userAgent: session.userAgent,
              loginTime: new Date(session.loginTime),
              lastActivity: new Date(session.lastActivity),
              expiresAt: new Date(session.expiresAt),
              isActive: session.isActive,
              logoutTime: session.logoutTime ? new Date(session.logoutTime) : null
            }
          });
        } catch (error) {
          console.error(\`Error restoring user session \${session.id}:\`, error);
        }
      }
      console.log('✅ User sessions restored');
    }
    
    // Restore audit logs
    if (backupData.data.auditLogs?.length > 0) {
      console.log(\`\\n📝 Restoring \${backupData.data.auditLogs.length} audit logs...\`);
      for (const audit of backupData.data.auditLogs) {
        try {
          await prisma.auditLog.create({
            data: {
              id: audit.id,
              userId: audit.userId,
              action: audit.action,
              resource: audit.resource,
              resourceId: audit.resourceId,
              ipAddress: audit.ipAddress,
              userAgent: audit.userAgent,
              details: audit.details,
              success: audit.success,
              errorMsg: audit.errorMsg,
              timestamp: new Date(audit.timestamp),
              sessionId: audit.sessionId
            }
          });
        } catch (error) {
          console.error(\`Error restoring audit log \${audit.id}:\`, error);
        }
      }
      console.log('✅ Audit logs restored');
    }
    
    console.log('\\n🎉 Test data restoration completed successfully!');
    console.log(\`📊 Total records restored: \${Object.values(backupData.summary).reduce((a, b) => a + b, 0)}\`);
    
  } catch (error) {
    console.error('❌ Error restoring test data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the restoration
restoreTestData()
  .catch(console.error);
`;
  
  fs.writeFileSync(restorationScriptPath, restorationScript);
  console.log(`📜 Restoration script created: ${restorationScriptPath}`);
}

if (require.main === module) {
  createComprehensiveBackup()
    .then(backupPath => {
      console.log('\n🎯 Backup completed! Next steps:');
      console.log('1. Review the backup files in the backup/ directory');
      console.log('2. Verify all data was captured correctly');
      console.log('3. Proceed with deleting test data for user onboarding');
      console.log('4. Keep backup files safe for potential restoration');
      
      // Create restoration script
      return createRestorationScript(backupPath);
    })
    .then(() => {
      console.log('\n✅ All backup files created successfully!');
      console.log('🚀 Ready to proceed with test data deletion.');
    })
    .catch(error => {
      console.error('❌ Backup failed:', error);
      process.exit(1);
    });
}
