'use client';

import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
// Tabs components removed - not used in current implementation
import { Separator } from '@/components/ui/separator';
import { useState, useEffect } from 'react';
import { Shield, User, Users, Crown, Settings, Save, RotateCcw, Info } from 'lucide-react';
import { toast } from 'sonner';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface Permission {
  id: string;
  name: string;
  resource: string;
  action: string;
  description?: string;
}

interface RolePermissionsData {
  rolePermissions: Record<string, Permission[]>;
  availablePermissions: Permission[];
}

const ROLES = [
  { key: 'BDR', name: 'BDR', icon: User, description: 'Business Development Representatives - front-line sales staff' },
  { key: 'TEAM_LEAD', name: 'Team Lead', icon: Users, description: 'Team leaders who manage small groups of BDRs' },
  { key: 'MANAGER', name: 'Manager', icon: Shield, description: 'Managers who oversee territories and multiple teams' },
  { key: 'DIRECTOR', name: 'Director', icon: Crown, description: 'Directors with broad organizational oversight' },
];

const RESOURCE_GROUPS = {
  'Core Operations': ['LEADS', 'PIPELINE', 'FINANCE'],
  'Administration': ['USERS', 'SETTINGS', 'ACTIVITY_LOGS'],
  'Reporting & Analytics': ['REPORTS', 'DUPLICATES'],
  'Communication': ['MESSAGING', 'TEMPLATES'],
};

const ACTION_DESCRIPTIONS = {
  CREATE: 'Create new records',
  READ: 'View and access records',
  UPDATE: 'Edit and modify records', 
  DELETE: 'Remove records',
  VIEW_ALL: 'See all data across organization',
  VIEW_TEAM: 'See team/territory data',
  EXPORT: 'Export data to external formats',
  MANAGE: 'Full administrative control',
};

async function fetchRolePermissions(): Promise<RolePermissionsData> {
  const res = await fetch('/api/admin/roles/permissions');
  if (!res.ok) throw new Error('Failed to fetch role permissions');
  return res.json();
}

async function updateRolePermissions(role: string, permissionIds: string[]): Promise<void> {
  const res = await fetch('/api/admin/roles/permissions', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ role, permissionIds }),
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Failed to update role permissions');
  }
}

export default function RolePermissionsAdmin() {
  const queryClient = useQueryClient();
  const [selectedRole, setSelectedRole] = useState('BDR');
  const [localPermissions, setLocalPermissions] = useState<Record<string, string[]>>({});
  const [hasChanges, setHasChanges] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['rolePermissions'],
    queryFn: fetchRolePermissions,
  });

  const updateMutation = useMutation({
    mutationFn: ({ role, permissionIds }: { role: string; permissionIds: string[] }) => 
      updateRolePermissions(role, permissionIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rolePermissions'] });
      setHasChanges(false);
      toast.success('Role permissions updated successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Initialize local permissions when data loads
  useEffect(() => {
    if (data) {
      const initial: Record<string, string[]> = {};
      ROLES.forEach(role => {
        initial[role.key] = (data.rolePermissions[role.key] || []).map((p: Permission) => p.id);
      });
      setLocalPermissions(initial);
    }
  }, [data]);

  // Check for changes
  useEffect(() => {
    if (data && Object.keys(localPermissions).length > 0) {
      const hasAnyChanges = ROLES.some(role => {
        const current = (data.rolePermissions[role.key] || []).map((p: Permission) => p.id).sort();
        const local = (localPermissions[role.key] || []).sort();
        return JSON.stringify(current) !== JSON.stringify(local);
      });
      setHasChanges(hasAnyChanges);
    }
  }, [data, localPermissions]);

  const handlePermissionToggle = (role: string, permissionId: string, checked: boolean) => {
    setLocalPermissions(prev => {
      const current = prev[role] || [];
      const updated = checked 
        ? [...current, permissionId]
        : current.filter(id => id !== permissionId);
      
      return { ...prev, [role]: updated };
    });
  };

  const handleSaveRole = (role: string) => {
    const permissionIds = localPermissions[role] || [];
    updateMutation.mutate({ role, permissionIds });
  };

  const handleResetRole = (role: string) => {
    if (data) {
      setLocalPermissions(prev => ({
        ...prev,
        [role]: (data.rolePermissions[role] || []).map((p: Permission) => p.id)
      }));
    }
  };

  const getPermissionsByGroup = (permissions: Permission[]) => {
    const grouped: Record<string, Permission[]> = {};
    
    Object.entries(RESOURCE_GROUPS).forEach(([groupName, resources]) => {
      grouped[groupName] = permissions.filter(p => resources.includes(p.resource));
    });

    return grouped;
  };

  if (isLoading) {
    return <div className="p-6">Loading role permissions...</div>;
  }

  if (!data) {
    return <div className="p-6">Failed to load role permissions.</div>;
  }

  const currentRole = ROLES.find(r => r.key === selectedRole);
  const rolePermissionIds = localPermissions[selectedRole] || [];
  const groupedPermissions = getPermissionsByGroup(data.availablePermissions);

  return (
    <div className="p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Role-Based Permissions Management
          </CardTitle>
          <p className="text-sm text-gray-600">
            Configure default permissions for each role. These apply globally to all users with that role.
          </p>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Role Selection Sidebar */}
            <div className="lg:w-64 space-y-2">
              <h3 className="font-medium text-sm text-gray-700 mb-3">Select Role</h3>
              {ROLES.map((role) => {
                const Icon = role.icon;
                const hasLocalChanges = data && localPermissions[role.key] && 
                  JSON.stringify((data.rolePermissions[role.key] || []).map((p: Permission) => p.id).sort()) !== 
                  JSON.stringify((localPermissions[role.key] || []).sort());
                
                return (
                  <div key={role.key} className="relative">
                    <Button
                      variant={selectedRole === role.key ? 'default' : 'outline'}
                      className="w-full justify-start gap-2 h-auto p-3"
                      onClick={() => setSelectedRole(role.key)}
                    >
                      <Icon className="h-4 w-4" />
                      <div className="text-left">
                        <div className="font-medium">{role.name}</div>
                        <div className="text-xs opacity-70 line-clamp-1">
                          {role.description}
                        </div>
                      </div>
                    </Button>
                    {hasLocalChanges && (
                      <div className="absolute -top-1 -right-1 w-3 h-3 bg-orange-500 rounded-full"></div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Permissions Configuration */}
            <div className="flex-1">
              {currentRole && (
                <div className="space-y-6">
                  {/* Role Header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {React.createElement(currentRole.icon, { className: "h-6 w-6" })}
                      <div>
                        <h2 className="text-xl font-semibold">{currentRole.name} Permissions</h2>
                        <p className="text-sm text-gray-600">{currentRole.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleResetRole(selectedRole)}
                        disabled={!hasChanges}
                      >
                        <RotateCcw className="h-4 w-4 mr-1" />
                        Reset
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleSaveRole(selectedRole)}
                        disabled={!hasChanges || updateMutation.isPending}
                      >
                        <Save className="h-4 w-4 mr-1" />
                        {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
                      </Button>
                    </div>
                  </div>

                  {hasChanges && (
                    <Alert>
                      <Info className="h-4 w-4" />
                      <AlertDescription>
                        You have unsaved changes. Click &quot;Save Changes&quot; to apply them.
                      </AlertDescription>
                    </Alert>
                  )}

                  {/* Permission Groups */}
                  <div className="space-y-6">
                    {Object.entries(groupedPermissions).map(([groupName, permissions]) => (
                      <Card key={groupName}>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-lg">{groupName}</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="grid gap-4">
                            {permissions.length === 0 ? (
                              <p className="text-sm text-gray-500 italic">No permissions in this category</p>
                            ) : (
                              Object.entries(
                                permissions
                                  .sort((a, b) => a.resource.localeCompare(b.resource) || a.action.localeCompare(b.action))
                                  .reduce((acc, permission) => {
                                    if (!acc[permission.resource]) {
                                      acc[permission.resource] = [];
                                    }
                                    acc[permission.resource].push(permission);
                                    return acc;
                                  }, {} as Record<string, Permission[]>)
                              ).map(([resource, resourcePermissions]) => (
                                <div key={resource}>
                                  <h4 className="font-medium text-sm text-gray-700 mb-2">{resource}</h4>
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 ml-4">
                                    {resourcePermissions.map((permission) => (
                                      <div key={permission.id} className="flex items-center space-x-2">
                                        <Checkbox
                                          id={permission.id}
                                          checked={rolePermissionIds.includes(permission.id)}
                                          onCheckedChange={(checked) =>
                                            handlePermissionToggle(selectedRole, permission.id, !!checked)
                                          }
                                        />
                                        <label
                                          htmlFor={permission.id}
                                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                                        >
                                          <div className="flex items-center gap-2">
                                            <Badge variant="outline" className="text-xs">
                                              {permission.action}
                                            </Badge>
                                            <span className="text-xs text-gray-600">
                                              {ACTION_DESCRIPTIONS[permission.action as keyof typeof ACTION_DESCRIPTIONS] || permission.action}
                                            </span>
                                          </div>
                                        </label>
                                      </div>
                                    ))}
                                  </div>
                                  {resourcePermissions.length > 0 && <Separator className="mt-3" />}
                                </div>
                              ))
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}