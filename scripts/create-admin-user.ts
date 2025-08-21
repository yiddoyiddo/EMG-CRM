import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function createAdminUser() {
  try {
    console.log('Creating admin user...');

    // Check if admin user already exists
    const existingAdmin = await prisma.user.findFirst({
      where: {
        email: 'admin@busenq.com'
      }
    });

    if (existingAdmin) {
      console.log('Admin user already exists:', existingAdmin.email);
      return;
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash('admin123', 10);

    // Create admin user
    const adminUser = await prisma.user.create({
      data: {
        name: 'Admin User',
        email: 'admin@busenq.com',
        hashedPassword: hashedPassword,
        role: 'ADMIN'
      }
    });

    console.log('✅ Admin user created successfully:');
    console.log(`  - Name: ${adminUser.name}`);
    console.log(`  - Email: ${adminUser.email}`);
    console.log(`  - Role: ${adminUser.role}`);
    console.log(`  - ID: ${adminUser.id}`);
    console.log('\nYou can now log in with:');
    console.log('  - Username: admin@busenq.com');
    console.log('  - Password: admin123');

  } catch (error) {
    console.error('Error creating admin user:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createAdminUser();
