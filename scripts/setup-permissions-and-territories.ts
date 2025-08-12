import { PrismaClient, Role, Resource, Action } from '@prisma/client';

const prisma = new PrismaClient();

async function setupPermissionsAndTerritories() {
  console.log('🚀 Setting up permissions and territories...\n');

  try {
    // Create default territories
    console.log('📍 Creating default territories...');
    const territories = await prisma.$transaction([
      prisma.territory.upsert({
        where: { name: 'North America' },
        update: {},
        create: {
          name: 'North America',
          description: 'North American sales territory',
          isActive: true
        }
      }),
      prisma.territory.upsert({
        where: { name: 'Europe' },
        update: {},
        create: {
          name: 'Europe',
          description: 'European sales territory',
          isActive: true
        }
      }),
      prisma.territory.upsert({
        where: { name: 'Asia Pacific' },
        update: {},
        create: {
          name: 'Asia Pacific',
          description: 'Asia Pacific sales territory',
          isActive: true
        }
      }),
      prisma.territory.upsert({
        where: { name: 'Global' },
        update: {},
        create: {
          name: 'Global',
          description: 'Global territory for directors and admins',
          isActive: true
        }
      })
    ]);

    console.log(`✅ Created/updated ${territories.length} territories`);

    // Create all possible permissions
    console.log('\n🔐 Creating permissions...');
    const permissions = [];
    
    // Generate all resource-action combinations
    const resources = Object.values(Resource);
    const actions = Object.values(Action);
    
    for (const resource of resources) {
      for (const action of actions) {
        // Skip invalid combinations
        const manageResources = [Resource.USERS, Resource.SETTINGS];
        const exportableResources = [Resource.LEADS, Resource.PIPELINE, Resource.FINANCE, Resource.REPORTS, Resource.ACTIVITY_LOGS];
        const viewableResources = [Resource.LEADS, Resource.PIPELINE, Resource.FINANCE, Resource.USERS, Resource.REPORTS, Resource.ACTIVITY_LOGS];
        
        if (
          (action === Action.MANAGE && !manageResources.includes(resource)) ||
          (action === Action.EXPORT && !exportableResources.includes(resource)) ||
          ([Action.VIEW_ALL, Action.VIEW_TEAM].includes(action) && !viewableResources.includes(resource))
        ) {
          continue;
        }

        permissions.push({
          name: `${resource.toLowerCase()}.${action.toLowerCase()}`,
          resource,
          action,
          description: `${action.toLowerCase()} access to ${resource.toLowerCase()}`
        });
      }
    }

    // Insert permissions
    for (const permission of permissions) {
      await prisma.permission.upsert({
        where: { 
          resource_action: {
            resource: permission.resource,
            action: permission.action
          }
        },
        update: {
          description: permission.description
        },
        create: permission
      });
    }

    console.log(`✅ Created/updated ${permissions.length} permissions`);

    // Set up role-based permissions
    console.log('\n👥 Setting up role-based permissions...');
    
    // Define role permissions
    const rolePermissions = [
      // ADMIN - Full access
      { role: Role.ADMIN, permissions: permissions.map(p => ({ resource: p.resource, action: p.action })) },
      
      // DIRECTOR - Everything except user management
      { 
        role: Role.DIRECTOR, 
        permissions: permissions
          .filter(p => p.resource !== Resource.USERS || [Action.READ, Action.VIEW_ALL].includes(p.action))
          .filter(p => p.resource !== Resource.SETTINGS || [Action.READ].includes(p.action))
          .map(p => ({ resource: p.resource, action: p.action }))
      },
      
      // MANAGER - Team management
      { 
        role: Role.MANAGER, 
        permissions: permissions
          .filter(p => 
            (p.resource === Resource.LEADS && [Action.CREATE, Action.READ, Action.UPDATE, Action.DELETE, Action.VIEW_TEAM, Action.EXPORT].includes(p.action)) ||
            (p.resource === Resource.PIPELINE && [Action.CREATE, Action.READ, Action.UPDATE, Action.DELETE, Action.VIEW_TEAM, Action.EXPORT].includes(p.action)) ||
            (p.resource === Resource.FINANCE && [Action.READ, Action.VIEW_TEAM].includes(p.action)) ||
            (p.resource === Resource.USERS && [Action.READ, Action.VIEW_TEAM].includes(p.action)) ||
            (p.resource === Resource.REPORTS && [Action.READ, Action.VIEW_TEAM].includes(p.action)) ||
            (p.resource === Resource.ACTIVITY_LOGS && [Action.READ, Action.VIEW_TEAM].includes(p.action))
          )
          .map(p => ({ resource: p.resource, action: p.action }))
      },
      
      // TEAM_LEAD - Limited team visibility
      { 
        role: Role.TEAM_LEAD, 
        permissions: permissions
          .filter(p => 
            (p.resource === Resource.LEADS && [Action.CREATE, Action.READ, Action.UPDATE, Action.VIEW_TEAM].includes(p.action)) ||
            (p.resource === Resource.PIPELINE && [Action.CREATE, Action.READ, Action.UPDATE, Action.VIEW_TEAM].includes(p.action)) ||
            (p.resource === Resource.FINANCE && [Action.READ].includes(p.action)) ||
            (p.resource === Resource.USERS && [Action.READ].includes(p.action)) ||
            (p.resource === Resource.REPORTS && [Action.READ, Action.VIEW_TEAM].includes(p.action)) ||
            (p.resource === Resource.ACTIVITY_LOGS && [Action.READ, Action.VIEW_TEAM].includes(p.action))
          )
          .map(p => ({ resource: p.resource, action: p.action }))
      },
      
      // BDR - Own data only
      { 
        role: Role.BDR, 
        permissions: permissions
          .filter(p => 
            (p.resource === Resource.LEADS && [Action.CREATE, Action.READ, Action.UPDATE, Action.DELETE].includes(p.action)) ||
            (p.resource === Resource.PIPELINE && [Action.CREATE, Action.READ, Action.UPDATE, Action.DELETE].includes(p.action)) ||
            (p.resource === Resource.FINANCE && [Action.READ].includes(p.action)) ||
            (p.resource === Resource.ACTIVITY_LOGS && [Action.CREATE, Action.READ].includes(p.action))
          )
          .map(p => ({ resource: p.resource, action: p.action }))
      },
    ];

    // Insert role permissions
    for (const rolePermission of rolePermissions) {
      for (const perm of rolePermission.permissions) {
        const permission = await prisma.permission.findUnique({
          where: {
            resource_action: {
              resource: perm.resource,
              action: perm.action
            }
          }
        });

        if (permission) {
          await prisma.rolePermission.upsert({
            where: {
              role_permissionId: {
                role: rolePermission.role,
                permissionId: permission.id
              }
            },
            update: {},
            create: {
              role: rolePermission.role,
              permissionId: permission.id
            }
          });
        }
      }
    }

    console.log(`✅ Set up role permissions for ${rolePermissions.length} roles`);

    // Assign users to territories and update roles
    console.log('\n🏠 Assigning users to territories...');
    
    const users = await prisma.user.findMany();
    const globalTerritory = territories.find(t => t.name === 'Global');
    const naTerritory = territories.find(t => t.name === 'North America');
    
    // Make first admin manage global territory
    const firstAdmin = users.find(u => u.role === Role.ADMIN);
    if (firstAdmin && globalTerritory) {
      await prisma.user.update({
        where: { id: firstAdmin.id },
        data: { 
          territoryId: globalTerritory.id,
        }
      });

      // Make this admin manage the global territory
      await prisma.territory.update({
        where: { id: globalTerritory.id },
        data: { managerId: firstAdmin.id }
      });
      
      console.log(`✅ Assigned ${firstAdmin.email} as Global territory manager`);
    }

    // Assign other users to North America by default
    const nonAdminUsers = users.filter(u => u.role !== Role.ADMIN && !u.territoryId);
    if (naTerritory && nonAdminUsers.length > 0) {
      for (const user of nonAdminUsers) {
        await prisma.user.update({
          where: { id: user.id },
          data: { territoryId: naTerritory.id }
        });
      }
      console.log(`✅ Assigned ${nonAdminUsers.length} users to North America territory`);
    }

    // Create a sample team lead
    const sampleBdr = users.find(u => u.role === Role.BDR);
    if (sampleBdr && naTerritory) {
      await prisma.user.update({
        where: { id: sampleBdr.id },
        data: { role: Role.TEAM_LEAD }
      });
      console.log(`✅ Promoted ${sampleBdr.email} to TEAM_LEAD role`);
    }

    console.log('\n🎉 Setup complete!');
    console.log('\n📊 Summary:');
    
    const territoryCount = await prisma.territory.count();
    const permissionCount = await prisma.permission.count();
    const rolePermissionCount = await prisma.rolePermission.count();
    const userCount = await prisma.user.count();
    
    console.log(`- Territories: ${territoryCount}`);
    console.log(`- Permissions: ${permissionCount}`);
    console.log(`- Role permissions: ${rolePermissionCount}`);
    console.log(`- Users: ${userCount}`);
    
    // Show role distribution
    const roleCounts = await prisma.user.groupBy({
      by: ['role'],
      _count: { role: true }
    });
    
    console.log('\n👥 Role distribution:');
    roleCounts.forEach(rc => {
      console.log(`- ${rc.role}: ${rc._count.role}`);
    });

    console.log('\n✨ Your granular permission system is ready!');

  } catch (error) {
    console.error('❌ Error setting up permissions and territories:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

setupPermissionsAndTerritories();