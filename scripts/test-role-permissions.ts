// Simple test to verify role permissions API works
async function testRolePermissionsAPI() {
  const baseUrl = 'http://localhost:3000';
  
  try {
    // Test GET endpoint
    const response = await fetch(`${baseUrl}/api/admin/roles/permissions`, {
      headers: {
        'Authorization': 'Bearer test', // This will need proper auth in real usage
        'Content-Type': 'application/json',
      },
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Role permissions API working');
      console.log('Available permissions:', data.availablePermissions?.length || 0);
      console.log('Role permissions loaded for roles:', Object.keys(data.rolePermissions || {}));
    } else {
      console.log('❌ API response not ok:', response.status, response.statusText);
    }
  } catch (error) {
    console.error('❌ Error testing API:', error);
  }
}

console.log('Testing Role Permissions API...');
testRolePermissionsAPI();