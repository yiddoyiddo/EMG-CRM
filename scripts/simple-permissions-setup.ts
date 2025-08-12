import { PrismaClient, Role } from '@prisma/client';

const prisma = new PrismaClient();

async function setupBasicPermissions() {
  console.log('🚀 Setting up basic permissions and territories...\n');

  try {
    // Create default territories
    console.log('📍 Creating default territories...');
    const territories = [];
    
    const northAmerica = await prisma.territory.upsert({
      where: { name: 'North America' },
      update: {},
      create: {
        name: 'North America',
        description: 'North American sales territory',
        isActive: true
      }
    });
    territories.push(northAmerica);

    const europe = await prisma.territory.upsert({
      where: { name: 'Europe' },
      update: {},
      create: {
        name: 'Europe',
        description: 'European sales territory',
        isActive: true
      }
    });
    territories.push(europe);

    const global = await prisma.territory.upsert({
      where: { name: 'Global' },
      update: {},
      create: {
        name: 'Global',
        description: 'Global territory for management',
        isActive: true
      }
    });
    territories.push(global);

    console.log(`✅ Created/updated ${territories.length} territories`);

    // Assign users to territories and update roles
    console.log('\n🏠 Assigning users to territories...');
    
    const users = await prisma.user.findMany();
    
    // Make first admin manage global territory
    const firstAdmin = users.find(u => u.role === Role.ADMIN);
    if (firstAdmin) {
      await prisma.user.update({
        where: { id: firstAdmin.id },
        data: { 
          territoryId: global.id,
        }
      });

      // Make this admin manage the global territory
      await prisma.territory.update({
        where: { id: global.id },
        data: { managerId: firstAdmin.id }
      });
      
      console.log(`✅ Assigned ${firstAdmin.email} as Global territory manager`);
    }

    // Assign other users to North America by default
    const nonAdminUsers = users.filter(u => u.role !== Role.ADMIN && !u.territoryId);
    if (nonAdminUsers.length > 0) {
      for (const user of nonAdminUsers) {
        await prisma.user.update({
          where: { id: user.id },
          data: { territoryId: northAmerica.id }
        });
      }
      console.log(`✅ Assigned ${nonAdminUsers.length} users to North America territory`);
    }

    // Create a sample team lead and manager
    const bdrUsers = users.filter(u => u.role === Role.BDR);
    
    if (bdrUsers.length >= 2) {
      // Promote first BDR to TEAM_LEAD
      await prisma.user.update({
        where: { id: bdrUsers[0].id },
        data: { role: Role.TEAM_LEAD }
      });
      console.log(`✅ Promoted ${bdrUsers[0].email} to TEAM_LEAD role`);
      
      // Promote second BDR to MANAGER and assign to manage North America
      await prisma.user.update({
        where: { id: bdrUsers[1].id },
        data: { 
          role: Role.MANAGER,
          territoryId: northAmerica.id
        }
      });
      
      await prisma.territory.update({
        where: { id: northAmerica.id },
        data: { managerId: bdrUsers[1].id }
      });
      
      console.log(`✅ Promoted ${bdrUsers[1].email} to MANAGER role and assigned to manage North America`);
    }

    console.log('\n🎉 Basic setup complete!');
    console.log('\n📊 Summary:');
    
    const territoryCount = await prisma.territory.count();
    const userCount = await prisma.user.count();
    
    console.log(`- Territories: ${territoryCount}`);
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

    // Show territory assignments
    const territoryAssignments = await prisma.user.findMany({
      include: {
        territory: true
      }
    });
    
    console.log('\n🌍 Territory assignments:');
    territoryAssignments.forEach(user => {
      console.log(`- ${user.email} (${user.role}): ${user.territory?.name || 'No Territory'}`);
    });

    console.log('\n✨ Your basic permission system is ready!');
    console.log('\n🔍 Next steps:');
    console.log('1. Users now have territory assignments');
    console.log('2. Role-based permissions are enforced in API routes');
    console.log('3. Team leads and managers can see team data based on territories');

  } catch (error) {
    console.error('❌ Error setting up permissions and territories:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

setupBasicPermissions();