import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from './auth-options';
import { prisma } from './db';
import { hasPermission, canViewUserData, getDataAccessFilter, UserWithPermissions, Permission } from './permissions';
import { Resource, Action, Role } from '@prisma/client';

export interface AuthenticatedUser extends UserWithPermissions {
  email: string;
  name?: string | null;
  isActive: boolean;
}

// Get authenticated user with permissions from session
export async function getAuthenticatedUser(request?: NextRequest): Promise<AuthenticatedUser | null> {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.email) {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: {
      permissions: {
        include: {
          permission: true
        }
      },
      managedTerritories: {
        select: { id: true }
      }
    }
  });

  if (!user || !user.isActive) {
    return null;
  }

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    territoryId: user.territoryId,
    isActive: user.isActive,
    permissions: user.permissions,
    managedTerritories: user.managedTerritories,
  };
}

// Middleware-style permission checker for API routes
export function requirePermission(resource: Resource, action: Action) {
  return async (request: NextRequest, handler: (user: AuthenticatedUser, request: NextRequest) => Promise<Response>) => {
    const user = await getAuthenticatedUser(request);
    
    if (!user) {
      return new Response('Unauthorized', { status: 401 });
    }

    if (!hasPermission(user, resource, action)) {
      return new Response('Forbidden', { status: 403 });
    }

    return handler(user, request);
  };
}

// Check if user can access specific data (by owner)
export async function canAccessData(
  user: AuthenticatedUser,
  resource: Resource,
  action: Action,
  dataOwnerId: string,
  dataOwnerTerritoryId?: string | null
): Promise<boolean> {
  // Check basic permission first
  if (!hasPermission(user, resource, action)) {
    return false;
  }

  // If user has VIEW_ALL permission, they can access any data
  if (hasPermission(user, resource, Action.VIEW_ALL)) {
    return true;
  }

  // Check if user can view this specific user's data
  return canViewUserData(user, dataOwnerId, dataOwnerTerritoryId);
}

// Get Prisma filter for data access based on user permissions
export function getDataFilter(user: AuthenticatedUser, resource: Resource) {
  return getDataAccessFilter(user, resource);
}

// Role-based route protection
export function requireRole(...allowedRoles: Role[]) {
  return async (request: NextRequest, handler: (user: AuthenticatedUser, request: NextRequest) => Promise<Response>) => {
    const user = await getAuthenticatedUser(request);
    
    if (!user) {
      return new Response('Unauthorized', { status: 401 });
    }

    if (!allowedRoles.includes(user.role)) {
      return new Response('Forbidden', { status: 403 });
    }

    return handler(user, request);
  };
}

// Check if user is admin
export function isAdmin(user: AuthenticatedUser): boolean {
  return user.role === Role.ADMIN;
}

// Check if user is manager or above
export function isManagerOrAbove(user: AuthenticatedUser): boolean {
  return [Role.ADMIN, Role.DIRECTOR, Role.MANAGER].includes(user.role);
}

// Check if user is team lead or above
export function isTeamLeadOrAbove(user: AuthenticatedUser): boolean {
  return [Role.ADMIN, Role.DIRECTOR, Role.MANAGER, Role.TEAM_LEAD].includes(user.role);
}

// Utility to create JSON error responses
export function createErrorResponse(message: string, status: number): Response {
  return new Response(
    JSON.stringify({ error: message }),
    { 
      status,
      headers: { 'Content-Type': 'application/json' }
    }
  );
}

// Utility to create JSON success responses
export function createSuccessResponse(data: any, status: number = 200): Response {
  return new Response(
    JSON.stringify(data),
    { 
      status,
      headers: { 'Content-Type': 'application/json' }
    }
  );
}