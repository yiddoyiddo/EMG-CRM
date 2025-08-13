'use client';

import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Navbar } from '@/components/ui/navbar';

type TeamStatsResponse = {
  territoryName: string;
  totalLeads: number;
  totalPipeline: number;
  conversionRate: number;
  recentActivityCount: number;
  topPerformers?: Array<{
    id: string;
    name: string | null;
    email: string;
    role: string;
    leadCount: number;
    pipelineCount: number;
  }>;
};

type TeamUser = {
  id: string;
  name: string | null;
  email: string;
  role: string;
  territory?: { id: string; name: string } | null;
  lastLoginAt?: string | null;
  createdAt?: string;
  _count?: { leads: number; pipelineItems: number; activityLogs?: number };
};

async function fetchTeamStats(): Promise<TeamStatsResponse> {
  const res = await fetch('/api/reporting/team-stats');
  if (!res.ok) throw new Error('Failed to fetch team stats');
  return res.json();
}

async function fetchTeamUsers(): Promise<TeamUser[]> {
  const res = await fetch('/api/users?includeStats=true');
  if (!res.ok) throw new Error('Failed to fetch users');
  const data = await res.json();
  // API may return { users } or { data: { users } }
  return (data?.users ?? data?.data?.users ?? []) as TeamUser[];
}

export default function TeamReportingPage() {
  const { data: teamStats } = useQuery({ queryKey: ['teamStats'], queryFn: fetchTeamStats });
  const { data: users = [] } = useQuery<TeamUser[]>({ queryKey: ['teamUsers'], queryFn: fetchTeamUsers });

  return (
    <>
      <Navbar />
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Team Reports</h1>
          <p className="text-muted-foreground">Performance across your territory/team scope</p>
        </div>

        {teamStats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Scope</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{teamStats.territoryName}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Leads</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{teamStats.totalLeads}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Pipeline Items</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{teamStats.totalPipeline}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Conversion Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{teamStats.conversionRate}%</div>
              </CardContent>
            </Card>
          </div>
        )}

        <Tabs defaultValue="overview">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="members">Team Members</TabsTrigger>
            <TabsTrigger value="top">Top Performers</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <Card>
              <CardHeader>
                <CardTitle>Summary</CardTitle>
                <CardDescription>Recent activity and performance highlights</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-muted-foreground">
                  Recent activity (30d): {teamStats?.recentActivityCount ?? 0}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="members">
            <Card>
              <CardHeader>
                <CardTitle>Team Members</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Territory</TableHead>
                      <TableHead className="text-right">Leads</TableHead>
                      <TableHead className="text-right">Pipeline</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((u) => (
                      <TableRow key={u.id}>
                        <TableCell className="font-medium">{u.name || '—'}</TableCell>
                        <TableCell>{u.email}</TableCell>
                        <TableCell>
                          <Badge variant={u.role === 'BDR' ? 'secondary' : 'default'}>{u.role}</Badge>
                        </TableCell>
                        <TableCell>{u.territory?.name || '—'}</TableCell>
                        <TableCell className="text-right">{u._count?.leads ?? 0}</TableCell>
                        <TableCell className="text-right">{u._count?.pipelineItems ?? 0}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="top">
            <Card>
              <CardHeader>
                <CardTitle>Top Performers</CardTitle>
                <CardDescription>Based on current leads and pipeline counts</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {(teamStats?.topPerformers ?? []).map((p) => (
                    <div key={p.id} className="flex items-center justify-between p-3 border rounded-md">
                      <div>
                        <div className="font-medium">{p.name || p.email}</div>
                        <div className="text-xs text-muted-foreground">{p.role}</div>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {p.leadCount} leads • {p.pipelineCount} pipeline
                      </div>
                    </div>
                  ))}
                  {(teamStats?.topPerformers?.length ?? 0) === 0 && (
                    <div className="text-sm text-muted-foreground">No data available</div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}


