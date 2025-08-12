import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkDatabaseSchema() {
  try {
    console.log('Checking database schema...');
    
    // Get all tables using raw SQL
    const tables = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `;
    
    console.log('📋 Tables in database:');
    (tables as any[]).forEach((table: any) => {
      console.log(`- ${table.table_name}`);
    });
    
    // Check if User table exists
    const userTable = (tables as any[]).find((table: any) => table.table_name === 'User');
    
    if (userTable) {
      console.log('\n✅ User table exists');
      
      // Check user count
      const userCount = await prisma.user.count();
      console.log(`👥 Total users: ${userCount}`);
      
      // Get sample users
      const users = await prisma.user.findMany({
        take: 5
      });
      
      console.log('\n📋 Sample users:');
      users.forEach((user, index) => {
        console.log(`${index + 1}. ${user.email} (${user.role})`);
      });
    } else {
      console.log('\n❌ User table does not exist');
    }
    
  } catch (error) {
    console.error('❌ Error checking database schema:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkDatabaseSchema();
