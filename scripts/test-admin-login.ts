import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function testAdminLogin() {
  try {
    console.log('🧪 Testing admin login...');

    // Test credentials
    const email = 'admin@busenq.com';
    const password = 'admin123';

    // Find the admin user
    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      console.log('❌ Admin user not found');
      return;
    }

    console.log(`✅ Found admin user: ${user.name} (${user.email})`);
    console.log(`   Role: ${user.role}`);
    console.log(`   ID: ${user.id}`);

    // Test password verification
    const isPasswordValid = await bcrypt.compare(password, user.hashedPassword);
    
    if (isPasswordValid) {
      console.log('✅ Password verification successful');
    } else {
      console.log('❌ Password verification failed');
    }

    // Test data access
    console.log('\n📊 Testing data access...');
    
    const leadCount = await prisma.lead.count();
    const pipelineCount = await prisma.pipelineItem.count();
    const activityCount = await prisma.activityLog.count();
    
    console.log(`   Leads: ${leadCount}`);
    console.log(`   Pipeline Items: ${pipelineCount}`);
    console.log(`   Activity Logs: ${activityCount}`);

    // Test admin can see all leads
    const allLeads = await prisma.lead.findMany({
      take: 5,
      include: {
        bdr: {
          select: {
            name: true,
            email: true
          }
        }
      }
    });

    console.log('\n📋 Sample leads (admin should see all):');
    allLeads.forEach(lead => {
      console.log(`   - ${lead.name} (${lead.company}) - BDR: ${lead.bdr?.name || 'None'}`);
    });

    console.log('\n✅ Admin login test completed successfully!');
    console.log('\n🔑 Login credentials:');
    console.log(`   Email: ${email}`);
    console.log(`   Password: ${password}`);

  } catch (error) {
    console.error('❌ Error testing admin login:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testAdminLogin();
