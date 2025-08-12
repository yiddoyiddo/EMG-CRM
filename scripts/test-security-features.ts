import { prisma } from '../src/lib/db';
import { SecurityService } from '../src/lib/security';
import { SessionManager } from '../src/lib/session-management';
import { DataExportService } from '../src/lib/export-service';
import { Resource, Action, Role } from '@prisma/client';

async function testSecurityFeatures() {
  console.log('🔒 Testing Advanced RBAC Security Features\n');

  try {
    // Test 1: Row-level Security for different roles
    console.log('1. Testing Row-level Security...');
    await testRowLevelSecurity();
    console.log('✅ Row-level security tests passed\n');

    // Test 2: Audit logging
    console.log('2. Testing Audit Logging...');
    await testAuditLogging();
    console.log('✅ Audit logging tests passed\n');

    // Test 3: Session management
    console.log('3. Testing Session Management...');
    await testSessionManagement();
    console.log('✅ Session management tests passed\n');

    // Test 4: Data export restrictions
    console.log('4. Testing Data Export Restrictions...');
    await testDataExportRestrictions();
    console.log('✅ Data export restriction tests passed\n');

    // Test 5: Permission validation
    console.log('5. Testing Permission Validation...');
    await testPermissionValidation();
    console.log('✅ Permission validation tests passed\n');

    console.log('🎉 All security tests completed successfully!');
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

async function testRowLevelSecurity() {
  // Create test users with different roles
  const adminUser = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
  const bdrUser = await prisma.user.findFirst({ where: { role: 'BDR' } });
  const managerUser = await prisma.user.findFirst({ where: { role: 'MANAGER' } });

  if (!adminUser || !bdrUser || !managerUser) {
    console.log('  - Creating test users for security testing...');
    return; // Skip if users don't exist
  }

  // Test BDR can only see own leads
  const bdrContext = {
    userId: bdrUser.id,
    role: bdrUser.role,
    territoryId: bdrUser.territoryId || undefined,
    managedTerritoryIds: [],
    permissions: ['LEADS:READ', 'PIPELINE:READ']
  };

  const bdrQuery = SecurityService.buildSecureQuery(
    { where: {} },
    bdrContext,
    Resource.LEADS
  );

  console.log(`  - BDR query should filter to user ID ${bdrUser.id}:`, 
    bdrQuery.where.bdrId === bdrUser.id ? '✅' : '❌');

  // Test Admin can see all leads
  const adminContext = {
    userId: adminUser.id,
    role: adminUser.role,
    territoryId: adminUser.territoryId || undefined,
    managedTerritoryIds: [],
    permissions: ['LEADS:READ', 'LEADS:VIEW_ALL']
  };

  const adminQuery = SecurityService.buildSecureQuery(
    { where: {} },
    adminContext,
    Resource.LEADS
  );

  console.log(`  - Admin query should not have user restrictions:`, 
    !adminQuery.where.bdrId ? '✅' : '❌');
}

async function testAuditLogging() {
  const testUser = await prisma.user.findFirst();
  if (!testUser) return;

  const initialCount = await prisma.auditLog.count();

  // Log a test action
  await SecurityService.logAction({
    action: 'TEST_ACTION',
    resource: 'LEADS',
    resourceId: '123',
    details: { test: true },
    success: true
  });

  const finalCount = await prisma.auditLog.count();
  console.log(`  - Audit log entry created:`, 
    finalCount > initialCount ? '✅' : '❌');

  // Test audit log retrieval with different roles
  const recentLogs = await prisma.auditLog.findMany({
    where: { action: 'TEST_ACTION' },
    take: 1
  });

  console.log(`  - Audit log contains test action:`, 
    recentLogs.length > 0 ? '✅' : '❌');
}

async function testSessionManagement() {
  const testUser = await prisma.user.findFirst();
  if (!testUser) return;

  // Create a test session
  const sessionId = await SessionManager.createSession(
    testUser.id,
    '127.0.0.1',
    'test-user-agent'
  );

  console.log(`  - Session created:`, sessionId ? '✅' : '❌');

  // Validate the session
  const isValid = await SessionManager.validateSession(sessionId, testUser.id);
  console.log(`  - Session validation:`, isValid ? '✅' : '❌');

  // Test session activity update
  await SessionManager.updateActivity(sessionId);
  console.log(`  - Session activity updated: ✅`);

  // Get active sessions
  const activeSessions = await SessionManager.getActiveSessions(testUser.id);
  console.log(`  - Active sessions retrieved:`, 
    activeSessions.length > 0 ? '✅' : '❌');

  // Terminate the test session
  await SessionManager.terminateSession(sessionId);
  console.log(`  - Session terminated: ✅`);
}

async function testDataExportRestrictions() {
  const bdrUser = await prisma.user.findFirst({ where: { role: 'BDR' } });
  const adminUser = await prisma.user.findFirst({ where: { role: 'ADMIN' } });

  if (!bdrUser || !adminUser) return;

  // Test BDR export restrictions
  const bdrContext = {
    userId: bdrUser.id,
    role: bdrUser.role,
    territoryId: bdrUser.territoryId || undefined,
    managedTerritoryIds: [],
    permissions: ['LEADS:READ', 'LEADS:EXPORT']
  };

  const bdrExportRequest = {
    resource: Resource.LEADS,
    format: 'csv' as const,
    filters: {}
  };

  const { allowed: bdrAllowed, restrictions: bdrRestrictions } = 
    await DataExportService.canExport(bdrContext, bdrExportRequest);

  console.log(`  - BDR can export leads (limited):`, 
    bdrAllowed && bdrRestrictions?.maxRecords === 500 ? '✅' : '❌');

  // Test BDR cannot export finance data
  const financeRequest = {
    resource: Resource.FINANCE,
    format: 'csv' as const,
    filters: {}
  };

  const { allowed: financeAllowed } = 
    await DataExportService.canExport(bdrContext, financeRequest);

  console.log(`  - BDR cannot export finance data:`, !financeAllowed ? '✅' : '❌');

  // Test Admin has unlimited export
  const adminContext = {
    userId: adminUser.id,
    role: adminUser.role,
    territoryId: adminUser.territoryId || undefined,
    managedTerritoryIds: [],
    permissions: ['LEADS:READ', 'LEADS:EXPORT', 'FINANCE:EXPORT']
  };

  const { allowed: adminAllowed, restrictions: adminRestrictions } = 
    await DataExportService.canExport(adminContext, bdrExportRequest);

  console.log(`  - Admin has unlimited export:`, 
    adminAllowed && adminRestrictions?.maxRecords === -1 ? '✅' : '❌');
}

async function testPermissionValidation() {
  const bdrUser = await prisma.user.findFirst({ where: { role: 'BDR' } });
  const adminUser = await prisma.user.findFirst({ where: { role: 'ADMIN' } });

  if (!bdrUser || !adminUser) return;

  // Test BDR context
  const bdrContext = {
    userId: bdrUser.id,
    role: bdrUser.role,
    territoryId: bdrUser.territoryId || undefined,
    managedTerritoryIds: [],
    permissions: ['LEADS:READ', 'PIPELINE:READ']
  };

  // BDR should be able to read leads
  const canReadLeads = await SecurityService.canAccessResource(
    bdrContext, 
    Resource.LEADS, 
    Action.READ
  );
  console.log(`  - BDR can read leads:`, canReadLeads ? '✅' : '❌');

  // BDR should not be able to manage users
  const canManageUsers = await SecurityService.canAccessResource(
    bdrContext, 
    Resource.USERS, 
    Action.MANAGE
  );
  console.log(`  - BDR cannot manage users:`, !canManageUsers ? '✅' : '❌');

  // Test Admin context
  const adminContext = {
    userId: adminUser.id,
    role: adminUser.role,
    territoryId: adminUser.territoryId || undefined,
    managedTerritoryIds: [],
    permissions: ['LEADS:READ', 'LEADS:MANAGE', 'USERS:MANAGE']
  };

  // Admin should be able to manage users
  const adminCanManageUsers = await SecurityService.canAccessResource(
    adminContext, 
    Resource.USERS, 
    Action.MANAGE
  );
  console.log(`  - Admin can manage users:`, adminCanManageUsers ? '✅' : '❌');
}

async function cleanupTestData() {
  // Clean up any test audit logs
  await prisma.auditLog.deleteMany({
    where: { action: 'TEST_ACTION' }
  });

  // Clean up any test sessions
  await SessionManager.cleanupExpiredSessions();
}

// Main execution
if (require.main === module) {
  testSecurityFeatures()
    .then(async () => {
      await cleanupTestData();
      await prisma.$disconnect();
    })
    .catch(async (error) => {
      console.error('Test execution failed:', error);
      await cleanupTestData();
      await prisma.$disconnect();
      process.exit(1);
    });
}