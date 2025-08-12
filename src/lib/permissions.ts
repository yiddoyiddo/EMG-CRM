import { Role, Resource, Action } from '@prisma/client';

// Permission checking utilities
export interface Permission {
  resource: Resource;
  action: Action;
}

export interface UserWithPermissions {
  id: string;
  role: Role;
  territoryId?: string | null;
  permissions?: Array<{ permission: Permission }>;
  managedTerritories?: Array<{ id: string }>;
}

// Default role-based permissions
const DEFAULT_ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  ADMIN: [
    // Full access to everything
    { resource: Resource.LEADS, action: Action.CREATE },
    { resource: Resource.LEADS, action: Action.READ },
    { resource: Resource.LEADS, action: Action.UPDATE },
    { resource: Resource.LEADS, action: Action.DELETE },
    { resource: Resource.LEADS, action: Action.VIEW_ALL },
    { resource: Resource.LEADS, action: Action.EXPORT },
    
    { resource: Resource.PIPELINE, action: Action.CREATE },
    { resource: Resource.PIPELINE, action: Action.READ },
    { resource: Resource.PIPELINE, action: Action.UPDATE },
    { resource: Resource.PIPELINE, action: Action.DELETE },
    { resource: Resource.PIPELINE, action: Action.VIEW_ALL },
    { resource: Resource.PIPELINE, action: Action.EXPORT },
    
    { resource: Resource.FINANCE, action: Action.CREATE },
    { resource: Resource.FINANCE, action: Action.READ },
    { resource: Resource.FINANCE, action: Action.UPDATE },
    { resource: Resource.FINANCE, action: Action.DELETE },
    { resource: Resource.FINANCE, action: Action.VIEW_ALL },
    { resource: Resource.FINANCE, action: Action.EXPORT },
    
    { resource: Resource.USERS, action: Action.CREATE },
    { resource: Resource.USERS, action: Action.READ },
    { resource: Resource.USERS, action: Action.UPDATE },
    { resource: Resource.USERS, action: Action.DELETE },
    { resource: Resource.USERS, action: Action.MANAGE },
    { resource: Resource.USERS, action: Action.VIEW_ALL },
    
    { resource: Resource.REPORTS, action: Action.READ },
    { resource: Resource.REPORTS, action: Action.VIEW_ALL },
    { resource: Resource.REPORTS, action: Action.EXPORT },
    
    { resource: Resource.SETTINGS, action: Action.READ },
    { resource: Resource.SETTINGS, action: Action.UPDATE },
    { resource: Resource.SETTINGS, action: Action.MANAGE },
    
    { resource: Resource.ACTIVITY_LOGS, action: Action.READ },
    { resource: Resource.ACTIVITY_LOGS, action: Action.VIEW_ALL },
    
    { resource: Resource.DUPLICATES, action: Action.READ },
    { resource: Resource.DUPLICATES, action: Action.MANAGE },
    { resource: Resource.DUPLICATES, action: Action.VIEW_ALL },

    // Messaging
    { resource: Resource.MESSAGING, action: Action.READ },
    { resource: Resource.MESSAGING, action: Action.CREATE },
    { resource: Resource.MESSAGING, action: Action.UPDATE },
    { resource: Resource.MESSAGING, action: Action.DELETE },
  ],

  DIRECTOR: [
    // Similar to admin but no user management
    { resource: Resource.LEADS, action: Action.CREATE },
    { resource: Resource.LEADS, action: Action.READ },
    { resource: Resource.LEADS, action: Action.UPDATE },
    { resource: Resource.LEADS, action: Action.DELETE },
    { resource: Resource.LEADS, action: Action.VIEW_ALL },
    { resource: Resource.LEADS, action: Action.EXPORT },
    
    { resource: Resource.PIPELINE, action: Action.CREATE },
    { resource: Resource.PIPELINE, action: Action.READ },
    { resource: Resource.PIPELINE, action: Action.UPDATE },
    { resource: Resource.PIPELINE, action: Action.DELETE },
    { resource: Resource.PIPELINE, action: Action.VIEW_ALL },
    { resource: Resource.PIPELINE, action: Action.EXPORT },
    
    { resource: Resource.FINANCE, action: Action.READ },
    { resource: Resource.FINANCE, action: Action.VIEW_ALL },
    { resource: Resource.FINANCE, action: Action.EXPORT },
    
    { resource: Resource.USERS, action: Action.READ },
    { resource: Resource.USERS, action: Action.VIEW_ALL },
    
    { resource: Resource.REPORTS, action: Action.READ },
    { resource: Resource.REPORTS, action: Action.VIEW_ALL },
    { resource: Resource.REPORTS, action: Action.EXPORT },
    
    { resource: Resource.ACTIVITY_LOGS, action: Action.READ },
    { resource: Resource.ACTIVITY_LOGS, action: Action.VIEW_ALL },
    
    { resource: Resource.DUPLICATES, action: Action.READ },
    { resource: Resource.DUPLICATES, action: Action.VIEW_ALL },

    // Messaging
    { resource: Resource.MESSAGING, action: Action.READ },
    { resource: Resource.MESSAGING, action: Action.CREATE },
  ],

  MANAGER: [
    // Territory-based management
    { resource: Resource.LEADS, action: Action.CREATE },
    { resource: Resource.LEADS, action: Action.READ },
    { resource: Resource.LEADS, action: Action.UPDATE },
    { resource: Resource.LEADS, action: Action.DELETE },
    { resource: Resource.LEADS, action: Action.VIEW_TEAM },
    { resource: Resource.LEADS, action: Action.EXPORT },
    
    { resource: Resource.PIPELINE, action: Action.CREATE },
    { resource: Resource.PIPELINE, action: Action.READ },
    { resource: Resource.PIPELINE, action: Action.UPDATE },
    { resource: Resource.PIPELINE, action: Action.DELETE },
    { resource: Resource.PIPELINE, action: Action.VIEW_TEAM },
    { resource: Resource.PIPELINE, action: Action.EXPORT },
    
    { resource: Resource.FINANCE, action: Action.READ },
    { resource: Resource.FINANCE, action: Action.VIEW_TEAM },
    
    { resource: Resource.USERS, action: Action.READ },
    { resource: Resource.USERS, action: Action.VIEW_TEAM },
    
    { resource: Resource.REPORTS, action: Action.READ },
    { resource: Resource.REPORTS, action: Action.VIEW_TEAM },
    
    { resource: Resource.ACTIVITY_LOGS, action: Action.READ },
    { resource: Resource.ACTIVITY_LOGS, action: Action.VIEW_TEAM },
    
    { resource: Resource.DUPLICATES, action: Action.READ },
    { resource: Resource.DUPLICATES, action: Action.VIEW_TEAM },

    // Messaging
    { resource: Resource.MESSAGING, action: Action.READ },
    { resource: Resource.MESSAGING, action: Action.CREATE },
  ],

  TEAM_LEAD: [
    // Team visibility with limited management
    { resource: Resource.LEADS, action: Action.CREATE },
    { resource: Resource.LEADS, action: Action.READ },
    { resource: Resource.LEADS, action: Action.UPDATE },
    { resource: Resource.LEADS, action: Action.VIEW_TEAM },
    
    { resource: Resource.PIPELINE, action: Action.CREATE },
    { resource: Resource.PIPELINE, action: Action.READ },
    { resource: Resource.PIPELINE, action: Action.UPDATE },
    { resource: Resource.PIPELINE, action: Action.VIEW_TEAM },
    
    { resource: Resource.FINANCE, action: Action.READ },
    
    { resource: Resource.USERS, action: Action.READ },
    
    { resource: Resource.REPORTS, action: Action.READ },
    { resource: Resource.REPORTS, action: Action.VIEW_TEAM },
    
    { resource: Resource.ACTIVITY_LOGS, action: Action.READ },
    { resource: Resource.ACTIVITY_LOGS, action: Action.VIEW_TEAM },
    
    { resource: Resource.DUPLICATES, action: Action.READ },

    // Messaging
    { resource: Resource.MESSAGING, action: Action.READ },
    { resource: Resource.MESSAGING, action: Action.CREATE },
  ],

  BDR: [
    // Own data only
    { resource: Resource.LEADS, action: Action.CREATE },
    { resource: Resource.LEADS, action: Action.READ },
    { resource: Resource.LEADS, action: Action.UPDATE },
    { resource: Resource.LEADS, action: Action.DELETE },
    
    { resource: Resource.PIPELINE, action: Action.CREATE },
    { resource: Resource.PIPELINE, action: Action.READ },
    { resource: Resource.PIPELINE, action: Action.UPDATE },
    { resource: Resource.PIPELINE, action: Action.DELETE },
    
    { resource: Resource.FINANCE, action: Action.READ },
    
    { resource: Resource.ACTIVITY_LOGS, action: Action.CREATE },
    { resource: Resource.ACTIVITY_LOGS, action: Action.READ },
    
    { resource: Resource.DUPLICATES, action: Action.READ },

    // Messaging
    { resource: Resource.MESSAGING, action: Action.READ },
    { resource: Resource.MESSAGING, action: Action.CREATE },
  ],
};

// Check if user has a specific permission
export function hasPermission(
  user: UserWithPermissions,
  resource: Resource,
  action: Action
): boolean {
  // Check explicit user permissions first
  if (user.permissions) {
    const hasExplicitPermission = user.permissions.some(
      (up) => up.permission.resource === resource && up.permission.action === action
    );
    if (hasExplicitPermission) return true;
  }

  // Fall back to role-based permissions
  const rolePermissions = DEFAULT_ROLE_PERMISSIONS[user.role] || [];
  return rolePermissions.some(
    (permission) => permission.resource === resource && permission.action === action
  );
}

// Check if user can view data from another user (for team leads, managers, etc.)
export function canViewUserData(
  currentUser: UserWithPermissions,
  targetUserId: string,
  targetUserTerritoryId?: string | null
): boolean {
  // Users can always view their own data
  if (currentUser.id === targetUserId) return true;

  // Admins and directors can view all data
  if (currentUser.role === Role.ADMIN || currentUser.role === Role.DIRECTOR) {
    return true;
  }

  // Managers can view data from their managed territories
  if (currentUser.role === Role.MANAGER && currentUser.managedTerritories) {
    const managesTargetTerritory = currentUser.managedTerritories.some(
      (territory) => territory.id === targetUserTerritoryId
    );
    if (managesTargetTerritory) return true;
  }

  // Team leads can view data from users in the same territory
  if (
    (currentUser.role === Role.TEAM_LEAD || currentUser.role === Role.MANAGER) &&
    currentUser.territoryId &&
    currentUser.territoryId === targetUserTerritoryId
  ) {
    return true;
  }

  return false;
}

// Get effective permissions for a user
export function getEffectivePermissions(user: UserWithPermissions): Permission[] {
  const rolePermissions = DEFAULT_ROLE_PERMISSIONS[user.role] || [];
  const userPermissions = user.permissions?.map((up) => up.permission) || [];
  
  // Combine and deduplicate permissions
  const allPermissions = [...rolePermissions, ...userPermissions];
  const uniquePermissions = allPermissions.filter((permission, index, self) => 
    index === self.findIndex((p) => 
      p.resource === permission.resource && p.action === permission.action
    )
  );

  return uniquePermissions;
}

// Filter data based on user permissions and territory
export function getDataAccessFilter(
  user: UserWithPermissions,
  resource: Resource
) {
  // Admin and director can access all data
  if (user.role === Role.ADMIN || user.role === Role.DIRECTOR) {
    return {}; // No filter - access all
  }

  // Check if user has VIEW_ALL permission for this resource
  if (hasPermission(user, resource, Action.VIEW_ALL)) {
    return {};
  }

  // Check if user has VIEW_TEAM permission
  if (hasPermission(user, resource, Action.VIEW_TEAM)) {
    const filters: any = {};
    
    // Managers can see data from their managed territories
    if (user.role === Role.MANAGER && user.managedTerritories) {
      const managedTerritoryIds = user.managedTerritories.map(t => t.id);
      if (managedTerritoryIds.length > 0) {
        filters.OR = [
          { bdr: { territoryId: { in: managedTerritoryIds } } },
          { bdrId: user.id } // Plus their own data
        ];
      }
    }
    // Team leads and others can see data from their territory
    else if (user.territoryId) {
      filters.OR = [
        { bdr: { territoryId: user.territoryId } },
        { bdrId: user.id } // Plus their own data
      ];
    }
    
    return filters;
  }

  // Default: only own data
  return { bdrId: user.id };
}

// Permission constants for easy reference
export const PERMISSIONS = {
  LEADS: {
    CREATE: { resource: Resource.LEADS, action: Action.CREATE },
    READ: { resource: Resource.LEADS, action: Action.READ },
    UPDATE: { resource: Resource.LEADS, action: Action.UPDATE },
    DELETE: { resource: Resource.LEADS, action: Action.DELETE },
    VIEW_ALL: { resource: Resource.LEADS, action: Action.VIEW_ALL },
    VIEW_TEAM: { resource: Resource.LEADS, action: Action.VIEW_TEAM },
    EXPORT: { resource: Resource.LEADS, action: Action.EXPORT },
  },
  PIPELINE: {
    CREATE: { resource: Resource.PIPELINE, action: Action.CREATE },
    READ: { resource: Resource.PIPELINE, action: Action.READ },
    UPDATE: { resource: Resource.PIPELINE, action: Action.UPDATE },
    DELETE: { resource: Resource.PIPELINE, action: Action.DELETE },
    VIEW_ALL: { resource: Resource.PIPELINE, action: Action.VIEW_ALL },
    VIEW_TEAM: { resource: Resource.PIPELINE, action: Action.VIEW_TEAM },
    EXPORT: { resource: Resource.PIPELINE, action: Action.EXPORT },
  },
  FINANCE: {
    CREATE: { resource: Resource.FINANCE, action: Action.CREATE },
    READ: { resource: Resource.FINANCE, action: Action.READ },
    UPDATE: { resource: Resource.FINANCE, action: Action.UPDATE },
    DELETE: { resource: Resource.FINANCE, action: Action.DELETE },
    VIEW_ALL: { resource: Resource.FINANCE, action: Action.VIEW_ALL },
    VIEW_TEAM: { resource: Resource.FINANCE, action: Action.VIEW_TEAM },
    EXPORT: { resource: Resource.FINANCE, action: Action.EXPORT },
  },
  USERS: {
    CREATE: { resource: Resource.USERS, action: Action.CREATE },
    READ: { resource: Resource.USERS, action: Action.READ },
    UPDATE: { resource: Resource.USERS, action: Action.UPDATE },
    DELETE: { resource: Resource.USERS, action: Action.DELETE },
    MANAGE: { resource: Resource.USERS, action: Action.MANAGE },
    VIEW_ALL: { resource: Resource.USERS, action: Action.VIEW_ALL },
    VIEW_TEAM: { resource: Resource.USERS, action: Action.VIEW_TEAM },
  },
  REPORTS: {
    READ: { resource: Resource.REPORTS, action: Action.READ },
    VIEW_ALL: { resource: Resource.REPORTS, action: Action.VIEW_ALL },
    VIEW_TEAM: { resource: Resource.REPORTS, action: Action.VIEW_TEAM },
    EXPORT: { resource: Resource.REPORTS, action: Action.EXPORT },
  },
  SETTINGS: {
    READ: { resource: Resource.SETTINGS, action: Action.READ },
    UPDATE: { resource: Resource.SETTINGS, action: Action.UPDATE },
    MANAGE: { resource: Resource.SETTINGS, action: Action.MANAGE },
  },
  ACTIVITY_LOGS: {
    CREATE: { resource: Resource.ACTIVITY_LOGS, action: Action.CREATE },
    READ: { resource: Resource.ACTIVITY_LOGS, action: Action.READ },
    VIEW_ALL: { resource: Resource.ACTIVITY_LOGS, action: Action.VIEW_ALL },
    VIEW_TEAM: { resource: Resource.ACTIVITY_LOGS, action: Action.VIEW_TEAM },
  },
  DUPLICATES: {
    READ: { resource: Resource.DUPLICATES, action: Action.READ },
    MANAGE: { resource: Resource.DUPLICATES, action: Action.MANAGE },
    VIEW_ALL: { resource: Resource.DUPLICATES, action: Action.VIEW_ALL },
    VIEW_TEAM: { resource: Resource.DUPLICATES, action: Action.VIEW_TEAM },
  },
} as const;