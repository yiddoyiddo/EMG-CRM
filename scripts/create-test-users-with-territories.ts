import { PrismaClient, Role } from '@prisma/client';
import { hashPassword } from '../src/lib/auth-utils';

const prisma = new PrismaClient();

async function createTestUsers() {
  console.log('👥 Creating test users with territories...\n');

  try {
    const globalTerritory = await prisma.territory.findFirst({
      where: { name: 'Global' }
    });

    const naTerritory = await prisma.territory.findFirst({
      where: { name: 'North America' }
    });

    const europeTerritory = await prisma.territory.findFirst({
      where: { name: 'Europe' }
    });

    if (!globalTerritory || !naTerritory || !europeTerritory) {
      console.error('❌ Territories not found. Run simple-permissions-setup.ts first.');
      return;
    }

    // Create admin user
    const hashedAdminPassword = await hashPassword('admin123');
    const admin = await prisma.user.upsert({
      where: { email: 'admin@busenq.com' },
      update: {},
      create: {
        email: 'admin@busenq.com',
        name: 'System Admin',
        hashedPassword: hashedAdminPassword,
        role: Role.ADMIN,
        territoryId: globalTerritory.id,
        isActive: true
      }
    });
    console.log(`✅ Created ADMIN: ${admin.email}`);

    // Create director
    const hashedDirectorPassword = await hashPassword('director123');
    const director = await prisma.user.upsert({
      where: { email: 'director@busenq.com' },
      update: {},
      create: {
        email: 'director@busenq.com',
        name: 'Sales Director',
        hashedPassword: hashedDirectorPassword,
        role: Role.DIRECTOR,
        territoryId: globalTerritory.id,
        isActive: true
      }
    });
    console.log(`✅ Created DIRECTOR: ${director.email}`);

    // Create NA manager
    const hashedManagerPassword = await hashPassword('manager123');
    const naManager = await prisma.user.upsert({
      where: { email: 'manager.na@busenq.com' },
      update: {},
      create: {
        email: 'manager.na@busenq.com',
        name: 'NA Sales Manager',
        hashedPassword: hashedManagerPassword,
        role: Role.MANAGER,
        territoryId: naTerritory.id,
        isActive: true
      }
    });
    console.log(`✅ Created MANAGER (NA): ${naManager.email}`);

    // Assign NA manager to manage NA territory
    await prisma.territory.update({
      where: { id: naTerritory.id },
      data: { managerId: naManager.id }
    });

    // Create team lead in NA
    const hashedTeamLeadPassword = await hashPassword('teamlead123');
    const teamLead = await prisma.user.upsert({
      where: { email: 'teamlead.na@busenq.com' },
      update: {},
      create: {
        email: 'teamlead.na@busenq.com',
        name: 'NA Team Lead',
        hashedPassword: hashedTeamLeadPassword,
        role: Role.TEAM_LEAD,
        territoryId: naTerritory.id,
        isActive: true
      }
    });
    console.log(`✅ Created TEAM_LEAD (NA): ${teamLead.email}`);

    // Create BDRs in different territories
    const bdrUsers = [
      { 
        email: 'bdr1.na@busenq.com', 
        name: 'John Smith', 
        territoryId: naTerritory.id 
      },
      { 
        email: 'bdr2.na@busenq.com', 
        name: 'Sarah Johnson', 
        territoryId: naTerritory.id 
      },
      { 
        email: 'bdr1.eu@busenq.com', 
        name: 'Pierre Dubois', 
        territoryId: europeTerritory.id 
      },
      { 
        email: 'bdr2.eu@busenq.com', 
        name: 'Anna Mueller', 
        territoryId: europeTerritory.id 
      }
    ];

    const hashedBdrPassword = await hashPassword('bdr123');
    
    for (const bdrData of bdrUsers) {
      const bdr = await prisma.user.upsert({
        where: { email: bdrData.email },
        update: {},
        create: {
          email: bdrData.email,
          name: bdrData.name,
          hashedPassword: hashedBdrPassword,
          role: Role.BDR,
          territoryId: bdrData.territoryId,
          isActive: true
        }
      });
      console.log(`✅ Created BDR: ${bdr.email} (${bdr.name})`);
    }

    // Assign global territory manager
    await prisma.territory.update({
      where: { id: globalTerritory.id },
      data: { managerId: admin.id }
    });

    console.log('\n🎉 Test users created successfully!');
    console.log('\n📊 Summary:');
    
    const userCount = await prisma.user.count();
    console.log(`- Total users: ${userCount}`);
    
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
      },
      orderBy: [
        { role: 'asc' },
        { name: 'asc' }
      ]
    });
    
    console.log('\n🌍 Territory assignments:');
    territoryAssignments.forEach(user => {
      console.log(`- ${user.name} (${user.email}) - ${user.role}: ${user.territory?.name || 'No Territory'}`);
    });

    console.log('\n🔑 Login credentials:');
    console.log('- Admin: admin@busenq.com / admin123');
    console.log('- Director: director@busenq.com / director123');
    console.log('- Manager: manager.na@busenq.com / manager123');
    console.log('- Team Lead: teamlead.na@busenq.com / teamlead123');
    console.log('- BDRs: [email] / bdr123');

    console.log('\n✨ Ready to test the granular permission system!');

  } catch (error) {
    console.error('❌ Error creating test users:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

createTestUsers();