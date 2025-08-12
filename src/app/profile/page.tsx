'use client';

import { useSession } from 'next-auth/react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { User, Shield, Save, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';

interface UserProfile {
  id: string;
  name: string | null;
  email: string;
  role: 'ADMIN' | 'BDR';
  createdAt: string;
  updatedAt: string;
  _count: {
    pipelineItems: number;
    leads: number;
    activityLogs: number;
  };
}

interface UpdateProfileForm {
  name?: string;
  email?: string;
  password?: string;
}

async function fetchUserProfile(userId: string): Promise<UserProfile> {
  const res = await fetch(`/api/admin/users/${userId}`);
  if (!res.ok) throw new Error('Failed to fetch user profile');
  return res.json();
}

async function updateProfile(userId: string, data: UpdateProfileForm): Promise<UserProfile> {
  const res = await fetch(`/api/admin/users/${userId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Failed to update profile');
  }
  return res.json();
}

export default function ProfilePage() {
  const { data: session, status } = useSession();
  const queryClient = useQueryClient();
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState<UpdateProfileForm>({
    name: '',
    email: '',
    password: '',
  });

  const { data: profile, isLoading } = useQuery({
    queryKey: ['user-profile', session?.user?.id],
    queryFn: () => fetchUserProfile(session!.user!.id!),
    enabled: !!session?.user?.id,
  });

  const updateMutation = useMutation({
    mutationFn: (data: UpdateProfileForm) => updateProfile(session!.user!.id!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-profile', session?.user?.id] });
      toast.success('Profile updated successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Initialize form data when profile loads
  useEffect(() => {
    if (profile) {
      setFormData({
        name: profile.name || '',
        email: profile.email,
        password: '',
      });
    }
  }, [profile]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Only send fields that have changed
    const updates: UpdateProfileForm = {};
    if (formData.name && formData.name !== profile?.name) updates.name = formData.name;
    if (formData.email && formData.email !== profile?.email) updates.email = formData.email;
    if (formData.password) updates.password = formData.password;
    
    if (Object.keys(updates).length === 0) {
      toast.info('No changes to save');
      return;
    }
    
    updateMutation.mutate(updates);
  };

  if (status === 'loading' || isLoading) {
    return <div className="p-6">Loading profile...</div>;
  }

  if (!session || !profile) {
    return <div className="p-6">Please log in to view your profile.</div>;
  }

  const isAdmin = profile.role === 'ADMIN';

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold">My Profile</h1>
        <Badge variant={isAdmin ? "default" : "secondary"} className="gap-1">
          {isAdmin ? <Shield className="h-3 w-3" /> : <User className="h-3 w-3" />}
          {profile.role}
        </Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Profile Information
          </CardTitle>
          <CardDescription>Update your personal information and account settings</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Enter your full name"
              />
            </div>

            <div>
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="Enter your email address"
              />
            </div>

            <div>
              <Label htmlFor="password">New Password (leave blank to keep current)</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="Enter new password"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            <Button 
              type="submit" 
              disabled={updateMutation.isPending} 
              className="w-full"
            >
              <Save className="h-4 w-4 mr-2" />
              {updateMutation.isPending ? 'Updating...' : 'Update Profile'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Account Statistics</CardTitle>
          <CardDescription>Your activity summary</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-primary">{profile._count.pipelineItems}</div>
              <div className="text-sm text-muted-foreground">Pipeline Items</div>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-primary">{profile._count.leads}</div>
              <div className="text-sm text-muted-foreground">Leads</div>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-primary">{profile._count.activityLogs}</div>
              <div className="text-sm text-muted-foreground">Activity Logs</div>
            </div>
          </div>

          <Separator />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Account Created:</span>
              <div className="font-medium">{format(new Date(profile.createdAt), 'PPP')}</div>
            </div>
            <div>
              <span className="text-muted-foreground">Last Updated:</span>
              <div className="font-medium">{format(new Date(profile.updatedAt), 'PPP')}</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}