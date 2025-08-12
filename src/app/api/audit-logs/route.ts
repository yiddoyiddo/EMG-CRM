import { NextRequest, NextResponse } from 'next/server';
import { SecurityService, withSecurity } from '@/lib/security';
import { prisma } from '@/lib/db';
import { Resource, Action } from '@prisma/client';

export async function GET(req: NextRequest) {
  return withSecurity(Resource.ACTIVITY_LOGS, Action.READ, async (context) => {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = Math.min(parseInt(searchParams.get('pageSize') || '50'), 100); // Limit max page size
    const skip = (page - 1) * pageSize;
    
    const userId = searchParams.get('userId');
    const action = searchParams.get('action');
    const resource = searchParams.get('resource');
    const success = searchParams.get('success');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // Build where clause based on user permissions and filters
    let where: any = {};

    // Apply row-level security for audit logs
    if (context.role === 'BDR' || context.role === 'TEAM_LEAD') {
      // BDRs and team leads can only see their own audit logs
      where.userId = context.userId;
    } else if (context.role === 'MANAGER' && context.managedTerritoryIds.length > 0) {
      // Managers can see logs from users in territories they manage
      where.user = {
        territoryId: {
          in: context.managedTerritoryIds
        }
      };
    }
    // Directors and Admins can see all logs (no additional restrictions)

    // Apply filters
    if (userId && (context.role === 'ADMIN' || context.role === 'DIRECTOR' || 
        (context.role === 'MANAGER' && context.managedTerritoryIds.length > 0))) {
      where.userId = userId;
    }
    
    if (action) where.action = action;
    if (resource) where.resource = resource;
    if (success !== null && success !== undefined) {
      where.success = success === 'true';
    }
    
    if (startDate || endDate) {
      where.timestamp = {};
      if (startDate) where.timestamp.gte = new Date(startDate);
      if (endDate) where.timestamp.lte = new Date(endDate);
    }

    // Get total count
    const total = await prisma.auditLog.count({ where });

    // Get audit logs
    const auditLogs = await prisma.auditLog.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: {
        timestamp: 'desc'
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            territory: {
              select: {
                name: true
              }
            }
          }
        }
      }
    });

    // Sanitize sensitive data based on user role
    const sanitizedLogs = auditLogs.map(log => {
      const sanitized: any = {
        id: log.id,
        action: log.action,
        resource: log.resource,
        resourceId: log.resourceId,
        success: log.success,
        timestamp: log.timestamp,
        user: log.user,
        ipAddress: log.ipAddress
      };

      // Only include sensitive details for admins and directors
      if (context.role === 'ADMIN' || context.role === 'DIRECTOR') {
        sanitized.details = log.details;
        sanitized.errorMsg = log.errorMsg;
        sanitized.userAgent = log.userAgent;
        sanitized.sessionId = log.sessionId;
      } else {
        // Provide limited details for other roles
        sanitized.details = log.details ? { action: log.details.action || 'N/A' } : null;
        if (log.errorMsg && log.success === false) {
          sanitized.errorMsg = 'Error occurred'; // Generic error message
        }
      }

      return sanitized;
    });

    const totalPages = Math.ceil(total / pageSize);

    return NextResponse.json({
      auditLogs: sanitizedLogs,
      total,
      page,
      pageSize,
      totalPages,
    });
  }, req);
}

// Get audit log statistics
export async function POST(req: NextRequest) {
  return withSecurity(Resource.ACTIVITY_LOGS, Action.READ, async (context) => {
    const body = await req.json();
    const { action: requestAction, startDate, endDate } = body;

    if (requestAction !== 'stats') {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    // Build base where clause for time range
    let where: any = {};
    if (startDate || endDate) {
      where.timestamp = {};
      if (startDate) where.timestamp.gte = new Date(startDate);
      if (endDate) where.timestamp.lte = new Date(endDate);
    }

    // Apply row-level security
    if (context.role === 'BDR' || context.role === 'TEAM_LEAD') {
      where.userId = context.userId;
    } else if (context.role === 'MANAGER' && context.managedTerritoryIds.length > 0) {
      where.user = {
        territoryId: {
          in: context.managedTerritoryIds
        }
      };
    }

    // Get statistics
    const [
      totalActions,
      successfulActions,
      failedActions,
      actionsByType,
      actionsByResource,
      topUsers
    ] = await Promise.all([
      // Total actions
      prisma.auditLog.count({ where }),
      
      // Successful actions
      prisma.auditLog.count({ where: { ...where, success: true } }),
      
      // Failed actions
      prisma.auditLog.count({ where: { ...where, success: false } }),
      
      // Actions by type
      prisma.auditLog.groupBy({
        by: ['action'],
        where,
        _count: { action: true },
        orderBy: { _count: { action: 'desc' } }
      }),
      
      // Actions by resource
      prisma.auditLog.groupBy({
        by: ['resource'],
        where,
        _count: { resource: true },
        orderBy: { _count: { resource: 'desc' } }
      }),
      
      // Top users by activity (only for managers and above)
      (context.role === 'MANAGER' || context.role === 'DIRECTOR' || context.role === 'ADMIN') 
        ? prisma.auditLog.groupBy({
            by: ['userId'],
            where,
            _count: { userId: true },
            orderBy: { _count: { userId: 'desc' } },
            take: 10
          }).then(async (results) => {
            const userIds = results.map(r => r.userId);
            const users = await prisma.user.findMany({
              where: { id: { in: userIds } },
              select: { id: true, name: true, email: true }
            });
            return results.map(result => ({
              user: users.find(u => u.id === result.userId),
              count: result._count.userId
            }));
          })
        : Promise.resolve([])
    ]);

    return NextResponse.json({
      summary: {
        totalActions,
        successfulActions,
        failedActions,
        successRate: totalActions > 0 ? (successfulActions / totalActions * 100).toFixed(2) : '0.00'
      },
      actionsByType: actionsByType.map(item => ({
        action: item.action,
        count: item._count.action
      })),
      actionsByResource: actionsByResource.map(item => ({
        resource: item.resource,
        count: item._count.resource
      })),
      topUsers: topUsers
    });
  }, req);
}