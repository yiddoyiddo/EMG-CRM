import { NextRequest } from "next/server";
import { Resource, Action } from "@prisma/client";
import { getAuthenticatedUser, createErrorResponse, createSuccessResponse } from "@/lib/auth-api";
import { hasPermission } from "@/lib/permissions";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    // Get authenticated user with permissions
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return createErrorResponse("Unauthorized", 401);
    }

    // Check read permission for reports
    if (!hasPermission(user, Resource.REPORTS, Action.READ)) {
      return createErrorResponse("Forbidden", 403);
    }

    // Determine territory scope
    let territoryFilter: any = {};
    let territoryName = 'All Territories';

    if (hasPermission(user, Resource.REPORTS, Action.VIEW_ALL)) {
      // Can see all territories
      territoryFilter = {};
      territoryName = 'Global';
    } else if (hasPermission(user, Resource.REPORTS, Action.VIEW_TEAM)) {
      // Can see their territory or managed territories
      if (user.role === 'MANAGER' && user.managedTerritories && user.managedTerritories.length > 0) {
        const managedTerritoryIds = user.managedTerritories.map(t => t.id);
        territoryFilter = {
          bdr: {
            territoryId: { in: managedTerritoryIds }
          }
        };
        
        // Get territory names
        const territories = await prisma.territory.findMany({
          where: { id: { in: managedTerritoryIds } },
          select: { name: true }
        });
        territoryName = territories.map(t => t.name).join(', ');
      } else if (user.territoryId) {
        territoryFilter = {
          bdr: {
            territoryId: user.territoryId
          }
        };
        
        const territory = await prisma.territory.findUnique({
          where: { id: user.territoryId },
          select: { name: true }
        });
        territoryName = territory?.name || 'Unknown Territory';
      } else {
        // No territory - only their own data
        territoryFilter = {
          bdrId: user.id
        };
        territoryName = 'Personal';
      }
    } else {
      // Can only see their own data
      territoryFilter = {
        bdrId: user.id
      };
      territoryName = 'Personal';
    }

    // Get leads count
    const totalLeads = await prisma.lead.count({
      where: territoryFilter
    });

    // Get pipeline items count
    const totalPipeline = await prisma.pipelineItem.count({
      where: territoryFilter
    });

    // Calculate conversion rate (pipeline items with leads / total leads)
    const pipelineWithLeads = await prisma.pipelineItem.count({
      where: {
        ...territoryFilter,
        leadId: { not: null }
      }
    });

    const conversionRate = totalLeads > 0 ? Math.round((pipelineWithLeads / totalLeads) * 100) : 0;

    // Get recent activity count
    const recentActivityCount = await prisma.activityLog.count({
      where: {
        ...territoryFilter,
        timestamp: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
        }
      }
    });

    // Get top performers (if user has team visibility)
    let topPerformers: any[] = [];
    if (hasPermission(user, Resource.USERS, Action.VIEW_TEAM)) {
      const performanceData = await prisma.user.findMany({
        where: {
          isActive: true,
          ...(user.role === 'MANAGER' && user.managedTerritories 
            ? { territoryId: { in: user.managedTerritories.map(t => t.id) } }
            : user.territoryId 
            ? { territoryId: user.territoryId }
            : { id: user.id })
        },
        include: {
          _count: {
            select: {
              leads: true,
              pipelineItems: true
            }
          }
        },
        orderBy: {
          leads: {
            _count: 'desc'
          }
        },
        take: 5
      });

      topPerformers = performanceData.map(performer => ({
        id: performer.id,
        name: performer.name,
        email: performer.email,
        role: performer.role,
        leadCount: performer._count.leads,
        pipelineCount: performer._count.pipelineItems
      }));
    }

    return createSuccessResponse({
      territoryName,
      totalLeads,
      totalPipeline,
      conversionRate,
      recentActivityCount,
      topPerformers
    });

  } catch (error: any) {
    console.error("Error fetching team stats:", error);
    return createErrorResponse(error.message || "Failed to fetch team stats", 500);
  }
}