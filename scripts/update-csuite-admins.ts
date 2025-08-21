import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../src/lib/auth-utils';

const prisma = new PrismaClient();

const cSuiteUsers = [
  'Mark Cawston',
  'Jamie Waite', 
  'Roisin Brennand',
  'Dan Reeves'
];

async function updateCSuiteToAdmin() {
  console.log('🚀 Starting C Suite admin role update...\n');

  try {
    // Find users by name
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
        role: true
      }
    });

    console.log(`Found ${users.length} matching users:`);
    users.forEach(user => {
      console.log(`- ${user.name} (${user.email}) - Current role: ${user.role}`);
    });

    if (users.length === 0) {
      console.log('\n❌ No matching users found. Please check user names in the database.');
      return;
    }

    console.log('\n📝 Updating users to ADMIN role...\n');

    // Update each user to ADMIN role
    for (const user of users) {
      if (user.role === 'ADMIN') {
        console.log(`✅ ${user.name} is already an ADMIN`);
        continue;
      }

      await prisma.user.update({
        where: { id: user.id },
        data: { 
          role: 'ADMIN',
          isActive: true  // Ensure they're active
        }
      });

      console.log(`✅ Updated ${user.name} to ADMIN role`);
    }

    console.log('\n🎉 All C Suite users have been updated to ADMIN role with full permissions!');
    
    // Show final status
    const updatedUsers = await prisma.user.findMany({
      where: {
        name: {
          in: cSuiteUsers
        }
      },
      select: {
        name: true,
        email: true,
        role: true,
        isActive: true
      }
    });

    console.log('\n📊 Final Status:');
    updatedUsers.forEach(user => {
      console.log(`- ${user.name}: ${user.role} (${user.isActive ? 'Active' : 'Inactive'})`);
    });

  } catch (error) {
    console.error('❌ Error updating users:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Also show all current users for verification
async function showAllUsers() {
  console.log('\n📋 All current users in the system:');
  const allUsers = await prisma.user.findMany({
    select: {
      name: true,
      email: true,
      role: true,
      isActive: true
    },
    orderBy: {
      name: 'asc'
    }
  });

  allUsers.forEach(user => {
    console.log(`- ${user.name || 'No name'} (${user.email}) - ${user.role} (${user.isActive ? 'Active' : 'Inactive'})`);
  });
}

async function main() {
  await showAllUsers();
  await updateCSuiteToAdmin();
}

main().catch(console.error);