import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const cSuiteUsers = [
  'Mark Cawston',
  'Jamie Waite', 
  'Roisin Brennand',
  'Dan Reeves'
];

async function verifyCSuiteAdmins() {
  console.log('🔍 Verifying C Suite admin roles and permissions...\n');

  try {
    // Find all C Suite users
    const users = await prisma.user.findMany({
      where: {
        name: {
          in: cSuiteUsers
        }
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
        lastLoginAt: true
      }
    });

    console.log('📊 C Suite Admin Status:');
    console.log('=' .repeat(60));
    
    let allAdmin = true;
    
    users.forEach(user => {
      const isAdmin = user.role === 'ADMIN';
      const status = isAdmin ? '✅' : '❌';
      const lastLogin = user.lastLoginAt 
        ? new Date(user.lastLoginAt).toLocaleDateString()
        : 'Never';
      
      console.log(`${status} ${user.name}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Role: ${user.role} ${isAdmin ? '(ADMIN ✓)' : '(NOT ADMIN ✗)'}`);
      console.log(`   Active: ${user.isActive ? 'Yes' : 'No'}`);
      console.log(`   Last Login: ${lastLogin}`);
      console.log('');
      
      if (!isAdmin) allAdmin = false;
    });

    // Check for missing users
    const foundNames = users.map(u => u.name);
    const missingUsers = cSuiteUsers.filter(name => !foundNames.includes(name));
    
    if (missingUsers.length > 0) {
      console.log('❌ Missing Users:');
      missingUsers.forEach(name => console.log(`   - ${name} (not found in database)`));
      console.log('');
    }

    // Summary
    console.log('📋 SUMMARY:');
    console.log('=' .repeat(30));
    console.log(`Total C Suite users found: ${users.length}/${cSuiteUsers.length}`);
    console.log(`Admin privileges: ${allAdmin && missingUsers.length === 0 ? '✅ All users have ADMIN role' : '❌ Some users need admin privileges'}`);
    console.log(`Full permissions: ${allAdmin && missingUsers.length === 0 ? '✅ All admins have full system access' : '❌ Review required'}`);

    if (allAdmin && missingUsers.length === 0) {
      console.log('\n🎉 SUCCESS: All C Suite staff have admin roles and full permissions!');
    } else {
      console.log('\n⚠️  ACTION REQUIRED: Some users need admin role assignment');
    }

  } catch (error) {
    console.error('❌ Error verifying users:', error);
  } finally {
    await prisma.$disconnect();
  }
}

verifyCSuiteAdmins().catch(console.error);