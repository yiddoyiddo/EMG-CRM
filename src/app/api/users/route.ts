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

    // Check read permission for users
    if (!hasPermission(user, Resource.USERS, Action.READ)) {
      return createErrorResponse("Forbidden", 403);
    }

    const { searchParams } = new URL(req.url);
    const includeStats = searchParams.get('includeStats') === 'true';

    // Determine what users the current user can see
    let userFilter: any = {};

    if (hasPermission(user, Resource.USERS, Action.VIEW_ALL)) {
      // Can see all users
      userFilter = {};
    } else if (hasPermission(user, Resource.USERS, Action.VIEW_TEAM)) {
      // Can see users in their territory or managed territories
      if (user.role === 'MANAGER' && user.managedTerritories && user.managedTerritories.length > 0) {
        const managedTerritoryIds = user.managedTerritories.map(t => t.id);
        userFilter = {
          OR: [
            { territoryId: { in: managedTerritoryIds } },
            { id: user.id } // Plus themselves
          ]
        };
      } else if (user.territoryId) {
        userFilter = {
          OR: [
            { territoryId: user.territoryId },
            { id: user.id } // Plus themselves
          ]
        };
      } else {
        // If no territory, can only see themselves
        userFilter = { id: user.id };
      }
    } else {
      // Can only see themselves
      userFilter = { id: user.id };
    }

    const users = await prisma.user.findMany({
      where: {
        ...userFilter,
        isActive: true
      },
      include: {
        territory: {
          select: {
            id: true,
            name: true
          }
        },
        ...(includeStats && {
          _count: {
            select: {
              leads: true,
              pipelineItems: true,
              activityLogs: true
            }
          }
        })
      },
      orderBy: [
        { role: 'asc' },
        { name: 'asc' }
      ]
    });

    return createSuccessResponse({
      users: users.map(user => ({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        territory: user.territory,
        lastLoginAt: user.lastLoginAt,
        createdAt: user.createdAt,
        ...(includeStats && { _count: user._count })
      }))
    });

  } catch (error: any) {
    console.error("Error fetching users:", error);
    return createErrorResponse(error.message || "Failed to fetch users", 500);
  }
}