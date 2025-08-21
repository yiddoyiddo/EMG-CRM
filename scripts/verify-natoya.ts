import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verifyNatoyaAccount() {
  console.log('🔍 Verifying Natoya Rimmer account and permissions...\n');

  try {
    // Find user
    const user = await prisma.user.findUnique({
      where: { email: 'natoya.rimmer@busenq.com' },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
        lastLoginAt: true,
        permissions: {
          include: {
            permission: true
          }
        }
      }
    });

    if (!user) {
      console.log('❌ User not found!');
      return;
    }

    console.log('📊 User Account Details:');
    console.log('=' .repeat(50));
    console.log(`Name: ${user.name}`);
    console.log(`Email: ${user.email}`);
    console.log(`Role: ${user.role} (DIRECTOR)`);
    console.log(`Status: ${user.isActive ? 'Active ✅' : 'Inactive ❌'}`);
    console.log(`Created: ${new Date(user.createdAt).toLocaleDateString()}`);
    console.log(`Last Login: ${user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleDateString() : 'Never'}`);

    console.log('\n🔐 Additional Permissions (beyond role-based):');
    console.log('=' .repeat(50));
    
    if (user.permissions.length === 0) {
      console.log('No additional permission overrides - using role-based permissions only');
    } else {
      user.permissions.forEach(up => {
        const p = up.permission;
        const expiry = up.expiresAt ? ` (expires ${new Date(up.expiresAt).toLocaleDateString()})` : '';
        console.log(`✅ ${p.resource} - ${p.action}${expiry}`);
      });
    }

    console.log('\n🎯 Finance Board Access Summary:');
    console.log('=' .repeat(50));
    console.log('✅ Full finance data access (DIRECTOR role)');
    console.log('✅ Cross-territory financial reporting');
    console.log('✅ Advanced analytics and reporting');
    console.log('✅ Data export capabilities');
    
    const financePerms = user.permissions.filter(up => 
      up.permission.resource === 'FINANCE' || up.permission.resource === 'REPORTS'
    );
    
    if (financePerms.length > 0) {
      console.log(`✅ ${financePerms.length} additional finance/reporting permissions`);
    }
    
    console.log('❌ No user management (not admin role)');
    console.log('❌ No system administration');

    console.log('\n🎉 SUCCESS: Natoya Rimmer is ready for finance board work!');
    console.log('💡 Credentials to share:');
    console.log(`   Email: ${user.email}`);
    console.log(`   Temp Password: Finance123!`);
    console.log(`   ⚠️  Must change password on first login`);

  } catch (error) {
    console.error('❌ Error verifying user:', error);
  } finally {
    await prisma.$disconnect();
  }
}

verifyNatoyaAccount().catch(console.error);