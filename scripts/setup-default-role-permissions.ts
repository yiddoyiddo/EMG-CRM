import { PrismaClient, Role } from '@prisma/client';

const prisma = new PrismaClient();

async function setupDefaultRolePermissions() {
  console.log('Setting up default role permissions...');

  // Define default permissions for each role based on the DEFAULT_ROLE_PERMISSIONS in permissions.ts
  const rolePermissionsMap = {
    'BDR': [
      'LEADS_CREATE', 'LEADS_READ', 'LEADS_UPDATE', 'LEADS_DELETE',
      'PIPELINE_CREATE', 'PIPELINE_READ', 'PIPELINE_UPDATE', 'PIPELINE_DELETE',
      'FINANCE_READ',
      'ACTIVITY_LOGS_CREATE', 'ACTIVITY_LOGS_READ',
      'DUPLICATES_READ',
      'MESSAGING_READ', 'MESSAGING_CREATE',
      'TEMPLATES_READ', 'TEMPLATES_CREATE', 'TEMPLATES_UPDATE'
    ],
    'TEAM_LEAD': [
      'LEADS_CREATE', 'LEADS_READ', 'LEADS_UPDATE', 'LEADS_VIEW_TEAM',
      'PIPELINE_CREATE', 'PIPELINE_READ', 'PIPELINE_UPDATE', 'PIPELINE_VIEW_TEAM',
      'FINANCE_READ',
      'USERS_READ',
      'REPORTS_READ', 'REPORTS_VIEW_TEAM',
      'ACTIVITY_LOGS_READ', 'ACTIVITY_LOGS_VIEW_TEAM',
      'DUPLICATES_READ',
      'MESSAGING_READ', 'MESSAGING_CREATE',
      'TEMPLATES_READ', 'TEMPLATES_CREATE', 'TEMPLATES_UPDATE'
    ],
    'MANAGER': [
      'LEADS_CREATE', 'LEADS_READ', 'LEADS_UPDATE', 'LEADS_DELETE', 'LEADS_VIEW_TEAM', 'LEADS_EXPORT',
      'PIPELINE_CREATE', 'PIPELINE_READ', 'PIPELINE_UPDATE', 'PIPELINE_DELETE', 'PIPELINE_VIEW_TEAM', 'PIPELINE_EXPORT',
      'FINANCE_READ', 'FINANCE_VIEW_TEAM',
      'USERS_READ', 'USERS_VIEW_TEAM',
      'REPORTS_READ', 'REPORTS_VIEW_TEAM',
      'ACTIVITY_LOGS_READ', 'ACTIVITY_LOGS_VIEW_TEAM',
      'DUPLICATES_READ', 'DUPLICATES_VIEW_TEAM',
      'MESSAGING_READ', 'MESSAGING_CREATE',
      'TEMPLATES_READ', 'TEMPLATES_CREATE', 'TEMPLATES_UPDATE'
    ],
    'DIRECTOR': [
      'LEADS_CREATE', 'LEADS_READ', 'LEADS_UPDATE', 'LEADS_DELETE', 'LEADS_VIEW_ALL', 'LEADS_EXPORT',
      'PIPELINE_CREATE', 'PIPELINE_READ', 'PIPELINE_UPDATE', 'PIPELINE_DELETE', 'PIPELINE_VIEW_ALL', 'PIPELINE_EXPORT',
      'FINANCE_READ', 'FINANCE_VIEW_ALL', 'FINANCE_EXPORT',
      'USERS_READ', 'USERS_VIEW_ALL',
      'REPORTS_READ', 'REPORTS_VIEW_ALL', 'REPORTS_EXPORT',
      'ACTIVITY_LOGS_READ', 'ACTIVITY_LOGS_VIEW_ALL',
      'DUPLICATES_READ', 'DUPLICATES_VIEW_ALL',
      'MESSAGING_READ', 'MESSAGING_CREATE',
      'TEMPLATES_READ'
    ]
  };

  for (const [roleName, permissionNames] of Object.entries(rolePermissionsMap)) {
    const role = roleName as Role;
    
    // Remove existing role permissions
    await prisma.rolePermission.deleteMany({
      where: { role }
    });

    // Add new permissions
    for (const permissionName of permissionNames) {
      const permission = await prisma.permission.findFirst({
        where: { name: permissionName }
      });

      if (permission) {
        await prisma.rolePermission.create({
          data: {
            role,
            permissionId: permission.id
          }
        });
      } else {
        console.warn(`⚠️ Permission '${permissionName}' not found for role '${role}'`);
      }
    }

    console.log(`✅ Set up ${permissionNames.length} permissions for ${role}`);
  }

  console.log('✅ Default role permissions setup completed');
}

setupDefaultRolePermissions()
  .catch((e) => {
    console.error('❌ Error setting up role permissions:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });