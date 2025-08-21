'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useState } from 'react';
import { format } from 'date-fns';
import { UserPlus, Edit, Trash2, Shield, User as UserIcon, KeyRound, Settings } from 'lucide-react';
import { toast } from 'sonner';
async function fetchTerritories(): Promise<{ id: string; name: string }[]> {
  const res = await fetch('/api/territories');
  if (!res.ok) return [];
  const data = await res.json();
  return data?.territories ?? [];
}

interface User {
  id: string;
  name: string | null;
  email: string;
  role: 'ADMIN' | 'DIRECTOR' | 'MANAGER' | 'TEAM_LEAD' | 'BDR';
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
  territory?: { id: string; name: string } | null;
  _count: {
    pipelineItems: number;
    leads: number;
    activityLogs: number;
  };
}

interface CreateUserForm {
  name: string;
  email: string;
  password: string;
  role: 'ADMIN' | 'DIRECTOR' | 'MANAGER' | 'TEAM_LEAD' | 'BDR';
  territoryId?: string | null;
}

interface UpdateUserForm {
  name?: string;
  email?: string;
  password?: string;
  role?: 'ADMIN' | 'DIRECTOR' | 'MANAGER' | 'TEAM_LEAD' | 'BDR';
  territoryId?: string | null;
}

interface UserPermission {
  id: string;
  resource: string;
  action: string;
  expiresAt: string | null;
  createdAt: string;
}


async function fetchUsers(): Promise<User[]> {
  const res = await fetch('/api/admin/users');
  if (!res.ok) throw new Error('Failed to fetch users');
  return res.json();
}

async function createUser(data: CreateUserForm): Promise<User> {
  const res = await fetch('/api/admin/users', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Failed to create user');
  }
  return res.json();
}

async function updateUser(id: string, data: UpdateUserForm): Promise<User> {
  const res = await fetch(`/api/admin/users/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Failed to update user');
  }
  return res.json();
}

async function deleteUser(id: string): Promise<void> {
  const res = await fetch(`/api/admin/users/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Failed to delete user');
  }
}

async function resetUserPassword(id: string, newPassword: string): Promise<void> {
  const res = await fetch(`/api/admin/users/${id}/reset-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ newPassword }),
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Failed to reset password');
  }
}

export default function UsersAdmin() {
  const queryClient = useQueryClient();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [resetPasswordDialogOpen, setResetPasswordDialogOpen] = useState(false);
  const [permissionsDialogOpen, setPermissionsDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [newPassword, setNewPassword] = useState('');
  
  const [createForm, setCreateForm] = useState<CreateUserForm>({
    name: '',
    email: '',
    password: '',
    role: 'BDR',
    territoryId: null,
  });
  
  const [editForm, setEditForm] = useState<UpdateUserForm>({});
  const [selectedUserForPermissions, setSelectedUserForPermissions] = useState<User | null>(null);
  const [newPermissionResource, setNewPermissionResource] = useState('');
  const [newPermissionAction, setNewPermissionAction] = useState('');
  const [newPermissionExpiry, setNewPermissionExpiry] = useState('');

  const { data: userPermissions = [], refetch: refetchPermissions } = useQuery({
    queryKey: ['userPermissions', selectedUserForPermissions?.id],
    queryFn: async () => {
      if (!selectedUserForPermissions) return { userPermissions: [], availablePermissions: [] };
      const res = await fetch(`/api/admin/users/${selectedUserForPermissions.id}/permissions`);
      if (!res.ok) throw new Error('Failed to fetch permissions');
      return res.json();
    },
    enabled: !!selectedUserForPermissions,
  });

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: fetchUsers,
  });
  const { data: territories = [] } = useQuery({
    queryKey: ['territories'],
    queryFn: fetchTerritories,
  });

  const createMutation = useMutation({
    mutationFn: createUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setCreateDialogOpen(false);
      setCreateForm({ name: '', email: '', password: '', role: 'BDR' });
      toast.success('User created successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateUserForm }) => updateUser(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setEditDialogOpen(false);
      setSelectedUser(null);
      setEditForm({});
      toast.success('User updated successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('User deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const resetPasswordMutation = useMutation({
    mutationFn: ({ id, newPassword }: { id: string; newPassword: string }) => resetUserPassword(id, newPassword),
    onSuccess: () => {
      setResetPasswordDialogOpen(false);
      setSelectedUser(null);
      setNewPassword('');
      toast.success('Password reset successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const addPermissionMutation = useMutation({
    mutationFn: async ({ userId, resource, action, expiresAt }: { userId: string; resource: string; action: string; expiresAt?: string }) => {
      const res = await fetch(`/api/admin/users/${userId}/permissions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resource, action, expiresAt }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to add permission');
      }
      return res.json();
    },
    onSuccess: () => {
      refetchPermissions();
      setNewPermissionResource('');
      setNewPermissionAction('');
      setNewPermissionExpiry('');
      toast.success('Permission added successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const removePermissionMutation = useMutation({
    mutationFn: async ({ userId, permissionId }: { userId: string; permissionId: string }) => {
      const res = await fetch(`/api/admin/users/${userId}/permissions?permissionId=${permissionId}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to remove permission');
      }
      return res.json();
    },
    onSuccess: () => {
      refetchPermissions();
      toast.success('Permission removed successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.name || !createForm.email || !createForm.password) {
      toast.error('Please fill in all required fields');
      return;
    }
    createMutation.mutate(createForm);
  };

  const handleEdit = (user: User) => {
    setSelectedUser(user);
    setEditForm({
      name: user.name || '',
      email: user.email,
      role: user.role,
      territoryId: user.territory?.id ?? null,
    });
    setEditDialogOpen(true);
  };

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    
    // Only send fields that have changed
    const updates: UpdateUserForm = {};
    if (editForm.name && editForm.name !== selectedUser.name) updates.name = editForm.name;
    if (editForm.email && editForm.email !== selectedUser.email) updates.email = editForm.email;
    if (editForm.password) updates.password = editForm.password;
    if (editForm.role && editForm.role !== selectedUser.role) updates.role = editForm.role;
    if (editForm.territoryId !== selectedUser.territory?.id) updates.territoryId = editForm.territoryId ?? null;
    
    if (Object.keys(updates).length === 0) {
      toast.info('No changes to save');
      return;
    }
    
    updateMutation.mutate({ id: selectedUser.id, data: updates });
  };

  const handleDelete = (user: User) => {
    const hasData = user._count.pipelineItems + user._count.leads + user._count.activityLogs > 0;
    
    if (hasData) {
      toast.error(`Cannot delete ${user.name}. They have associated data that must be reassigned first.`);
      return;
    }
    
    if (confirm(`Are you sure you want to delete ${user.name}? This action cannot be undone.`)) {
      deleteMutation.mutate(user.id);
    }
  };

  const handleResetPassword = (user: User) => {
    setSelectedUser(user);
    setNewPassword('');
    setResetPasswordDialogOpen(true);
  };

  const handlePasswordReset = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser || !newPassword) {
      toast.error('Please enter a new password');
      return;
    }
    
    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    
    resetPasswordMutation.mutate({ id: selectedUser.id, newPassword });
  };

  const handleManagePermissions = (user: User) => {
    setSelectedUserForPermissions(user);
    setPermissionsDialogOpen(true);
  };

  const handleAddPermission = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserForPermissions || !newPermissionResource || !newPermissionAction) {
      toast.error('Please select resource and action');
      return;
    }
    addPermissionMutation.mutate({
      userId: selectedUserForPermissions.id,
      resource: newPermissionResource,
      action: newPermissionAction,
      expiresAt: newPermissionExpiry || undefined,
    });
  };

  const handleRemovePermission = (permissionId: string) => {
    if (!selectedUserForPermissions) return;
    if (confirm('Are you sure you want to remove this permission?')) {
      removePermissionMutation.mutate({
        userId: selectedUserForPermissions.id,
        permissionId,
      });
    }
  };

  if (isLoading) {
    return <div className="p-6">Loading users...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <UserIcon className="h-5 w-5" />
            User Management
          </CardTitle>
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <UserPlus className="h-4 w-4 mr-2" />
                Add User
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New User</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreate} className="space-y-4">
                <div>
                  <Label htmlFor="create-name">Name</Label>
                  <Input
                    id="create-name"
                    value={createForm.name}
                    onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                    placeholder="Full name"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="create-email">Email</Label>
                  <Input
                    id="create-email"
                    type="email"
                    value={createForm.email}
                    onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                    placeholder="user@busenq.com"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="create-password">Password</Label>
                  <Input
                    id="create-password"
                    type="password"
                    value={createForm.password}
                    onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                    placeholder="Minimum 6 characters"
                    required
                  />
                </div>
                 <div>
                  <Label htmlFor="create-role">Role</Label>
                  <Select
                    value={createForm.role}
                     onValueChange={(value: 'ADMIN' | 'DIRECTOR' | 'MANAGER' | 'TEAM_LEAD' | 'BDR') => setCreateForm({ ...createForm, role: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="BDR">BDR</SelectItem>
                       <SelectItem value="TEAM_LEAD">Team Lead</SelectItem>
                       <SelectItem value="MANAGER">Manager</SelectItem>
                       <SelectItem value="DIRECTOR">Director</SelectItem>
                      <SelectItem value="ADMIN">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                 <div>
                   <Label htmlFor="create-territory">Territory (optional)</Label>
                   <Select
                     value={createForm.territoryId || 'none'}
                     onValueChange={(value) => setCreateForm({ ...createForm, territoryId: value === 'none' ? null : value })}
                   >
                     <SelectTrigger>
                       <SelectValue placeholder="Select a territory" />
                     </SelectTrigger>
                     <SelectContent>
                       <SelectItem value="none">None</SelectItem>
                       {territories.map(t => (
                         <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                       ))}
                     </SelectContent>
                   </Select>
                 </div>
                <Button type="submit" disabled={createMutation.isPending} className="w-full">
                  {createMutation.isPending ? 'Creating...' : 'Create User'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last Login</TableHead>
                <TableHead>Data Count</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.name || 'No name'}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    <Badge variant={user.role === 'ADMIN' ? 'default' : 'secondary'} className="gap-1">
                      {user.role === 'ADMIN' ? <Shield className="h-3 w-3" /> : <UserIcon className="h-3 w-3" />}
                      {user.role}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={user.isActive ? 'default' : 'destructive'}>
                      {user.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-gray-600">
                    {user.lastLoginAt 
                      ? format(new Date(user.lastLoginAt), 'MMM dd, yyyy HH:mm')
                      : 'Never logged in'
                    }
                  </TableCell>
                  <TableCell>
                    <div className="text-sm text-gray-600">
                      {user._count.pipelineItems} pipeline, {user._count.leads} leads, {user._count.activityLogs} logs
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEdit(user)}
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleResetPassword(user)}
                      >
                        <KeyRound className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleManagePermissions(user)}
                      >
                        <Settings className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDelete(user)}
                        disabled={user._count.pipelineItems + user._count.leads + user._count.activityLogs > 0}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Edit User Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User: {selectedUser?.name}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdate} className="space-y-4">
            <div>
              <Label htmlFor="edit-name">Name</Label>
              <Input
                id="edit-name"
                value={editForm.name || ''}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                placeholder="Full name"
              />
            </div>
            <div>
              <Label htmlFor="edit-email">Email</Label>
              <Input
                id="edit-email"
                type="email"
                value={editForm.email || ''}
                onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                placeholder="user@busenq.com"
              />
            </div>
            <div>
              <Label htmlFor="edit-password">New Password (leave blank to keep current)</Label>
              <Input
                id="edit-password"
                type="password"
                value={editForm.password || ''}
                onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                placeholder="New password"
              />
            </div>
              <div>
              <Label htmlFor="edit-role">Role</Label>
              <Select
                value={editForm.role || 'BDR'}
                onValueChange={(value: 'ADMIN' | 'DIRECTOR' | 'MANAGER' | 'TEAM_LEAD' | 'BDR') => setEditForm({ ...editForm, role: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="BDR">BDR</SelectItem>
                    <SelectItem value="TEAM_LEAD">Team Lead</SelectItem>
                    <SelectItem value="MANAGER">Manager</SelectItem>
                    <SelectItem value="DIRECTOR">Director</SelectItem>
                  <SelectItem value="ADMIN">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
              <div>
                <Label htmlFor="edit-territory">Territory (optional)</Label>
                <Select
                  value={editForm.territoryId || 'none'}
                  onValueChange={(value) => setEditForm({ ...editForm, territoryId: value === 'none' ? null : value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a territory" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {territories.map(t => (
                      <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            <Button type="submit" disabled={updateMutation.isPending} className="w-full">
              {updateMutation.isPending ? 'Updating...' : 'Update User'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Reset Password Dialog */}
      <Dialog open={resetPasswordDialogOpen} onOpenChange={setResetPasswordDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset Password: {selectedUser?.name}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handlePasswordReset} className="space-y-4">
            <div>
              <Label htmlFor="reset-password">New Password</Label>
              <Input
                id="reset-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password (min 6 characters)"
                required
              />
              <p className="text-sm text-muted-foreground mt-1">
                The user will need to use this new password to log in.
              </p>
            </div>
            <Button type="submit" disabled={resetPasswordMutation.isPending} className="w-full">
              <KeyRound className="h-4 w-4 mr-2" />
              {resetPasswordMutation.isPending ? 'Resetting...' : 'Reset Password'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Permissions Management Dialog */}
      <Dialog open={permissionsDialogOpen} onOpenChange={setPermissionsDialogOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Manage Permissions: {selectedUserForPermissions?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            {/* Current Permissions */}
            <div>
              <h3 className="font-medium mb-3">Current Permission Overrides</h3>
              {userPermissions.userPermissions?.length > 0 ? (
                <div className="space-y-2">
                  {userPermissions.userPermissions.map((permission: UserPermission) => (
                    <div key={permission.id} className="flex items-center justify-between p-3 border rounded">
                      <div>
                        <span className="font-medium">{permission.resource}</span>
                        <span className="mx-2">·</span>
                        <span className="text-gray-600">{permission.action}</span>
                        {permission.expiresAt && (
                          <span className="ml-2 text-sm text-orange-600">
                            Expires: {format(new Date(permission.expiresAt), 'MMM dd, yyyy')}
                          </span>
                        )}
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleRemovePermission(permission.id)}
                        disabled={removePermissionMutation.isPending}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-sm">No permission overrides. User has default role-based permissions only.</p>
              )}
            </div>

            {/* Add New Permission */}
            <div>
              <h3 className="font-medium mb-3">Add Permission Override</h3>
              <form onSubmit={handleAddPermission} className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="permission-resource">Resource</Label>
                    <Select value={newPermissionResource} onValueChange={setNewPermissionResource}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select resource" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="FINANCE">Finance</SelectItem>
                        <SelectItem value="LEADS">Leads</SelectItem>
                        <SelectItem value="PIPELINE">Pipeline</SelectItem>
                        <SelectItem value="USERS">Users</SelectItem>
                        <SelectItem value="REPORTS">Reports</SelectItem>
                        <SelectItem value="SETTINGS">Settings</SelectItem>
                        <SelectItem value="ACTIVITY_LOGS">Activity Logs</SelectItem>
                        <SelectItem value="DUPLICATES">Duplicates</SelectItem>
                        <SelectItem value="MESSAGING">Messaging</SelectItem>
                        <SelectItem value="TEMPLATES">Templates</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="permission-action">Action</Label>
                    <Select value={newPermissionAction} onValueChange={setNewPermissionAction}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select action" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="CREATE">Create</SelectItem>
                        <SelectItem value="READ">Read</SelectItem>
                        <SelectItem value="UPDATE">Update</SelectItem>
                        <SelectItem value="DELETE">Delete</SelectItem>
                        <SelectItem value="VIEW_ALL">View All</SelectItem>
                        <SelectItem value="VIEW_TEAM">View Team</SelectItem>
                        <SelectItem value="EXPORT">Export</SelectItem>
                        <SelectItem value="MANAGE">Manage</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="permission-expiry">Expiry Date (optional)</Label>
                    <Input
                      id="permission-expiry"
                      type="date"
                      value={newPermissionExpiry}
                      onChange={(e) => setNewPermissionExpiry(e.target.value)}
                    />
                  </div>
                </div>
                <Button type="submit" disabled={addPermissionMutation.isPending}>
                  {addPermissionMutation.isPending ? 'Adding...' : 'Add Permission Override'}
                </Button>
              </form>
            </div>

            {/* Role-based Permissions Info */}
            <div className="p-4 bg-gray-50 rounded">
              <h4 className="font-medium text-sm mb-2">Role-based Permissions ({selectedUserForPermissions?.role})</h4>
              <p className="text-sm text-gray-600">
                {selectedUserForPermissions?.role === 'BDR' && 'BDRs can manage their own leads/pipeline, read finance data, and access messaging/templates.'}
                {selectedUserForPermissions?.role === 'TEAM_LEAD' && 'Team Leads can manage team data, read finance, and access messaging/templates.'}
                {selectedUserForPermissions?.role === 'MANAGER' && 'Managers can manage territory data, view team finance, and access most features.'}
                {selectedUserForPermissions?.role === 'DIRECTOR' && 'Directors can view/manage most data across all territories.'}
                {selectedUserForPermissions?.role === 'ADMIN' && 'Admins have full access to all features and data.'}
              </p>
              <p className="text-xs text-gray-500 mt-2">
                Permission overrides add to (not replace) role-based permissions.
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}