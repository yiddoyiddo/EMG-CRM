import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting deployment setup...');
  
  try {
    // Generate Prisma client
    console.log('Generating Prisma client...');
    const { execSync } = require('child_process');
    execSync('npx prisma generate', { stdio: 'inherit' });
    
    // Run database migrations
    console.log('Running database migrations...');
    execSync('npx prisma migrate deploy', { stdio: 'inherit' });
    
    // Seed KPI targets if they don't exist
    console.log('Checking for KPI targets...');
    const kpiTargetsCount = await prisma.kpiTarget.count();
    
    if (kpiTargetsCount === 0) {
      console.log('Seeding KPI targets...');
      execSync('npm run seed', { stdio: 'inherit' });
    } else {
      console.log('KPI targets already exist, skipping seed...');
    }
    
    console.log('Deployment setup completed successfully!');
  } catch (error) {
    console.error('Error during deployment setup:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
