import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function createUserTable() {
  try {
    console.log('Creating User table and admin user...');
    
    // Create User table
    await prisma.$executeRaw`
      CREATE TYPE "Role" AS ENUM ('ADMIN', 'BDR');
    `;
    
    await prisma.$executeRaw`
      CREATE TABLE "User" (
        "id" TEXT NOT NULL,
        "name" TEXT,
        "email" TEXT NOT NULL,
        "hashedPassword" TEXT NOT NULL,
        "role" "Role" NOT NULL DEFAULT 'BDR',
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,
        CONSTRAINT "User_pkey" PRIMARY KEY ("id")
      );
    `;
    
    await prisma.$executeRaw`
      CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
    `;
    
    console.log('✅ User table created successfully');
    
    // Create admin user
    const hashedPassword = await bcrypt.hash('admin123', 10);
    const adminId = crypto.randomUUID();
    
    await prisma.$executeRaw`
      INSERT INTO "User" ("id", "name", "email", "hashedPassword", "role", "createdAt", "updatedAt")
      VALUES (${adminId}, 'Admin User', 'admin@emg.com', ${hashedPassword}, 'ADMIN', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `;
    
    console.log('✅ Admin user created successfully');
    console.log('\nYou can now log in with:');
    console.log('  - Username: admin@emg.com');
    console.log('  - Password: admin123');
    
  } catch (error) {
    console.error('❌ Error creating User table:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createUserTable();
