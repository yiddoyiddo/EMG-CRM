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

    const { searchParams } = new URL(req.url);
    const includeStats = searchParams.get('includeStats') === 'true';
    const q = (searchParams.get('search') || '').trim();
    const forMessaging = q.length > 0;

    // Allow minimal user search when used for messaging, even if the role
    // doesn't have full USERS:READ permission.
    if (!hasPermission(user, Resource.USERS, Action.READ)) {
      if (!(forMessaging && hasPermission(user, Resource.MESSAGING, Action.READ))) {
        return createErrorResponse("Forbidden", 403);
      }
    }

    // Determine what users the current user can see
    let userFilter: any = {};

    if (hasPermission(user, Resource.USERS, Action.READ)) {
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
    } else if (forMessaging && hasPermission(user, Resource.MESSAGING, Action.READ)) {
      // For chat user search, allow searching active users across org
      userFilter = {};
    }

    const users = await prisma.user.findMany({
      where: {
        ...userFilter,
        isActive: true,
        ...(q
          ? {
              OR: [
                { name: { contains: q, mode: 'insensitive' } },
                { email: { contains: q, mode: 'insensitive' } },
              ],
            }
          : {}),
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

    const payload = users.map(user => ({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        territory: user.territory,
        lastLoginAt: user.lastLoginAt,
        createdAt: user.createdAt,
        ...(includeStats && { _count: user._count })
      }));

    // If request is clearly for messaging search (has search query), return a flat users array
    if ((searchParams.get('search') || '').trim()) {
      return createSuccessResponse({ users: payload });
    }
    // Back-compat default shape
    return createSuccessResponse({ data: { users: payload } });

  } catch (error: any) {
    console.error("Error fetching users:", error);
    return createErrorResponse(error.message || "Failed to fetch users", 500);
  }
}