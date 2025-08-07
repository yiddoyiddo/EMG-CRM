import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function updateAdminUser() {
  try {
    console.log('Updating admin user...');
    
    // Find the admin user
    const adminUser = await prisma.user.findFirst({
      where: { role: 'ADMIN' }
    });
    
    if (adminUser) {
      console.log('Found admin user:', adminUser.email);
      
      // Update the admin user with a proper name
      const updatedUser = await prisma.user.update({
        where: { id: adminUser.id },
        data: {
          name: 'Dan Reeves' // Set to match the BDR name in the data
        }
      });
      
      console.log('✅ Admin user updated successfully');
      console.log(`- Name: ${updatedUser.name}`);
      console.log(`- Email: ${updatedUser.email}`);
      console.log(`- Role: ${updatedUser.role}`);
      
    } else {
      console.log('❌ No admin user found');
    }
    
  } catch (error) {
    console.error('❌ Error updating admin user:', error);
  } finally {
    await prisma.$disconnect();
  }
}

updateAdminUser();
