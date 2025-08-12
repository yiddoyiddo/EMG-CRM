'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { redirect } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  territory?: {
    name: string;
  };
  _count?: {
    leads: number;
    pipelineItems: number;
  };
}

interface TeamStats {
  totalLeads: number;
  totalPipeline: number;
  conversionRate: number;
  territoryName: string;
}

export default function TeamPage() {
  const { data: session, status } = useSession();
  const [teamMembers, setTeamMembers] = useState<User[]>([]);
  const [teamStats, setTeamStats] = useState<TeamStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Check if user has team management permissions
  const canViewTeamData = session?.user?.role && ['ADMIN', 'DIRECTOR', 'MANAGER', 'TEAM_LEAD'].includes(session.user.role);

  useEffect(() => {
    if (status === 'loading') return;
    if (!session) return;
    
    if (!canViewTeamData) {
      redirect('/');
      return;
    }

    fetchTeamData();
  }, [session, status, canViewTeamData]);

  const fetchTeamData = async () => {
    try {
      setLoading(true);
      
      // Fetch team members
      const teamResponse = await fetch('/api/users?includeStats=true');
      if (teamResponse.ok) {
        const teamData = await teamResponse.json();
        setTeamMembers(teamData.users || []);
      }

      // Fetch team statistics
      const statsResponse = await fetch('/api/reporting/team-stats');
      if (statsResponse.ok) {
        const stats = await statsResponse.json();
        setTeamStats(stats);
      }

    } catch (error) {
      console.error('Error fetching team data:', error);
      setError('Failed to load team data');
    } finally {
      setLoading(false);
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'ADMIN': return 'bg-red-100 text-red-800';
      case 'DIRECTOR': return 'bg-purple-100 text-purple-800';
      case 'MANAGER': return 'bg-blue-100 text-blue-800';
      case 'TEAM_LEAD': return 'bg-green-100 text-green-800';
      case 'BDR': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPermissionLevel = (userRole: string, currentUserRole: string) => {
    const roleHierarchy = ['BDR', 'TEAM_LEAD', 'MANAGER', 'DIRECTOR', 'ADMIN'];
    const currentLevel = roleHierarchy.indexOf(currentUserRole);
    const targetLevel = roleHierarchy.indexOf(userRole);
    return currentLevel >= targetLevel;
  };

  if (status === 'loading' || loading) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading team data...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!canViewTeamData) {
    return null; // Redirect will handle this
  }

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Team Management</h1>
          <p className="text-gray-600 mt-2">
            Manage your team and view performance across territories
          </p>
        </div>
        <Badge variant="outline" className="text-sm">
          {session?.user?.role} View
        </Badge>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* Team Statistics */}
      {teamStats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Territory</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{teamStats.territoryName}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Total Leads</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{teamStats.totalLeads}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Pipeline Items</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{teamStats.totalPipeline}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Conversion Rate</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{teamStats.conversionRate}%</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Team Members */}
      <Tabs defaultValue="all" className="w-full">
        <TabsList>
          <TabsTrigger value="all">All Team Members</TabsTrigger>
          <TabsTrigger value="bdr">BDRs</TabsTrigger>
          <TabsTrigger value="leads">Team Leads</TabsTrigger>
          <TabsTrigger value="management">Management</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Team Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {teamMembers.map((member) => (
                  <div key={member.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                        <span className="text-sm font-medium">
                          {member.name?.charAt(0) || member.email.charAt(0)}
                        </span>
                      </div>
                      <div>
                        <h3 className="font-medium">{member.name || member.email}</h3>
                        <p className="text-sm text-gray-600">{member.email}</p>
                        {member.territory && (
                          <p className="text-xs text-gray-500">Territory: {member.territory.name}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      {member._count && (
                        <div className="text-right text-sm">
                          <div>{member._count.leads} leads</div>
                          <div>{member._count.pipelineItems} pipeline</div>
                        </div>
                      )}
                      <Badge className={getRoleBadgeColor(member.role)}>
                        {member.role}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bdr" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>BDR Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {teamMembers
                  .filter(member => member.role === 'BDR')
                  .map((member) => (
                    <div key={member.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-4">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                          <span className="text-sm font-medium text-blue-600">
                            {member.name?.charAt(0) || member.email.charAt(0)}
                          </span>
                        </div>
                        <div>
                          <h3 className="font-medium">{member.name || member.email}</h3>
                          <p className="text-sm text-gray-600">{member.territory?.name}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        {member._count && (
                          <>
                            <div className="text-lg font-medium">{member._count.leads}</div>
                            <div className="text-sm text-gray-600">leads generated</div>
                            <div className="text-sm text-gray-600">{member._count.pipelineItems} in pipeline</div>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="leads" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Team Leadership</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {teamMembers
                  .filter(member => ['TEAM_LEAD', 'MANAGER'].includes(member.role))
                  .map((member) => (
                    <div key={member.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-4">
                        <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                          <span className="text-sm font-medium text-green-600">
                            {member.name?.charAt(0) || member.email.charAt(0)}
                          </span>
                        </div>
                        <div>
                          <h3 className="font-medium">{member.name || member.email}</h3>
                          <p className="text-sm text-gray-600">{member.territory?.name}</p>
                          <Badge className={getRoleBadgeColor(member.role)}>
                            {member.role}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="management" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Management Team</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {teamMembers
                  .filter(member => ['ADMIN', 'DIRECTOR', 'MANAGER'].includes(member.role))
                  .map((member) => (
                    <div key={member.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-4">
                        <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                          <span className="text-sm font-medium text-purple-600">
                            {member.name?.charAt(0) || member.email.charAt(0)}
                          </span>
                        </div>
                        <div>
                          <h3 className="font-medium">{member.name || member.email}</h3>
                          <p className="text-sm text-gray-600">{member.territory?.name || 'Global'}</p>
                          <Badge className={getRoleBadgeColor(member.role)}>
                            {member.role}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="text-center text-sm text-gray-500 border-t pt-4">
        <p>Role-based access: You can see data based on your {session?.user?.role} permissions</p>
        <p>Territory: {session?.user?.territoryName || 'Global'}</p>
      </div>
    </div>
  );
}