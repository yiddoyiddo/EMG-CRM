# Advanced RBAC Security Features

## Overview

This document outlines the comprehensive security features implemented in Phase 2 of the EMG CRM project. These features provide enterprise-grade data security, audit logging, session management, and role-based access controls.

## ✅ Implemented Features

### 1. Row-Level Security (RLS)

**Location**: `src/lib/security.ts`

- **Purpose**: Ensures users can only access data they're authorized to see
- **Implementation**: 
  - Dynamic query filtering based on user role and territory
  - BDRs see only their own data
  - Team leads see their team's data
  - Managers see data from territories they manage
  - Directors and admins see all data

**Key Functions**:
- `SecurityService.buildSecureQuery()` - Applies security filters to database queries
- `SecurityService.canAccessResource()` - Validates resource access permissions

### 2. Comprehensive Audit Logging

**Database Table**: `AuditLog`
**API Route**: `/api/audit-logs`

- **Purpose**: Track all user actions for security and compliance
- **Features**:
  - Automatic logging of CRUD operations
  - Success/failure tracking
  - IP address and user agent logging
  - Session ID correlation
  - Detailed action metadata

**Log Fields**:
- User ID, action type, resource type
- IP address, user agent, session ID
- Success status and error messages
- JSON details object for additional context

### 3. Session Management & Timeout Controls

**Location**: `src/lib/session-management.ts`
**Database Table**: `UserSession`
**API Route**: `/api/sessions`

**Features**:
- Configurable session timeouts
- Maximum concurrent sessions per user
- Inactivity detection and auto-logout
- Session validation and cleanup
- Suspicious activity detection

**Default Configuration**:
```typescript
{
  maxSessionDuration: 480,    // 8 hours
  maxInactiveDuration: 60,    // 1 hour  
  maxConcurrentSessions: 3,
  requireSessionValidation: true
}
```

### 4. Data Export Restrictions

**Location**: `src/lib/export-service.ts`
**API Route**: `/api/export`

**Role-Based Restrictions**:

| Role | Max Records | Allowed Formats | Finance Access | Sensitive Fields |
|------|-------------|----------------|----------------|-----------------|
| BDR | 500 | CSV | ❌ | Hidden |
| TEAM_LEAD | 2,000 | CSV, XLSX | ❌ | Hidden |  
| MANAGER | 10,000 | CSV, JSON, XLSX | Limited | Limited |
| DIRECTOR | 50,000 | All formats | ✅ | ✅ |
| ADMIN | Unlimited | All formats | ✅ | ✅ |

**Features**:
- Automatic field filtering based on permissions
- Record count limits by role
- Export history tracking
- Approval workflow for restricted exports

### 5. Enhanced Permission System

**Database Tables**: `Permission`, `UserPermission`, `RolePermission`, `DataAccessPolicy`

**Permission Structure**:
- Resource-based permissions (LEADS, PIPELINE, FINANCE, etc.)
- Action-based permissions (CREATE, READ, UPDATE, DELETE, EXPORT, etc.)
- Role-based default permissions
- User-specific permission overrides
- Expirable permissions support

## API Integration

### Secure API Wrapper

All sensitive API routes use the `withSecurity()` wrapper:

```typescript
export async function GET(req: NextRequest) {
  return withSecurity(Resource.LEADS, Action.READ, async (context) => {
    // Secured operation with automatic:
    // - Authentication check
    // - Permission validation  
    // - Audit logging
    // - Row-level security
    
    const secureQuery = SecurityService.buildSecureQuery(baseQuery, context, Resource.LEADS);
    return await prisma.lead.findMany(secureQuery);
  }, req);
}
```

### New API Endpoints

1. **`/api/audit-logs`** - View audit logs (role-filtered)
2. **`/api/export`** - Secure data export with restrictions
3. **`/api/sessions`** - Session management and monitoring

## Database Schema Changes

### New Tables Added

```sql
-- Comprehensive audit logging
AuditLog {
  id, userId, action, resource, resourceId,
  ipAddress, userAgent, details, success, 
  errorMsg, timestamp, sessionId
}

-- Row-level security policies  
DataAccessPolicy {
  id, userId, resource, conditions,
  isActive, createdAt, updatedAt, createdBy
}

-- Session management
UserSession {
  id, userId, sessionId, ipAddress, userAgent,
  loginTime, lastActivity, expiresAt, 
  isActive, logoutTime
}
```

### Enhanced User Model

Added relationships for audit trails and session tracking:
- `auditLogs` - User's audit log entries
- `dataAccessPolicies` - Custom access policies
- `sessions` - Active user sessions

## Security Testing

**Test Script**: `scripts/test-security-features.ts`

Comprehensive test suite covering:
- ✅ Row-level security filtering
- ✅ Audit logging functionality  
- ✅ Session management lifecycle
- ✅ Export restrictions by role
- ✅ Permission validation

## Implementation Notes

### Performance Considerations
- Database indexes on all security-related queries
- Efficient query building to minimize database load
- Session cleanup background processes

### Compliance Features
- Comprehensive audit trails for regulatory compliance
- Data export controls for GDPR/data protection
- Session tracking for security monitoring
- Role-based access controls for SOX compliance

### Error Handling
- Graceful degradation when security checks fail
- Detailed error logging without exposing sensitive data
- User-friendly error messages

## Usage Examples

### Checking User Permissions
```typescript
const context = await SecurityService.getSecurityContext();
const canExport = await SecurityService.canAccessResource(
  context, Resource.FINANCE, Action.EXPORT
);
```

### Logging User Actions
```typescript
await SecurityService.logAction({
  action: 'CREATE_LEAD',
  resource: 'LEADS', 
  resourceId: lead.id.toString(),
  details: { leadName: lead.name, company: lead.company }
}, request);
```

### Validating Sessions
```typescript
const isValid = await SessionManager.validateSession(sessionId, userId);
if (!isValid) {
  // Redirect to login
}
```

### Secure Data Export
```typescript
const exportResult = await DataExportService.executeExport(context, {
  resource: Resource.LEADS,
  format: 'csv',
  filters: { status: 'active' }
});
```

## Security Benefits

1. **Data Protection**: Row-level security ensures users only see authorized data
2. **Audit Compliance**: Complete audit trail of all user actions
3. **Session Security**: Prevents session hijacking and concurrent abuse
4. **Export Control**: Prevents unauthorized data exfiltration
5. **Permission Granularity**: Fine-grained access control at resource/action level

## Next Steps

Future enhancements could include:
- Multi-factor authentication integration
- Advanced threat detection and response
- Data encryption at rest and in transit
- Advanced reporting on security metrics
- Integration with SIEM systems

---

**Status**: ✅ All Phase 2 Advanced RBAC Features Implemented and Tested
**Last Updated**: 2025-08-07