'use client';

import { useSession } from 'next-auth/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  Phone, Target, CheckCircle, TrendingUp, Calendar, Award,
  Clock, Users, BarChart3, Activity, Star, Zap
} from 'lucide-react';
import Link from 'next/link';
import { useState, useEffect } from 'react';

interface BDRMetrics {
  callsToday: number;
  callsTarget: number;
  callsWeek: number;
  callsWeekTarget: number;
  agreementsToday: number;
  agreementsWeek: number;
  agreementsWeekTarget: number;
  conversionRate: number;
  avgCallDuration: number;
  leadsAssigned: number;
  leadsContacted: number;
  followUpsScheduled: number;
  weeklyGoalProgress: number;
  monthlyRank: number;
  totalBDRs: number;
  streak: number;
  lastWeekPerformance: number;
}

interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  earned: boolean;
  earnedDate?: string;
}

interface RecentActivity {
  id: string;
  type: 'call' | 'agreement' | 'lead' | 'follow-up';
  description: string;
  timestamp: string;
}

export function BDRKPIDashboard() {
  const { data: session } = useSession();
  const [metrics, setMetrics] = useState<BDRMetrics | null>(null);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);

  const userName = session?.user?.name?.split(' ')[0] || 'User';

  useEffect(() => {
    const fetchBDRMetrics = async () => {
      if (!session?.user || session.user.role !== 'BDR') return;
      
      try {
        // Fetch real data from the executive dashboard API (BDR users get their own data automatically)
        const response = await fetch('/api/reporting/executive-dashboard');
        if (!response.ok) {
          throw new Error('Failed to fetch BDR metrics');
        }
        
        const data = await response.json();
        const dashboard = data.dashboard;
        
        if (!dashboard) {
          throw new Error('No dashboard data received');
        }
        
        // Transform executive dashboard data to BDR metrics format
        const bdrMetrics: BDRMetrics = {
          callsToday: dashboard.kpis?.thisWeek?.callVolume?.current || 0,
          callsTarget: dashboard.kpis?.thisWeek?.callVolume?.target || 50,
          callsWeek: dashboard.kpis?.thisWeek?.callVolume?.current || 0,
          callsWeekTarget: dashboard.kpis?.thisWeek?.callVolume?.target || 250,
          agreementsToday: dashboard.kpis?.thisWeek?.agreements?.current || 0,
          agreementsWeek: dashboard.kpis?.thisWeek?.agreements?.current || 0,
          agreementsWeekTarget: dashboard.kpis?.thisWeek?.agreements?.target || 10,
          conversionRate: dashboard.kpis?.thisMonth?.conversionRate?.current || 0,
          avgCallDuration: 4.2, // This would need to be calculated from actual call data
          leadsAssigned: 45, // This would need to come from the leads API
          leadsContacted: 38, // This would need to be calculated from lead activity
          followUpsScheduled: 12, // This would need to be calculated from pipeline upcoming calls
          weeklyGoalProgress: dashboard.kpis?.thisWeek?.callVolume?.current && dashboard.kpis?.thisWeek?.callVolume?.target 
            ? Math.round((dashboard.kpis.thisWeek.callVolume.current / dashboard.kpis.thisWeek.callVolume.target) * 100)
            : 0,
          monthlyRank: 1, // This would need team comparison data
          totalBDRs: dashboard.bdrList?.length || 1,
          streak: 5, // This would need historical daily performance data
          lastWeekPerformance: 95 // This would need to be calculated from previous week data
        };

        const mockAchievements: Achievement[] = [
          {
            id: '1',
            title: 'Call Champion',
            description: '50+ calls in a single day',
            icon: '📞',
            earned: true,
            earnedDate: '2025-08-05'
          },
          {
            id: '2',
            title: 'Agreement Master',
            description: '10 agreements in one week',
            icon: '🎯',
            earned: false
          },
          {
            id: '3',
            title: 'Hot Streak',
            description: '5 consecutive days meeting targets',
            icon: '🔥',
            earned: true,
            earnedDate: '2025-08-07'
          },
          {
            id: '4',
            title: 'Top Performer',
            description: 'Rank #1 for the month',
            icon: '👑',
            earned: false
          }
        ];

        const mockActivity: RecentActivity[] = [
          {
            id: '1',
            type: 'agreement',
            description: 'Closed agreement with TechStart Inc.',
            timestamp: '2 hours ago'
          },
          {
            id: '2',
            type: 'call',
            description: 'Completed call with DataFlow Solutions',
            timestamp: '3 hours ago'
          },
          {
            id: '3',
            type: 'follow-up',
            description: 'Scheduled follow-up with CloudTech Ltd.',
            timestamp: '4 hours ago'
          },
          {
            id: '4',
            type: 'lead',
            description: 'New lead assigned: Enterprise Corp',
            timestamp: '6 hours ago'
          }
        ];

        setMetrics(bdrMetrics);
        setAchievements(mockAchievements);
        setRecentActivity(mockActivity);
      } catch (error) {
        console.error('Error fetching BDR metrics:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchBDRMetrics();
  }, [session]);

  if (!session || session.user?.role !== 'BDR') {
    return null;
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
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
      </div>
    );
  }

  const callProgress = metrics ? (metrics.callsToday / metrics.callsTarget) * 100 : 0;
  const weeklyCallProgress = metrics ? (metrics.callsWeek / metrics.callsWeekTarget) * 100 : 0;
  const agreementProgress = metrics ? (metrics.agreementsWeek / metrics.agreementsWeekTarget) * 100 : 0;
  const leadContactProgress = metrics ? (metrics.leadsContacted / metrics.leadsAssigned) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Welcome Section with Performance Summary */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Good morning, {userName}! 👋</h2>
          <p className="text-muted-foreground">You're currently ranked #{metrics?.monthlyRank} out of {metrics?.totalBDRs} BDRs this month</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="gap-1">
            <Zap className="h-3 w-3" />
            {metrics?.streak} day streak
          </Badge>
          <Badge variant="default" className="gap-1">
            <Star className="h-3 w-3" />
            {metrics?.weeklyGoalProgress}% weekly goal
          </Badge>
        </div>
      </div>

      {/* Primary KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className={`${callProgress >= 100 ? 'border-green-500 bg-green-50 dark:bg-green-950' : ''}`}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Calls</CardTitle>
            <Phone className={`h-4 w-4 ${callProgress >= 100 ? 'text-green-600' : 'text-muted-foreground'}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.callsToday}</div>
            <div className="text-xs text-muted-foreground mb-2">
              Target: {metrics?.callsTarget} ({metrics?.callsTarget - (metrics?.callsToday || 0)} remaining)
            </div>
            <Progress value={callProgress} className="h-2" />
            {callProgress >= 100 && (
              <p className="text-xs text-green-600 mt-1">🎉 Target achieved!</p>
            )}
          </CardContent>
        </Card>

        <Card className={`${agreementProgress >= 100 ? 'border-blue-500 bg-blue-50 dark:bg-blue-950' : ''}`}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Weekly Agreements</CardTitle>
            <CheckCircle className={`h-4 w-4 ${agreementProgress >= 100 ? 'text-blue-600' : 'text-muted-foreground'}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.agreementsWeek}</div>
            <div className="text-xs text-muted-foreground mb-2">
              Target: {metrics?.agreementsWeekTarget}
            </div>
            <Progress value={agreementProgress} className="h-2" />
            <p className="text-xs text-muted-foreground mt-1">
              {metrics?.agreementsToday} agreements today
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.conversionRate}%</div>
            <p className="text-xs text-muted-foreground">
              {metrics?.lastWeekPerformance ? 
                `${metrics.conversionRate - 6.8 > 0 ? '+' : ''}${(metrics.conversionRate - 6.8).toFixed(1)}% vs last week` :
                'vs last week'
              }
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Lead Progress</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.leadsContacted}</div>
            <div className="text-xs text-muted-foreground mb-2">
              of {metrics?.leadsAssigned} leads assigned
            </div>
            <Progress value={leadContactProgress} className="h-2" />
          </CardContent>
        </Card>
      </div>

      {/* Detailed Metrics */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Performance Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between text-sm">
              <span>Weekly Calls:</span>
              <span className="font-medium">{metrics?.callsWeek}/{metrics?.callsWeekTarget}</span>
            </div>
            <Progress value={weeklyCallProgress} className="h-1" />
            
            <div className="flex justify-between text-sm">
              <span>Avg. Call Duration:</span>
              <span className="font-medium">{metrics?.avgCallDuration} min</span>
            </div>
            
            <div className="flex justify-between text-sm">
              <span>Follow-ups Scheduled:</span>
              <span className="font-medium">{metrics?.followUpsScheduled}</span>
            </div>
            
            <div className="pt-2">
              <Link href="/reporting?view=personal" className="w-full">
                <Button variant="outline" className="w-full">View Detailed Analytics</Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5" />
              Achievements
            </CardTitle>
            <CardDescription>Your recent accomplishments</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {achievements.slice(0, 3).map((achievement) => (
                <div key={achievement.id} className="flex items-center gap-3 p-2 rounded-lg border">
                  <span className="text-lg">{achievement.icon}</span>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{achievement.title}</p>
                    <p className="text-xs text-muted-foreground">{achievement.description}</p>
                  </div>
                  {achievement.earned ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <Clock className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
              ))}
            </div>
            <Button variant="ghost" className="w-full mt-2">
              View All Achievements
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Recent Activity
            </CardTitle>
            <CardDescription>Your latest actions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentActivity.slice(0, 4).map((activity) => (
                <div key={activity.id} className="flex items-start gap-3">
                  <div className={`mt-1 h-2 w-2 rounded-full ${
                    activity.type === 'agreement' ? 'bg-green-500' :
                    activity.type === 'call' ? 'bg-blue-500' :
                    activity.type === 'lead' ? 'bg-purple-500' :
                    'bg-orange-500'
                  }`} />
                  <div className="flex-1">
                    <p className="text-sm">{activity.description}</p>
                    <p className="text-xs text-muted-foreground">{activity.timestamp}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <Link href="/leads?filter=mine" className="w-full">
              <Button className="w-full">
                <Users className="h-4 w-4 mr-2" />
                My Leads
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <Link href="/pipeline?view=today" className="w-full">
              <Button className="w-full">
                <Calendar className="h-4 w-4 mr-2" />
                Today's Schedule
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <Link href="/pipeline?action=new" className="w-full">
              <Button className="w-full">
                <Phone className="h-4 w-4 mr-2" />
                Log New Call
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <Link href="/reporting?view=personal" className="w-full">
              <Button variant="outline" className="w-full">
                <TrendingUp className="h-4 w-4 mr-2" />
                My Analytics
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}