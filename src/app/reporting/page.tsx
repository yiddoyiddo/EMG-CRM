"use client";

import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Navbar } from '@/components/ui/navbar';
import { useSession } from 'next-auth/react';
import {
  Phone,
  FileText,
  Users,
  Target,
  AlertCircle,
  HelpCircle,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';

import {
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend,
} from 'recharts';

const fetchExecutiveDashboard = async (bdr: string) => {
  const params = new URLSearchParams();
  if (bdr && bdr !== 'all') params.append('bdr', bdr);
  // Add test bypass flags to support Cypress in CI/dev without auth
  if (typeof window !== 'undefined' && window.location.search.includes('test=1')) {
    params.append('test', '1');
  }

  const response = await fetch(`/api/reporting/executive-dashboard?${params.toString()}`, {
    headers: window.location.search.includes('test=1') ? { 'x-cypress-test': '1' } as any : undefined,
  });
  if (!response.ok) {
    throw new Error('Failed to fetch executive dashboard');
  }
  return response.json();
};

export default function ReportingPage() {
  const { data: session } = useSession();
  const [bdr, setBdr] = useState('all');

  // For BDRs, force them to only see their own data
  const effectiveBdr = session?.user?.role === 'BDR' ? session.user.name || 'all' : bdr;

  const { data, isLoading, error } = useQuery({
    queryKey: ['executiveDashboard', effectiveBdr],
    queryFn: () => fetchExecutiveDashboard(effectiveBdr),
    enabled: !!session, // Only run query when session is available
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'excellent': return 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800';
      case 'good': return 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800';
      case 'needs_attention': return 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800';
      case 'critical': return 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800';
      default: return 'text-muted-foreground bg-muted border';
    }
  };

  const renderDelta = (current: number, previous: number, suffix: string = '') => {
    const diff = (current ?? 0) - (previous ?? 0);
    const isUp = diff > 0;
    const isDown = diff < 0;
    if (!isUp && !isDown) {
      return (
        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
          <ArrowUpRight className="h-3 w-3 opacity-0" />
          0{suffix} vs prev
        </span>
      );
    }
    return (
      <span className={`inline-flex items-center gap-1 text-xs ${isUp ? 'text-emerald-600' : 'text-rose-600'}`}>
        {isUp ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
        {diff > 0 ? `+${diff}` : diff}{suffix} vs prev
      </span>
    );
  };

  // Show loading state when session is not loaded yet
  if (!session) {
    return (
      <>
        <Navbar />
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p>Loading...</p>
          </div>
        </div>
      </>
    );
  }

  if (error) {
    return (
      <>
        <Navbar />
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center text-red-600">
            <AlertCircle className="h-8 w-8 mx-auto mb-4" />
            <p>Error loading dashboard: {error.message}</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">
            {session?.user?.role === 'BDR' 
              ? `My Performance Dashboard` 
              : 'Reporting Dashboard'
            }
          </h1>
          {session?.user?.role !== 'BDR' && (
            <div className="flex items-center gap-2 rounded-xl border border-white/30 dark:border-white/10 bg-white/60 dark:bg-white/[0.05] backdrop-blur p-2">
              <Select onValueChange={setBdr} value={bdr}>
                <SelectTrigger>
                  <SelectValue placeholder="Select BDR" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All BDRs</SelectItem>
                  {data?.dashboard.bdrList?.map((bdrName: string) => (
                    <SelectItem key={bdrName} value={bdrName}>{bdrName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          {session?.user?.role === 'BDR' && (
            <div className="flex items-center gap-2 rounded-xl border border-white/30 dark:border-white/10 bg-white/60 dark:bg-white/[0.05] backdrop-blur p-2 px-4 py-2">
              <span className="text-sm font-medium">BDR: {session.user.name}</span>
            </div>
          )}
        </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Call Volume
              <Tooltip>
                <TooltipTrigger>
                  <HelpCircle className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p><strong>Detailed call volume analysis:</strong> Track call patterns, BDR performance, and call outcomes</p>
                  <p><strong>Features:</strong> Daily/weekly trends, BDR comparisons, call success rates</p>
                </TooltipContent>
              </Tooltip>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Link href="/reporting/call-volume">
              <Button className="transition-transform hover:scale-[1.02]">
                View Report
              </Button>
            </Link>
            {/* Sparkline */}
            {data?.dashboard?.trends?.weeklyCallVolume && (
              <div className="mt-3 h-10">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data.dashboard.trends.weeklyCallVolume} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                    <XAxis dataKey="week" hide />
                    <YAxis hide />
                    <Line type="monotone" dataKey="calls" stroke="#3b82f6" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Agreement Tracking
              <Tooltip>
                <TooltipTrigger>
                  <HelpCircle className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p><strong>Agreement lifecycle tracking:</strong> Monitor agreement generation, status, and outcomes</p>
                  <p><strong>Features:</strong> Agreement status tracking, conversion rates, BDR performance</p>
                </TooltipContent>
              </Tooltip>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Link href="/reporting/agreement-tracking">
              <Button className="transition-transform hover:scale-[1.02]">
                View Report
              </Button>
            </Link>
            {/* Sparkline */}
            {data?.dashboard?.trends?.monthlyAgreements && (
              <div className="mt-3 h-10">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.dashboard.trends.monthlyAgreements}>
                    <XAxis dataKey="month" hide />
                    <YAxis hide />
                    <Bar dataKey="agreements" fill="#10b981" radius={[2,2,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Lists Out
              <Tooltip>
                <TooltipTrigger>
                  <HelpCircle className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p><strong>Partner list performance:</strong> Track list generation, outcomes, and revenue impact</p>
                  <p><strong>Features:</strong> List size analysis, conversion tracking, revenue per list</p>
                </TooltipContent>
              </Tooltip>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Link href="/reporting/lists-out">
              <Button className="transition-transform hover:scale-[1.02]">
                View Report
              </Button>
            </Link>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Conversion Funnel
              <Tooltip>
                <TooltipTrigger>
                  <HelpCircle className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p><strong>Sales funnel analysis:</strong> Track conversion rates at each stage of the sales process</p>
                  <p><strong>Features:</strong> Stage-by-stage conversion rates, funnel optimization insights</p>
                </TooltipContent>
              </Tooltip>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Link href="/reporting/conversion">
              <Button className="transition-transform hover:scale-[1.02]">
                View Report
              </Button>
            </Link>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Advanced Business Intelligence
              <Tooltip>
                <TooltipTrigger>
                  <HelpCircle className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p><strong>Advanced BDR performance comparison:</strong> Comprehensive analytics with real-time notifications</p>
                  <p><strong>Features:</strong> BDR comparison tools, advanced filtering, real-time alerts, performance trends</p>
                </TooltipContent>
              </Tooltip>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Link href="/reporting/advanced">
              <Button className="transition-transform hover:scale-[1.02]">
                View Advanced Reports
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
      {isLoading && <p>Loading...</p>}
      {error && <p>Error loading data</p>}
      {data && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Executive Dashboard</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* This Week Row */}
              <div>
                <h3 className="text-lg font-semibold mb-4 text-foreground">This Week</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Card className={`border-2 ${getStatusColor(data.dashboard.kpis.thisWeek.callVolume.status)}`}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <Phone className="h-4 w-4" />
                        Call Volume
                        <Tooltip>
                          <TooltipTrigger>
                            <HelpCircle className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">
                            <p><strong>What it measures:</strong> Total completed calls this week</p>
                            <p><strong>How it's calculated:</strong> Count of activity logs with type "Call_Completed" within the current week</p>
                            <p><strong>Target levels:</strong> Excellent: 125%+ of target, Good: 100%+ of target, Needs Attention: 50%+ of target, Critical: Below 50%</p>
                          </TooltipContent>
                        </Tooltip>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{data.dashboard.kpis.thisWeek.callVolume.current}</div>
                      <Progress
                        value={(data.dashboard.kpis.thisWeek.callVolume.current / data.dashboard.kpis.thisWeek.callVolume.target) * 100}
                        className="mt-2"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Target: {data.dashboard.kpis.thisWeek.callVolume.target}
                      </p>
                      <div className="mt-1">
                        {renderDelta(
                          data.dashboard.kpis.thisWeek.callVolume.current,
                          data.dashboard.kpis.lastWeek.callVolume.current
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  <Card className={`border-2 ${getStatusColor(data.dashboard.kpis.thisWeek.agreements.status)}`}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        Agreements
                        <Tooltip>
                          <TooltipTrigger>
                            <HelpCircle className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">
                            <p><strong>What it measures:</strong> Total agreements sent this week</p>
                            <p><strong>How it's calculated:</strong> Count of activity logs with type "Agreement_Sent" within the current week</p>
                            <p><strong>Target levels:</strong> Excellent: 125%+ of target, Good: 100%+ of target, Needs Attention: 50%+ of target, Critical: Below 50%</p>
                          </TooltipContent>
                        </Tooltip>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{data.dashboard.kpis.thisWeek.agreements.current}</div>
                      <Progress
                        value={(data.dashboard.kpis.thisWeek.agreements.current / data.dashboard.kpis.thisWeek.agreements.target) * 100}
                        className="mt-2"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Target: {data.dashboard.kpis.thisWeek.agreements.target}
                      </p>
                      <div className="mt-1">
                        {renderDelta(
                          data.dashboard.kpis.thisWeek.agreements.current,
                          data.dashboard.kpis.lastWeek.agreements.current
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  <Card className={`border-2 ${getStatusColor(data.dashboard.kpis.thisWeek.listsOut.status)}`}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        Lists Out
                        <Tooltip>
                          <TooltipTrigger>
                            <HelpCircle className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">
                            <p><strong>What it measures:</strong> Total partner lists sent this week</p>
                            <p><strong>How it's calculated:</strong> Count of activity logs with type "Partner_List_Sent" within the current week</p>
                            <p><strong>Target levels:</strong> Excellent: 125%+ of target, Good: 100%+ of target, Needs Attention: 50%+ of target, Critical: Below 50%</p>
                          </TooltipContent>
                        </Tooltip>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{data.dashboard.kpis.thisWeek.listsOut.current}</div>
                      <Progress
                        value={(data.dashboard.kpis.thisWeek.listsOut.current / data.dashboard.kpis.thisWeek.listsOut.target) * 100}
                        className="mt-2"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Target: {data.dashboard.kpis.thisWeek.listsOut.target}
                      </p>
                      <div className="mt-1">
                        {renderDelta(
                          data.dashboard.kpis.thisWeek.listsOut.current,
                          data.dashboard.kpis.lastWeek.listsOut.current
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  <Card className={`border-2 ${getStatusColor(data.dashboard.kpis.thisWeek.sales.status)}`}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <Target className="h-4 w-4" />
                        Sales
                        <Tooltip>
                          <TooltipTrigger>
                            <HelpCircle className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">
                            <p><strong>What it measures:</strong> Total sales this week</p>
                            <p><strong>How it's calculated:</strong> Count of pipeline items with sales indicators or 'Sold' status updated this week</p>
                            <p><strong>Target levels:</strong> Excellent: 125%+ of target, Good: 100%+ of target, Needs Attention: 50%+ of target, Critical: Below 50%</p>
                          </TooltipContent>
                        </Tooltip>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{data.dashboard.kpis.thisWeek.sales.current}</div>
                      <Progress
                        value={(data.dashboard.kpis.thisWeek.sales.current / data.dashboard.kpis.thisWeek.sales.target) * 100}
                        className="mt-2"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Target: {data.dashboard.kpis.thisWeek.sales.target}
                      </p>
                      <div className="mt-1">
                        {renderDelta(
                          data.dashboard.kpis.thisWeek.sales.current,
                          data.dashboard.kpis.lastWeek.sales.current
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>

              {/* Last Week Row */}
              <div>
                <h3 className="text-lg font-semibold mb-4 text-indigo-600">Last Week</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Card className={`border-2 ${getStatusColor(data.dashboard.kpis.lastWeek.callVolume.status)}`}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <Phone className="h-4 w-4" />
                        Call Volume
                        <Tooltip>
                          <TooltipTrigger>
                            <HelpCircle className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">
                            <p><strong>What it measures:</strong> Total completed calls last week</p>
                            <p><strong>How it's calculated:</strong> Count of activity logs with type "Call_Completed" within last week</p>
                            <p><strong>Target levels:</strong> Excellent: 125%+ of target, Good: 100%+ of target, Needs Attention: 50%+ of target, Critical: Below 50%</p>
                          </TooltipContent>
                        </Tooltip>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{data.dashboard.kpis.lastWeek.callVolume.current}</div>
                      <Progress
                        value={(data.dashboard.kpis.lastWeek.callVolume.current / data.dashboard.kpis.lastWeek.callVolume.target) * 100}
                        className="mt-2"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Target: {data.dashboard.kpis.lastWeek.callVolume.target}
                      </p>
                    </CardContent>
                  </Card>

                  <Card className={`border-2 ${getStatusColor(data.dashboard.kpis.lastWeek.agreements.status)}`}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        Agreements
                        <Tooltip>
                          <TooltipTrigger>
                            <HelpCircle className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">
                            <p><strong>What it measures:</strong> Total agreements sent last week</p>
                            <p><strong>How it's calculated:</strong> Count of activity logs with type "Agreement_Sent" within last week</p>
                            <p><strong>Target levels:</strong> Excellent: 125%+ of target, Good: 100%+ of target, Needs Attention: 50%+ of target, Critical: Below 50%</p>
                          </TooltipContent>
                        </Tooltip>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{data.dashboard.kpis.lastWeek.agreements.current}</div>
                      <Progress
                        value={(data.dashboard.kpis.lastWeek.agreements.current / data.dashboard.kpis.lastWeek.agreements.target) * 100}
                        className="mt-2"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Target: {data.dashboard.kpis.lastWeek.agreements.target}
                      </p>
                    </CardContent>
                  </Card>

                  <Card className={`border-2 ${getStatusColor(data.dashboard.kpis.lastWeek.listsOut.status)}`}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        Lists Out
                        <Tooltip>
                          <TooltipTrigger>
                            <HelpCircle className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">
                            <p><strong>What it measures:</strong> Total partner lists sent last week</p>
                            <p><strong>How it's calculated:</strong> Count of activity logs with type "Partner_List_Sent" within last week</p>
                            <p><strong>Target levels:</strong> Excellent: 125%+ of target, Good: 100%+ of target, Needs Attention: 50%+ of target, Critical: Below 50%</p>
                          </TooltipContent>
                        </Tooltip>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{data.dashboard.kpis.lastWeek.listsOut.current}</div>
                      <Progress
                        value={(data.dashboard.kpis.lastWeek.listsOut.current / data.dashboard.kpis.lastWeek.listsOut.target) * 100}
                        className="mt-2"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Target: {data.dashboard.kpis.lastWeek.listsOut.target}
                      </p>
                    </CardContent>
                  </Card>

                  <Card className={`border-2 ${getStatusColor(data.dashboard.kpis.lastWeek.sales.status)}`}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <Target className="h-4 w-4" />
                        Sales
                        <Tooltip>
                          <TooltipTrigger>
                            <HelpCircle className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">
                            <p><strong>What it measures:</strong> Total sales last week</p>
                            <p><strong>How it's calculated:</strong> Count of pipeline items with sales indicators or 'Sold' status updated last week</p>
                            <p><strong>Target levels:</strong> Excellent: 125%+ of target, Good: 100%+ of target, Needs Attention: 50%+ of target, Critical: Below 50%</p>
                          </TooltipContent>
                        </Tooltip>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{data.dashboard.kpis.lastWeek.sales.current}</div>
                      <Progress
                        value={(data.dashboard.kpis.lastWeek.sales.current / data.dashboard.kpis.lastWeek.sales.target) * 100}
                        className="mt-2"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Target: {data.dashboard.kpis.lastWeek.sales.target}
                      </p>
                    </CardContent>
                  </Card>
                </div>
              </div>

              {/* This Month Row */}
              <div>
                <h3 className="text-lg font-semibold mb-4 text-green-600">This Month</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Card className={`border-2 ${getStatusColor(data.dashboard.kpis.thisMonth.callVolume.status)}`}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <Phone className="h-4 w-4" />
                        Call Volume
                        <Tooltip>
                          <TooltipTrigger>
                            <HelpCircle className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">
                            <p><strong>What it measures:</strong> Total completed calls this month</p>
                            <p><strong>How it's calculated:</strong> Count of activity logs with type "Call_Completed" within the current month</p>
                            <p><strong>Target levels:</strong> Excellent: 125%+ of target, Good: 100%+ of target, Needs Attention: 50%+ of target, Critical: Below 50%</p>
                          </TooltipContent>
                        </Tooltip>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{data.dashboard.kpis.thisMonth.callVolume.current}</div>
                      <Progress
                        value={(data.dashboard.kpis.thisMonth.callVolume.current / data.dashboard.kpis.thisMonth.callVolume.target) * 100}
                        className="mt-2"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Target: {data.dashboard.kpis.thisMonth.callVolume.target}
                      </p>
                      <div className="mt-1">
                        {renderDelta(
                          data.dashboard.kpis.thisMonth.callVolume.current,
                          data.dashboard.kpis.lastMonth.callVolume.current
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  <Card className={`border-2 ${getStatusColor(data.dashboard.kpis.thisMonth.agreements.status)}`}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        Agreements
                        <Tooltip>
                          <TooltipTrigger>
                            <HelpCircle className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">
                            <p><strong>What it measures:</strong> Total agreements sent this month</p>
                            <p><strong>How it's calculated:</strong> Count of activity logs with type "Agreement_Sent" within the current month</p>
                            <p><strong>Target levels:</strong> Excellent: 125%+ of target, Good: 100%+ of target, Needs Attention: 50%+ of target, Critical: Below 50%</p>
                          </TooltipContent>
                        </Tooltip>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{data.dashboard.kpis.thisMonth.agreements.current}</div>
                      <Progress
                        value={(data.dashboard.kpis.thisMonth.agreements.current / data.dashboard.kpis.thisMonth.agreements.target) * 100}
                        className="mt-2"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Target: {data.dashboard.kpis.thisMonth.agreements.target}
                      </p>
                      <div className="mt-1">
                        {renderDelta(
                          data.dashboard.kpis.thisMonth.agreements.current,
                          data.dashboard.kpis.lastMonth.agreements.current
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  <Card className={`border-2 ${getStatusColor(data.dashboard.kpis.thisMonth.listsOut.status)}`}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        Lists Out
                        <Tooltip>
                          <TooltipTrigger>
                            <HelpCircle className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">
                            <p><strong>What it measures:</strong> Total partner lists sent this month</p>
                            <p><strong>How it's calculated:</strong> Count of activity logs with type "Partner_List_Sent" within the current month</p>
                            <p><strong>Target levels:</strong> Excellent: 125%+ of target, Good: 100%+ of target, Needs Attention: 50%+ of target, Critical: Below 50%</p>
                          </TooltipContent>
                        </Tooltip>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{data.dashboard.kpis.thisMonth.listsOut.current}</div>
                      <Progress
                        value={(data.dashboard.kpis.thisMonth.listsOut.current / data.dashboard.kpis.thisMonth.listsOut.target) * 100}
                        className="mt-2"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Target: {data.dashboard.kpis.thisMonth.listsOut.target}
                      </p>
                      <div className="mt-1">
                        {renderDelta(
                          data.dashboard.kpis.thisMonth.listsOut.current,
                          data.dashboard.kpis.lastMonth.listsOut.current
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  <Card className={`border-2 ${getStatusColor(data.dashboard.kpis.thisMonth.conversionRate.status)}`}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <Target className="h-4 w-4" />
                        Conversion Rate
                        <Tooltip>
                          <TooltipTrigger>
                            <HelpCircle className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">
                            <p><strong>What it measures:</strong> Conversion rate from calls to sales this month</p>
                            <p><strong>How it's calculated:</strong> (Sales this month / Calls this month) × 100</p>
                            <p><strong>Target levels:</strong> Excellent: 25%+, Good: 18%+, Needs Attention: 12%+, Critical: Below 12%</p>
                          </TooltipContent>
                        </Tooltip>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{data.dashboard.kpis.thisMonth.conversionRate.current}%</div>
                      <Progress
                        value={(data.dashboard.kpis.thisMonth.conversionRate.current / data.dashboard.kpis.thisMonth.conversionRate.target) * 100}
                        className="mt-2"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Target: {data.dashboard.kpis.thisMonth.conversionRate.target}%
                      </p>
                      <div className="mt-1">
                        {renderDelta(
                          data.dashboard.kpis.thisMonth.conversionRate.current,
                          data.dashboard.kpis.lastMonth.conversionRate.current,
                          '%'
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>

              {/* Last Month Row */}
              <div>
                <h3 className="text-lg font-semibold mb-4 text-purple-600">Last Month</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Card className={`border-2 ${getStatusColor(data.dashboard.kpis.lastMonth.callVolume.status)}`}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <Phone className="h-4 w-4" />
                        Call Volume
                        <Tooltip>
                          <TooltipTrigger>
                            <HelpCircle className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">
                            <p><strong>What it measures:</strong> Total completed calls last month</p>
                            <p><strong>How it's calculated:</strong> Count of activity logs with type "Call_Completed" within last month</p>
                            <p><strong>Target levels:</strong> Excellent: 125%+ of target, Good: 100%+ of target, Needs Attention: 50%+ of target, Critical: Below 50%</p>
                          </TooltipContent>
                        </Tooltip>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{data.dashboard.kpis.lastMonth.callVolume.current}</div>
                      <Progress
                        value={(data.dashboard.kpis.lastMonth.callVolume.current / data.dashboard.kpis.lastMonth.callVolume.target) * 100}
                        className="mt-2"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Target: {data.dashboard.kpis.lastMonth.callVolume.target}
                      </p>
                    </CardContent>
                  </Card>

                  <Card className={`border-2 ${getStatusColor(data.dashboard.kpis.lastMonth.agreements.status)}`}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        Agreements
                        <Tooltip>
                          <TooltipTrigger>
                            <HelpCircle className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">
                            <p><strong>What it measures:</strong> Total agreements sent last month</p>
                            <p><strong>How it's calculated:</strong> Count of activity logs with type "Agreement_Sent" within last month</p>
                            <p><strong>Target levels:</strong> Excellent: 125%+ of target, Good: 100%+ of target, Needs Attention: 50%+ of target, Critical: Below 50%</p>
                          </TooltipContent>
                        </Tooltip>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{data.dashboard.kpis.lastMonth.agreements.current}</div>
                      <Progress
                        value={(data.dashboard.kpis.lastMonth.agreements.current / data.dashboard.kpis.lastMonth.agreements.target) * 100}
                        className="mt-2"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Target: {data.dashboard.kpis.lastMonth.agreements.target}
                      </p>
                    </CardContent>
                  </Card>

                  <Card className={`border-2 ${getStatusColor(data.dashboard.kpis.lastMonth.listsOut.status)}`}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        Lists Out
                        <Tooltip>
                          <TooltipTrigger>
                            <HelpCircle className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">
                            <p><strong>What it measures:</strong> Total partner lists sent last month</p>
                            <p><strong>How it's calculated:</strong> Count of activity logs with type "Partner_List_Sent" within last month</p>
                            <p><strong>Target levels:</strong> Excellent: 125%+ of target, Good: 100%+ of target, Needs Attention: 50%+ of target, Critical: Below 50%</p>
                          </TooltipContent>
                        </Tooltip>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{data.dashboard.kpis.lastMonth.listsOut.current}</div>
                      <Progress
                        value={(data.dashboard.kpis.lastMonth.listsOut.current / data.dashboard.kpis.lastMonth.listsOut.target) * 100}
                        className="mt-2"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Target: {data.dashboard.kpis.lastMonth.listsOut.target}
                      </p>
                    </CardContent>
                  </Card>

                  <Card className={`border-2 ${getStatusColor(data.dashboard.kpis.lastMonth.conversionRate.status)}`}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <Target className="h-4 w-4" />
                        Conversion Rate
                        <Tooltip>
                          <TooltipTrigger>
                            <HelpCircle className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">
                            <p><strong>What it measures:</strong> Conversion rate from calls to sales last month</p>
                            <p><strong>How it's calculated:</strong> (Sales last month / Calls last month) × 100</p>
                            <p><strong>Target levels:</strong> Excellent: 25%+, Good: 18%+, Needs Attention: 12%+, Critical: Below 12%</p>
                          </TooltipContent>
                        </Tooltip>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{data.dashboard.kpis.lastMonth.conversionRate.current}%</div>
                      <Progress
                        value={(data.dashboard.kpis.lastMonth.conversionRate.current / data.dashboard.kpis.lastMonth.conversionRate.target) * 100}
                        className="mt-2"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Target: {data.dashboard.kpis.lastMonth.conversionRate.target}%
                      </p>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Trend Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Weekly Calls */}
            <Card className="shadow-none border">
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  Weekly Call Volume
                  <Tooltip>
                    <TooltipTrigger>
                      <HelpCircle className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p><strong>What it shows:</strong> Call volume trends over the last 4 weeks</p>
                      <p><strong>Data source:</strong> Activity logs with type "Call_Completed" grouped by week</p>
                      <p><strong>Purpose:</strong> Track call volume consistency and identify patterns</p>
                    </TooltipContent>
                  </Tooltip>
                </CardTitle>
                <CardDescription>Last 4 weeks</CardDescription>
              </CardHeader>
              <CardContent style={{ width: '100%', height: 250 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data.dashboard.trends.weeklyCallVolume} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                    <Line type="monotone" dataKey="calls" stroke="#3b82f6" strokeWidth={2} />
                    <CartesianGrid stroke="#ccc" strokeDasharray="5 5" />
                    <XAxis dataKey="week" />
                    <YAxis />
                    <RechartsTooltip />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Monthly Agreements */}
            <Card className="shadow-none border">
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  Monthly Agreements
                  <Tooltip>
                    <TooltipTrigger>
                      <HelpCircle className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p><strong>What it shows:</strong> Agreement volume trends over the last 4 months</p>
                      <p><strong>Data source:</strong> Activity logs with type "Agreement_Sent" grouped by month</p>
                      <p><strong>Purpose:</strong> Track agreement generation consistency and growth</p>
                    </TooltipContent>
                  </Tooltip>
                </CardTitle>
                <CardDescription>Last 4 months</CardDescription>
              </CardHeader>
              <CardContent style={{ width: '100%', height: 250 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.dashboard.trends.monthlyAgreements}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <RechartsTooltip />
                    <Bar dataKey="agreements" fill="#10b981" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Quarterly Lists Out */}
            <Card className="shadow-none border">
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  Quarterly Lists Out
                  <Tooltip>
                    <TooltipTrigger>
                      <HelpCircle className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p><strong>What it shows:</strong> Lists sent and conversions by quarter</p>
                      <p><strong>Data source:</strong> Activity logs with type "Partner_List_Sent" and pipeline sales data</p>
                      <p><strong>Purpose:</strong> Track list performance and conversion rates over time</p>
                    </TooltipContent>
                  </Tooltip>
                </CardTitle>
                <CardDescription>Current vs Previous</CardDescription>
              </CardHeader>
              <CardContent style={{ width: '100%', height: 250 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.dashboard.trends.quarterlyListsOut}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="quarter" />
                    <YAxis />
                    <RechartsTooltip />
                    <Legend />
                    <Bar dataKey="lists" fill="#6366f1" name="Lists" />
                    <Bar dataKey="conversions" fill="#f97316" name="Conversions" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
          {data.dashboard.criticalActions.length > 0 && (
            <Card className="border-white/20 dark:border-white/10 bg-white/70 dark:bg-white/[0.06] backdrop-blur-xl">
              <CardHeader>
                <CardTitle className="text-red-800 flex items-center gap-2">
                  <AlertCircle className="h-5 w-5" />
                  Critical Actions Required
                  <Tooltip>
                    <TooltipTrigger>
                      <HelpCircle className="h-4 w-4 text-red-400 hover:text-red-600" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p><strong>What it shows:</strong> Priority actions that need immediate attention</p>
                      <p><strong>Categories:</strong> Calls, Agreements, Lists, Team performance</p>
                      <p><strong>Priority levels:</strong> Urgent (immediate), High (this week), Medium (this month)</p>
                    </TooltipContent>
                  </Tooltip>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {data.dashboard.criticalActions.slice(0, 3).map((action: any, index: number) => (
                    <div key={index} className="flex items-start gap-3">
                      <div className="flex-1">
                        <p className="font-medium">{action.action}</p>
                        <p className="text-sm text-muted-foreground">
                          {action.deadline && `Deadline: ${action.deadline}`}
                          {action.metric && ` • Count: ${action.metric}`}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
    </>
  );
} 