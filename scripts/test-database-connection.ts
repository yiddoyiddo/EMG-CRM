import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testDatabaseConnection() {
  try {
    console.log('Testing database connection...');
    
    // Test basic connection
    await prisma.$connect();
    console.log('✅ Database connection successful');
    
    // Check leads count
    const leadsCount = await prisma.lead.count();
    console.log(`📊 Total leads in database: ${leadsCount}`);
    
    // Check pipeline items count
    const pipelineCount = await prisma.pipelineItem.count();
    console.log(`📊 Total pipeline items in database: ${pipelineCount}`);
    
    // Check finance entries count
    const financeCount = await prisma.financeEntry.count();
    console.log(`📊 Total finance entries in database: ${financeCount}`);
    
    // Get a sample of leads
    const sampleLeads = await prisma.lead.findMany({
      take: 5,
      orderBy: { addedDate: 'desc' }
    });
    
    console.log('\n📋 Sample leads:');
    sampleLeads.forEach((lead, index) => {
      console.log(`${index + 1}. ${lead.name} (${lead.company || 'No company'}) - ${lead.status}`);
    });
    
    // Check for admin users
    const adminUsers = await prisma.user.findMany({
      where: { role: 'ADMIN' }
    });
    
    console.log(`\n👥 Admin users found: ${adminUsers.length}`);
    adminUsers.forEach(user => {
      console.log(`- ${user.email} (${user.role})`);
    });
    
  } catch (error) {
    console.error('❌ Database connection failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testDatabaseConnection();
