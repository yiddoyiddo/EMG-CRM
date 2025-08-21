import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../src/lib/auth-utils';

const prisma = new PrismaClient();

async function createRoisinAdmin() {
  console.log('🚀 Creating Roisin Brennand as ADMIN...\n');

  try {
    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: 'roisin.brennand@busenq.com' }
    });

    if (existingUser) {
      console.log('✅ User already exists. Updating to ADMIN role...');
      await prisma.user.update({
        where: { id: existingUser.id },
        data: { 
          name: 'Roisin Brennand',
          role: 'ADMIN',
          isActive: true
        }
      });
      console.log('✅ Updated Roisin Brennand to ADMIN role');
    } else {
      // Create new user with temporary password
      const temporaryPassword = 'Welcome123!'; // They should change this on first login
      const hashedPassword = await hashPassword(temporaryPassword);

      const newUser = await prisma.user.create({
        data: {
          name: 'Roisin Brennand',
          email: 'roisin.brennand@busenq.com',
          hashedPassword,
          role: 'ADMIN',
          isActive: true
        }
      });

      console.log('✅ Created new user: Roisin Brennand with ADMIN role');
      console.log(`📧 Email: ${newUser.email}`);
      console.log(`🔑 Temporary password: ${temporaryPassword}`);
      console.log('⚠️  Please inform her to change the password on first login');
    }

    // Verify final status
    const user = await prisma.user.findUnique({
      where: { email: 'roisin.brennand@busenq.com' },
      select: { name: true, email: true, role: true, isActive: true }
    });

    console.log('\n📊 Final Status:');
    console.log(`- ${user?.name}: ${user?.role} (${user?.isActive ? 'Active' : 'Inactive'})`);

  } catch (error) {
    console.error('❌ Error creating/updating user:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createRoisinAdmin().catch(console.error);