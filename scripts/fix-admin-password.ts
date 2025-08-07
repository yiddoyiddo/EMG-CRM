import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function fixAdminPassword() {
  try {
    console.log('🔧 Fixing admin password...');

    // Hash the password
    const hashedPassword = await bcrypt.hash('admin123', 10);

    // Update the admin user's password
    const updatedUser = await prisma.user.update({
      where: {
        email: 'admin@emg.com'
      },
      data: {
        hashedPassword: hashedPassword
      }
    });

    console.log('✅ Admin password updated successfully!');
    console.log(`   User: ${updatedUser.name} (${updatedUser.email})`);
    console.log(`   Role: ${updatedUser.role}`);

    // Test the password
    const isPasswordValid = await bcrypt.compare('admin123', updatedUser.hashedPassword);
    
    if (isPasswordValid) {
      console.log('✅ Password verification successful');
    } else {
      console.log('❌ Password verification failed');
    }

    console.log('\n🔑 Login credentials:');
    console.log('   Email: admin@emg.com');
    console.log('   Password: admin123');

  } catch (error) {
    console.error('❌ Error fixing admin password:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixAdminPassword();
