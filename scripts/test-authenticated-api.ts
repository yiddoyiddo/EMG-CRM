import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function testAuthenticatedApi() {
  try {
    console.log('Testing authenticated API access...');
    
    // First, let's check if we can access the pipeline data directly from the database
    const pipelineItems = await prisma.pipelineItem.findMany({
      where: {
        parentId: null // Only top-level items
      },
      take: 10,
      orderBy: { lastUpdated: 'desc' },
      select: {
        id: true,
        name: true,
        bdr: true,
        category: true,
        status: true,
        company: true
      }
    });
    
    console.log('📋 Direct database query results:');
    console.log(`Found ${pipelineItems.length} pipeline items`);
    
    pipelineItems.forEach((item, index) => {
      console.log(`${index + 1}. ${item.name} (${item.company || 'No company'}) - BDR: ${item.bdr} - ${item.category}/${item.status}`);
    });
    
    // Check if the admin user exists and has the correct name
    const adminUser = await prisma.user.findFirst({
      where: { role: 'ADMIN' }
    });
    
    if (adminUser) {
      console.log('\n👤 Admin user details:');
      console.log(`- Name: ${adminUser.name}`);
      console.log(`- Email: ${adminUser.email}`);
      console.log(`- Role: ${adminUser.role}`);
      
      // Check if there are pipeline items for this admin user
      const adminPipelineItems = await prisma.pipelineItem.findMany({
        where: {
          bdr: adminUser.name
        },
        take: 5,
        select: {
          id: true,
          name: true,
          category: true,
          status: true
        }
      });
      
      console.log(`\n📋 Pipeline items for ${adminUser.name}: ${adminPipelineItems.length} found`);
      adminPipelineItems.forEach((item, index) => {
        console.log(`${index + 1}. ${item.name} - ${item.category}/${item.status}`);
      });
    }
    
    console.log('\n🎯 Next steps:');
    console.log('1. Make sure you are logged in as admin@busenq.com');
    console.log('2. Check the browser console for any JavaScript errors');
    console.log('3. Try refreshing the page');
    console.log('4. Check the Network tab in browser dev tools to see API calls');
    
  } catch (error) {
    console.error('❌ Error testing authenticated API:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testAuthenticatedApi();
