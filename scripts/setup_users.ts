import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// Define your desired user setup here. Passwords are set to a default/placeholder.
const USERS = [
  // Admins
  { email: 'admin@busenq.com', name: 'Admin Account', role: Role.ADMIN, password: 'admin123' },
  // Ensure 'Dan Reeves' is the name, not 'Admin User'
  { email: 'dan.reeves@busenq.com', name: 'Dan Reeves', role: Role.ADMIN, password: 'Password123!' },

  // BDRs
  { email: 'naeem.patel@busenq.com', name: 'Naeem Patel', role: Role.BDR, password: 'Password123!' },
  { email: 'jennifer.davies@busenq.com', name: 'Jennifer Davies', role: Role.BDR, password: 'Password123!' },
  { email: 'mark.cawston@busenq.com', name: 'Mark Cawston', role: Role.BDR, password: 'Password123!' },
  { email: 'rupert.kay@busenq.com', name: 'Rupert Kay', role: Role.BDR, password: 'Password123!' },
  { email: 'verity.kay@busenq.com', name: 'Verity Kay', role: Role.BDR, password: 'Password123!' },
  // Add others mentioned in the logs if they are still active (e.g., Thomas Hardy)
];

async function setupUsers() {
  console.log('Setting up users...');

  for (const user of USERS) {
    const hashedPassword = await bcrypt.hash(user.password, 12);

    await prisma.user.upsert({
      where: { email: user.email },
      update: {
        name: user.name,
        role: user.role,
        hashedPassword: hashedPassword,
      },
      create: {
        email: user.email,
        name: user.name,
        role: user.role,
        hashedPassword: hashedPassword,
      },
    });
    console.log(`Upserted user: ${user.email} (${user.name} - ${user.role})`);
  }
  console.log('User setup complete.');
}

setupUsers().catch((e) => { console.error(e); process.exit(1); }).finally(async () => { await prisma.$disconnect(); });
