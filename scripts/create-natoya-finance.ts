import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../src/lib/auth-utils';

const prisma = new PrismaClient();

async function createNatoyaFinanceUser() {
  console.log('🚀 Creating Natoya Rimmer with finance permissions...\n');

  try {
    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: 'natoya.rimmer@busenq.com' }
    });

    if (existingUser) {
      console.log('✅ User already exists. Updating role and permissions...');
      await prisma.user.update({
        where: { id: existingUser.id },
        data: { 
          name: 'Natoya Rimmer',
          role: 'DIRECTOR',
          isActive: true
        }
      });
      console.log('✅ Updated Natoya Rimmer to DIRECTOR role');
    } else {
      // Create new user with temporary password
      const temporaryPassword = 'Finance123!'; // She should change this on first login
      const hashedPassword = await hashPassword(temporaryPassword);

      const newUser = await prisma.user.create({
        data: {
          name: 'Natoya Rimmer',
          email: 'natoya.rimmer@busenq.com',
          hashedPassword,
          role: 'DIRECTOR',
          isActive: true
        }
      });

      console.log('✅ Created new user: Natoya Rimmer with DIRECTOR role');
      console.log(`📧 Email: ${newUser.email}`);
      console.log(`🔑 Temporary password: ${temporaryPassword}`);
      console.log('⚠️  Please inform her to change the password on first login');
    }

    // Get user ID for permission assignment
    const user = await prisma.user.findUnique({
      where: { email: 'natoya.rimmer@busenq.com' },
      select: { id: true, name: true, email: true, role: true, isActive: true }
    });

    if (user) {
      console.log('\n🔐 Adding additional finance permissions...');
      
      // Find available permissions for finance work
      const financePermissions = await prisma.permission.findMany({
        where: {
          OR: [
            { resource: 'FINANCE' },
            { resource: 'REPORTS' }
          ]
        }
      });

      console.log(`Found ${financePermissions.length} finance/reporting permissions available`);

      // Grant key permissions for finance board work
      const desiredPermissions = financePermissions.filter(p => 
        (p.resource === 'FINANCE' && ['VIEW_ALL', 'EXPORT'].includes(p.action)) ||
        (p.resource === 'REPORTS' && ['VIEW_ALL', 'EXPORT', 'MANAGE'].includes(p.action))
      );

      for (const permission of desiredPermissions) {
        try {
          // Check if permission already granted
          const existingGrant = await prisma.userPermission.findUnique({
            where: {
              userId_permissionId: {
                userId: user.id,
                permissionId: permission.id
              }
            }
          });

          if (!existingGrant) {
            await prisma.userPermission.create({
              data: {
                userId: user.id,
                permissionId: permission.id
              }
            });
            console.log(`✅ Added permission: ${permission.resource} - ${permission.action}`);
          } else {
            console.log(`ℹ️  Permission already exists: ${permission.resource} - ${permission.action}`);
          }
        } catch (error) {
          console.log(`⚠️  Could not add permission ${permission.resource} - ${permission.action}:`, error);
        }
      }

      if (desiredPermissions.length === 0) {
        console.log('ℹ️  No additional permissions needed - DIRECTOR role provides comprehensive access');
      }
    }

    console.log('\n📊 Final Status:');
    console.log(`- ${user?.name}: ${user?.role} (${user?.isActive ? 'Active' : 'Inactive'})`);
    console.log('\n🎯 Role Capabilities (DIRECTOR):');
    console.log('- ✅ View/manage most data across all territories');
    console.log('- ✅ Full access to finance data and reporting');
    console.log('- ✅ Export capabilities for finance reports');
    console.log('- ✅ Advanced reporting and analytics access');
    console.log('- ❌ No user management (not admin)');

  } catch (error) {
    console.error('❌ Error creating/updating user:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createNatoyaFinanceUser().catch(console.error);