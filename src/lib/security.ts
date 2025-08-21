import { prisma } from './db';
import { getServerSession } from 'next-auth';
import { authOptions } from './auth-options';
import { Role, Resource, Action } from '@prisma/client';
import { NextRequest } from 'next/server';
import { getEffectivePermissions } from './permissions';

export interface SecurityContext {
  userId: string;
  role: Role;
  territoryId?: string;
  managedTerritoryIds: string[];
  permissions: string[];
}

export interface AuditLogData {
  action: string;
  resource: string;
  resourceId?: string;
  details?: Record<string, any> | null;
  success?: boolean;
  errorMsg?: string;
  ipAddress?: string;
  userAgent?: string;
  sessionId?: string;
}

export class SecurityService {
  static async getSecurityContext(): Promise<SecurityContext | null> {
    const session = await getServerSession(authOptions);
    if (!session?.user) return null;

    const user = session.user as { id: string; role: Role; territoryId?: string | null; managedTerritories?: any[]; managedTerritoryIds?: string[] };

    // Get user permissions
    const userPermissions = await prisma.userPermission.findMany({
      where: {
        userId: user.id,
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } }
        ]
      },
      include: {
        permission: true
      }
    });

    // Get role permissions
    const rolePermissions = await prisma.rolePermission.findMany({
      where: { role: user.role },
      include: {
        permission: true
      }
    });

    const assignedPermissionStrings = [
      ...userPermissions.map(up => `${up.permission.resource}:${up.permission.action}`),
      ...rolePermissions.map(rp => `${rp.permission.resource}:${rp.permission.action}`)
    ];

    // Always include baseline defaults for the user's role so missing DB rows don't block core features
    const defaultEffective = getEffectivePermissions({
      id: user.id,
      role: user.role as Role,
      territoryId: user.territoryId || undefined,
      managedTerritories: user.managedTerritories || [],
      permissions: [],
    }).map(p => `${p.resource}:${p.action}`);

    const allPermissions = Array.from(new Set([...assignedPermissionStrings, ...defaultEffective]));

    return {
      userId: user.id,
      role: user.role,
      territoryId: user.territoryId || undefined,
      managedTerritoryIds: user.managedTerritoryIds || [],
      permissions: allPermissions
    };
  }

  static async canAccessResource(
    context: SecurityContext,
    resource: Resource,
    action: Action,
    resourceData?: Record<string, any>
  ): Promise<boolean> {
    // Allow authenticated users to use messaging features; row-level checks are enforced per endpoint
    if (resource === 'MESSAGING') {
      return true;
    }

    const permission = `${resource}:${action}`;
    // Check if user has the permission
    if (!context.permissions.includes(permission)) {
      return false;
    }

    // Apply row-level security based on resource type and user context
    return this.applyRowLevelSecurity(context, resource, action, resourceData);
  }

  private static async applyRowLevelSecurity(
    context: SecurityContext,
    resource: Resource,
    action: Action,
    resourceData?: Record<string, any>
  ): Promise<boolean> {
    // Admin can access everything
    if (context.role === 'ADMIN') {
      return true;
    }

    switch (resource) {
      case 'LEADS':
        return this.canAccessLeads(context, resourceData);
      
      case 'PIPELINE':
        return this.canAccessPipeline(context, resourceData);
      
      case 'FINANCE':
        return this.canAccessFinance(context, resourceData);
      
      case 'USERS':
        return this.canAccessUsers(context, action, resourceData);
      
      case 'REPORTS':
        return this.canAccessReports(context, resourceData);
      case 'MESSAGING':
        // High-level permission was already checked. Row-level membership is enforced in endpoints.
        return true;
      case 'TEMPLATES':
        return this.canAccessTemplates(context, action, resourceData);
      
      default:
        return false;
    }
  }

  private static canAccessLeads(context: SecurityContext, leadData?: Record<string, any>): boolean {
    if (!leadData) return true; // For general access

    // BDRs can only see their own leads
    if (context.role === 'BDR') {
      return leadData.bdrId === context.userId;
    }

    // Team leads can see their team's leads
    if (context.role === 'TEAM_LEAD' && context.territoryId) {
      return leadData.bdr?.territoryId === context.territoryId;
    }

    // Managers can see leads in territories they manage
    if (context.role === 'MANAGER' && context.managedTerritoryIds.length > 0) {
      return context.managedTerritoryIds.includes(leadData.bdr?.territoryId);
    }

    // Directors can see all leads
    return context.role === 'DIRECTOR';
  }

  private static canAccessPipeline(context: SecurityContext, pipelineData?: Record<string, any>): boolean {
    if (!pipelineData) return true;

    // BDRs can only see their own pipeline items
    if (context.role === 'BDR') {
      return pipelineData.bdrId === context.userId;
    }

    // Team leads can see their team's pipeline
    if (context.role === 'TEAM_LEAD' && context.territoryId) {
      return pipelineData.bdr?.territoryId === context.territoryId;
    }

    // Managers can see pipeline in territories they manage
    if (context.role === 'MANAGER' && context.managedTerritoryIds.length > 0) {
      return context.managedTerritoryIds.includes(pipelineData.bdr?.territoryId);
    }

    return context.role === 'DIRECTOR';
  }

  private static canAccessFinance(context: SecurityContext, financeData?: Record<string, any>): boolean {
    // Finance data is more restricted
    if (context.role === 'BDR') {
      return financeData?.bdrId === context.userId;
    }

    // Only managers and above can see team finance data
    if (context.role === 'TEAM_LEAD') {
      return false; // Team leads cannot see finance by default
    }

    if (context.role === 'MANAGER' && context.managedTerritoryIds.length > 0) {
      return context.managedTerritoryIds.includes(financeData?.bdr?.territoryId);
    }

    return context.role === 'DIRECTOR';
  }

  private static canAccessUsers(context: SecurityContext, action: Action, userData?: Record<string, any>): boolean {
    // Only managers and above can manage users
    if (action === 'CREATE' || action === 'DELETE' || action === 'MANAGE') {
      return ['MANAGER', 'DIRECTOR'].includes(context.role);
    }

    // BDRs can only see basic info of users in their territory
    if (context.role === 'BDR') {
      return userData?.territoryId === context.territoryId;
    }

    if (context.role === 'TEAM_LEAD' && context.territoryId) {
      return userData?.territoryId === context.territoryId;
    }

    if (context.role === 'MANAGER' && context.managedTerritoryIds.length > 0) {
      return context.managedTerritoryIds.includes(userData?.territoryId);
    }

    return context.role === 'DIRECTOR';
  }

  private static canAccessReports(context: SecurityContext, reportData?: Record<string, any>): boolean {
    // BDRs can only see their own reports
    if (context.role === 'BDR') {
      return reportData?.scope === 'self';
    }

    // Team leads can see team reports
    if (context.role === 'TEAM_LEAD') {
      return ['self', 'team'].includes(reportData?.scope);
    }

    return ['MANAGER', 'DIRECTOR'].includes(context.role);
  }

  private static canAccessTemplates(context: SecurityContext, action: Action, templateData?: Record<string, any>): boolean {
    // All authenticated roles can READ templates by default if they have READ permission assigned
    if (action === 'READ') return true;
    // For CREATE/UPDATE/DELETE, allow BDR and above if they have the permission assigned
    return ['BDR', 'TEAM_LEAD', 'MANAGER', 'DIRECTOR', 'ADMIN'].includes(context.role);
  }

  static async logAction(data: AuditLogData, request?: NextRequest): Promise<void> {
    try {
      const context = await this.getSecurityContext();
      if (!context) return;

      const ipAddress = data.ipAddress || this.getClientIP(request);
      const userAgent = data.userAgent || request?.headers.get('user-agent') || undefined;

      await prisma.auditLog.create({
        data: {
          userId: context.userId,
          action: typeof data.action === 'string' ? data.action : String(data.action),
          resource: typeof data.resource === 'string' ? data.resource : String(data.resource ?? 'UNKNOWN'),
          resourceId: data.resourceId,
          details: data.details ? JSON.parse(JSON.stringify(data.details)) : null,
          success: data.success ?? true,
          errorMsg: data.errorMsg,
          ipAddress,
          userAgent,
          sessionId: data.sessionId
        }
      });
    } catch (error) {
      console.error('Failed to log audit action:', error);
      // Don't throw - audit logging shouldn't break the main functionality
    }
  }

  private static getClientIP(request?: NextRequest): string | undefined {
    if (!request) return undefined;

    // Check for IP in various headers
    const forwarded = request.headers.get('x-forwarded-for');
    const real = request.headers.get('x-real-ip');
    const remote = request.headers.get('x-remote-addr');

    if (forwarded) {
      return forwarded.split(',')[0].trim();
    }
    if (real) {
      return real;
    }
    if (remote) {
      return remote;
    }

    return undefined;
  }

  static async createDataAccessPolicy(
    userId: string,
    resource: Resource,
    conditions: Record<string, any>,
    createdBy: string
  ): Promise<void> {
    await prisma.dataAccessPolicy.create({
      data: {
        userId,
        resource,
        conditions: JSON.parse(JSON.stringify(conditions)),
        createdBy
      }
    });
  }

  static async getDataAccessPolicies(userId: string, resource?: Resource) {
    return prisma.dataAccessPolicy.findMany({
      where: {
        userId,
        resource,
        isActive: true
      }
    });
  }

  static buildSecureQuery(
    baseQuery: Record<string, any>,
    context: SecurityContext,
    resource: Resource
  ): Record<string, any> {
    if (context.role === 'ADMIN') {
      return baseQuery; // Admin sees everything
    }

    switch (resource) {
      case 'LEADS':
        return this.buildLeadsQuery(baseQuery, context);
      case 'PIPELINE':
        return this.buildPipelineQuery(baseQuery, context);
      case 'FINANCE':
        return this.buildFinanceQuery(baseQuery, context);
      case 'MESSAGING':
        return baseQuery;
      case 'TEMPLATES':
        return baseQuery;
      default:
        return baseQuery;
    }
  }

  private static buildLeadsQuery(baseQuery: Record<string, any>, context: SecurityContext): Record<string, any> {
    if (context.role === 'BDR') {
      return {
        ...baseQuery,
        where: {
          ...baseQuery.where,
          bdrId: context.userId
        }
      };
    }

    if (context.role === 'TEAM_LEAD' && context.territoryId) {
      return {
        ...baseQuery,
        where: {
          ...baseQuery.where,
          bdr: {
            territoryId: context.territoryId
          }
        }
      };
    }

    if (context.role === 'MANAGER' && context.managedTerritoryIds.length > 0) {
      return {
        ...baseQuery,
        where: {
          ...baseQuery.where,
          bdr: {
            territoryId: {
              in: context.managedTerritoryIds
            }
          }
        }
      };
    }

    return baseQuery; // Directors see all
  }

  private static buildPipelineQuery(baseQuery: Record<string, any>, context: SecurityContext): Record<string, any> {
    if (context.role === 'BDR') {
      return {
        ...baseQuery,
        where: {
          ...baseQuery.where,
          bdrId: context.userId
        }
      };
    }

    if (context.role === 'TEAM_LEAD' && context.territoryId) {
      return {
        ...baseQuery,
        where: {
          ...baseQuery.where,
          bdr: {
            territoryId: context.territoryId
          }
        }
      };
    }

    if (context.role === 'MANAGER' && context.managedTerritoryIds.length > 0) {
      return {
        ...baseQuery,
        where: {
          ...baseQuery.where,
          bdr: {
            territoryId: {
              in: context.managedTerritoryIds
            }
          }
        }
      };
    }

    return baseQuery;
  }

  private static buildFinanceQuery(baseQuery: Record<string, any>, context: SecurityContext): Record<string, any> {
    if (context.role === 'BDR') {
      return {
        ...baseQuery,
        where: {
          ...baseQuery.where,
          bdrId: context.userId
        }
      };
    }

    // Team leads cannot see finance data by default
    if (context.role === 'TEAM_LEAD') {
      return {
        ...baseQuery,
        where: {
          ...baseQuery.where,
          id: 'never-match' // Effectively block access
        }
      };
    }

    if (context.role === 'MANAGER' && context.managedTerritoryIds.length > 0) {
      return {
        ...baseQuery,
        where: {
          ...baseQuery.where,
          bdr: {
            territoryId: {
              in: context.managedTerritoryIds
            }
          }
        }
      };
    }

    return baseQuery;
  }
}

// Export middleware function for easy integration
export async function withSecurity<T>(
  resource: Resource,
  action: Action,
  operation: (context: SecurityContext) => Promise<T>,
  request?: NextRequest
): Promise<T> {
  const context = await SecurityService.getSecurityContext();
  
  if (!context) {
    await SecurityService.logAction({
      action: action,
      resource: resource,
      success: false,
      errorMsg: 'Unauthorized access attempt'
    }, request);
    throw new Error('Unauthorized');
  }

  const hasAccess = await SecurityService.canAccessResource(context, resource, action);
  
  if (!hasAccess) {
    await SecurityService.logAction({
      action: action,
      resource: resource,
      success: false,
      errorMsg: 'Insufficient permissions'
    }, request);
    throw new Error('Forbidden');
  }

  try {
    const result = await operation(context);
    
    await SecurityService.logAction({
      action: action,
      resource: resource,
      success: true
    }, request);
    
    return result;
  } catch (error) {
    await SecurityService.logAction({
      action: action,
      resource: resource,
      success: false,
      errorMsg: error instanceof Error ? error.message : 'Unknown error'
    }, request);
    throw error;
  }
}