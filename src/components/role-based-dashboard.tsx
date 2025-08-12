'use client';

import { useSession } from 'next-auth/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  Users, LineChart, TrendingUp, Phone, Target, Calendar, 
  BarChart3, Shield, UserPlus, Settings, PieChart,
  CheckCircle, Clock, Award, Activity
} from 'lucide-react';
import Link from 'next/link';
import { useState, useEffect } from 'react';

interface DashboardMetrics {
  totalLeads: number;
  callsToday: number;
  agreementsThisWeek: number;
  pipelineValue: number;
  targetProgress: number;
  recentActivity: string[];
}

interface PersonalizedKPIs {
  callsTarget: number;
  callsActual: number;
  agreementsTarget: number;
  agreementsActual: number;
  conversionRate: number;
  weeklyGoalProgress: number;
}

export function RoleBasedDashboard() {
  const { data: session } = useSession();
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [kpis, setKpis] = useState<PersonalizedKPIs | null>(null);
  const [loading, setLoading] = useState(true);

  const userRole = session?.user?.role;
  const userName = session?.user?.name || 'User';

  useEffect(() => {
    const fetchMetrics = async () => {
      if (!session?.user) return;
      
      try {
        // Simulate API call for now - in real implementation, this would fetch user-specific metrics
        setMetrics({
          totalLeads: userRole === 'ADMIN' ? 1247 : userRole === 'BDR' ? 45 : 312,
          callsToday: userRole === 'BDR' ? 12 : userRole === 'TEAM_LEAD' ? 25 : 45,
          agreementsThisWeek: userRole === 'BDR' ? 3 : userRole === 'TEAM_LEAD' ? 15 : 28,
          pipelineValue: userRole === 'BDR' ? 15000 : userRole === 'TEAM_LEAD' ? 85000 : 250000,
          targetProgress: Math.floor(Math.random() * 100),
          recentActivity: [
            'New lead added: Tech Solutions Inc.',
            'Agreement closed with StartupXYZ',
            'Follow-up call scheduled'
          ]
        });

        if (userRole === 'BDR') {
          setKpis({
            callsTarget: 50,
            callsActual: 42,
            agreementsTarget: 5,
            agreementsActual: 3,
            conversionRate: 7.1,
            weeklyGoalProgress: 84
          });
        }
      } catch (error) {
        console.error('Error fetching metrics:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchMetrics();
  }, [session, userRole]);

  if (!session) {
    return null;
  }

  if (loading) {
    return (
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="pb-2">
              <div className="h-4 bg-muted rounded w-3/4"></div>
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-muted rounded w-1/2 mb-2"></div>
              <div className="h-3 bg-muted rounded w-full"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  // BDR-specific dashboard
  if (userRole === 'BDR') {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Welcome back, {userName}!</h2>
            <p className="text-muted-foreground">Here's your personal performance dashboard</p>
          </div>
          <Badge variant="outline" className="gap-1">
            <Target className="h-3 w-3" />
            BDR Dashboard
          </Badge>
        </div>

        {/* Personal KPIs */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Today's Calls</CardTitle>
              <Phone className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{kpis?.callsActual || 0}</div>
              <div className="text-xs text-muted-foreground">
                Target: {kpis?.callsTarget || 0}
              </div>
              <Progress 
                value={(kpis?.callsActual || 0) / (kpis?.callsTarget || 1) * 100} 
                className="mt-2"
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Agreements This Week</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{kpis?.agreementsActual || 0}</div>
              <div className="text-xs text-muted-foreground">
                Target: {kpis?.agreementsTarget || 0}
              </div>
              <Progress 
                value={(kpis?.agreementsActual || 0) / (kpis?.agreementsTarget || 1) * 100} 
                className="mt-2"
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{kpis?.conversionRate || 0}%</div>
              <p className="text-xs text-muted-foreground">+0.5% from last week</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Weekly Goal</CardTitle>
              <Award className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{kpis?.weeklyGoalProgress || 0}%</div>
              <p className="text-xs text-muted-foreground">Keep pushing!</p>
              <Progress value={kpis?.weeklyGoalProgress || 0} className="mt-2" />
            </CardContent>
          </Card>
        </div>

        {/* BDR-specific quick actions */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                My Leads
              </CardTitle>
              <CardDescription>View and manage your assigned leads</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold mb-2">{metrics?.totalLeads || 0}</div>
              <Link href="/leads?filter=mine" className="w-full">
                <Button className="w-full">View My Leads</Button>
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Today's Schedule
              </CardTitle>
              <CardDescription>Your calls and activities for today</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold mb-2">{metrics?.callsToday || 0}</div>
              <Link href="/pipeline?view=today" className="w-full">
                <Button className="w-full">View Schedule</Button>
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                My Performance
              </CardTitle>
              <CardDescription>Track your progress and analytics</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-muted-foreground mb-2">This month's progress</div>
              <Link href="/reporting?view=personal" className="w-full">
                <Button className="w-full">View Analytics</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Team Lead dashboard
  if (userRole === 'TEAM_LEAD') {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Team Lead Dashboard</h2>
            <p className="text-muted-foreground">Monitor your team's performance and progress</p>
          </div>
          <Badge variant="default" className="gap-1">
            <Users className="h-3 w-3" />
            Team Lead
          </Badge>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Team Calls Today</CardTitle>
              <Phone className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics?.callsToday || 0}</div>
              <p className="text-xs text-muted-foreground">+12% from yesterday</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Team Agreements</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics?.agreementsThisWeek || 0}</div>
              <p className="text-xs text-muted-foreground">This week</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pipeline Value</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${(metrics?.pipelineValue || 0).toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">Team total</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Team Performance</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics?.targetProgress || 0}%</div>
              <p className="text-xs text-muted-foreground">of monthly target</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Team Management</CardTitle>
              <CardDescription>Manage your team members and their performance</CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/team" className="w-full">
                <Button className="w-full">Manage Team</Button>
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Team Reports</CardTitle>
              <CardDescription>View detailed team performance analytics</CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/reporting?view=team" className="w-full">
                <Button className="w-full">View Team Reports</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Manager/Director/Admin dashboard
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Executive Dashboard</h2>
          <p className="text-muted-foreground">Complete overview of organizational performance</p>
        </div>
        <Badge variant="default" className="gap-1">
          <Shield className="h-3 w-3" />
          {userRole}
        </Badge>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Leads</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.totalLeads || 0}</div>
            <p className="text-xs text-muted-foreground">+180 this month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Daily Calls</CardTitle>
            <Phone className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.callsToday || 0}</div>
            <p className="text-xs text-muted-foreground">Across all teams</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Weekly Agreements</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.agreementsThisWeek || 0}</div>
            <p className="text-xs text-muted-foreground">+15% vs last week</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pipeline Value</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${(metrics?.pipelineValue || 0).toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Total active pipeline</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="h-5 w-5" />
              Executive Reporting
            </CardTitle>
            <CardDescription>Comprehensive business analytics and KPIs</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/reporting" className="w-full">
              <Button className="w-full">View Reports</Button>
            </Link>
          </CardContent>
        </Card>

        {userRole === 'ADMIN' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                System Management
              </CardTitle>
              <CardDescription>User management and system administration</CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/admin/users" className="w-full">
                <Button className="w-full">Admin Panel</Button>
              </Link>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LineChart className="h-5 w-5" />
              Financial Overview
            </CardTitle>
            <CardDescription>Revenue tracking and financial metrics</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/finance" className="w-full">
              <Button className="w-full">View Finances</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}