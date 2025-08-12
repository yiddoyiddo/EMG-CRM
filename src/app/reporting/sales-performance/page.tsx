'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Navbar } from '@/components/ui/navbar';
import { 
  Phone, 
  FileText, 
  Users, 
  TrendingUp, 
  TrendingDown, 
  AlertCircle, 
  CheckCircle, 
  Clock,
  Target,
  DollarSign,
  Calendar,
  BarChart3,
  PieChart,
  Activity,
  Zap
} from 'lucide-react';

interface KPI {
  current: number;
  target: number;
  trend: 'up' | 'down' | 'stable';
  status: 'excellent' | 'good' | 'needs_attention' | 'critical';
}

interface ExecutiveDashboard {
  kpis: {
    steadyCallVolume: KPI;
    agreementRate: KPI;
    listsOut: KPI;
    overallConversion: KPI;
  };
  teamPerformance: {
    totalBDRs: number;
    activeBDRs: number;
    topPerformers: string[];
    needsSupport: string[];
    benchmarkMetrics: {
      avgCallsPerWeek: number;
      avgAgreementsPerMonth: number;
      avgListsPerMonth: number;
      teamConversionRate: number;
    };
  };
  pipelineHealth: {
    upcomingCalls: {
      nextWeek: number;
      next2Weeks: number;
      total: number;
    };
    pendingAgreements: {
      proposalsAwaitingResponse: number;
      agreementsAwaitingLists: number;
      overduePartnerLists: number;
    };
    activeListsOut: {
      total: number;
      smallLists: number;
      mediumLists: number;
      largeLists: number;
      averageListSize: number;
    };
    conversionFunnel: {
      callsBooked: number;
      callsConducted: number;
      proposalsSent: number;
      agreementsSigned: number;
      listsSent: number;
      salesGenerated: number;
    };
  };
  trends: {
    weeklyCallVolume: Array<{
      week: string;
      calls: number;
      target: number;
      variance: number;
    }>;
    monthlyAgreements: Array<{
      month: string;
      agreements: number;
      target: number;
      variance: number;
    }>;
  };
  criticalActions: Array<{
    priority: 'urgent' | 'high' | 'medium';
    category: string;
    action: string;
    assignedTo?: string;
    metric?: number;
    deadline?: string;
  }>;
  financialSummary: {
    monthlyRevenue: number;
    quarterlyRevenue: number;
    revenuePerBDR: number;
    revenuePerCall: number;
    revenuePerList: number;
    forecastAccuracy: number;
  };
  predictions: {
    expectedCallsNextWeek: number;
    expectedAgreementsNextMonth: number;
    expectedRevenueNextQuarter: number;
    riskFactors: string[];
    opportunities: string[];
  };
}

export default function SalesPerformancePage() {
  const [dashboardData, setDashboardData] = useState<ExecutiveDashboard | null>(null);
  const [callVolumeData, setCallVolumeData] = useState<any>(null);
  const [agreementData, setAgreementData] = useState<any>(null);
  const [partnerListData, setPartnerListData] = useState<any>(null);
  const [selectedBDR, setSelectedBDR] = useState<string>('all');
  const [selectedPeriod, setSelectedPeriod] = useState<string>('current');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAllReportingData();
  }, [selectedBDR, selectedPeriod]);

  const fetchAllReportingData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const bdrParam = selectedBDR !== 'all' ? `?bdr=${selectedBDR}` : '';
      const periodParam = selectedPeriod !== 'current' ? `?period=${selectedPeriod}` : '';
      
      const [dashboardRes, callVolumeRes, agreementRes, partnerListRes] = await Promise.all([
        fetch(`/api/reporting/executive-dashboard${periodParam}`),
        fetch(`/api/reporting/call-volume${bdrParam}`),
        fetch(`/api/reporting/agreement-tracking${bdrParam}`),
        fetch(`/api/reporting/partner-list-analytics${bdrParam}`)
      ]);

      if (!dashboardRes.ok || !callVolumeRes.ok || !agreementRes.ok || !partnerListRes.ok) {
        throw new Error('Failed to fetch reporting data');
      }

      const [dashboard, callVolume, agreement, partnerList] = await Promise.all([
        dashboardRes.json(),
        callVolumeRes.json(),
        agreementRes.json(),
        partnerListRes.json()
      ]);

      setDashboardData(dashboard.dashboard);
      setCallVolumeData(callVolume);
      setAgreementData(agreement);
      setPartnerListData(partnerList);
    } catch (err) {
      console.error('Error fetching reporting data:', err);
      setError('Failed to load reporting data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'excellent': return 'text-green-600 bg-green-50 border-green-200';
      case 'good': return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'needs_attention': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'critical': return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up': return <TrendingUp className="h-4 w-4 text-green-600" />;
      case 'down': return <TrendingDown className="h-4 w-4 text-red-600" />;
      default: return <Activity className="h-4 w-4 text-gray-600" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800 border-red-300';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Activity className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Loading comprehensive sales performance data...</p>
        </div>
      </div>
    );
  }

  if (error || !dashboardData) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-4" />
          <p className="text-red-600">{error || 'Failed to load dashboard data'}</p>
          <Button onClick={fetchAllReportingData} className="mt-4">
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <Navbar />
      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Sales Performance Dashboard</h1>
          <p className="text-gray-600 mt-1">Comprehensive view of call volume, agreements, and partner list performance</p>
        </div>
        
        <div className="flex gap-4">
          <Select value={selectedBDR} onValueChange={setSelectedBDR}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Select BDR" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All BDRs</SelectItem>
              {dashboardData.teamPerformance.topPerformers.map(bdr => (
                <SelectItem key={bdr} value={bdr}>{bdr}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder="Period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="current">Current</SelectItem>
              <SelectItem value="historical">Historical</SelectItem>
              <SelectItem value="forecast">Forecast</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Key Performance Indicators */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Call Volume KPI */}
        <Card className={`border-2 ${getStatusColor(dashboardData.kpis.steadyCallVolume.status)}`}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Phone className="h-4 w-4" />
              Call Volume (This Week)
              {getTrendIcon(dashboardData.kpis.steadyCallVolume.trend)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardData.kpis.steadyCallVolume.current}</div>
            <Progress 
              value={(dashboardData.kpis.steadyCallVolume.current / dashboardData.kpis.steadyCallVolume.target) * 100} 
              className="mt-2" 
            />
            <p className="text-xs text-gray-600 mt-1">
              Target: {dashboardData.kpis.steadyCallVolume.target}
            </p>
          </CardContent>
        </Card>

        {/* Agreements KPI */}
        <Card className={`border-2 ${getStatusColor(dashboardData.kpis.agreementRate.status)}`}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Agreements (This Month)
              {getTrendIcon(dashboardData.kpis.agreementRate.trend)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardData.kpis.agreementRate.current}</div>
            <Progress 
              value={(dashboardData.kpis.agreementRate.current / dashboardData.kpis.agreementRate.target) * 100} 
              className="mt-2" 
            />
            <p className="text-xs text-gray-600 mt-1">
              Target: {dashboardData.kpis.agreementRate.target}
            </p>
          </CardContent>
        </Card>

        {/* Lists Out KPI */}
        <Card className={`border-2 ${getStatusColor(dashboardData.kpis.listsOut.status)}`}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Users className="h-4 w-4" />
              Lists Out (This Month)
              {getTrendIcon(dashboardData.kpis.listsOut.trend)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardData.kpis.listsOut.current}</div>
            <Progress 
              value={(dashboardData.kpis.listsOut.current / dashboardData.kpis.listsOut.target) * 100} 
              className="mt-2" 
            />
            <p className="text-xs text-gray-600 mt-1">
              Target: {dashboardData.kpis.listsOut.target}
            </p>
          </CardContent>
        </Card>

        {/* Overall Conversion KPI */}
        <Card className={`border-2 ${getStatusColor(dashboardData.kpis.overallConversion.status)}`}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Target className="h-4 w-4" />
              Conversion Rate
              {getTrendIcon(dashboardData.kpis.overallConversion.trend)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardData.kpis.overallConversion.current}%</div>
            <Progress 
              value={(dashboardData.kpis.overallConversion.current / dashboardData.kpis.overallConversion.target) * 100} 
              className="mt-2" 
            />
            <p className="text-xs text-gray-600 mt-1">
              Target: {dashboardData.kpis.overallConversion.target}%
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Critical Actions */}
      {dashboardData.criticalActions.length > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="text-red-800 flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Critical Actions Required
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {dashboardData.criticalActions.slice(0, 3).map((action, index) => (
                <div key={index} className="flex items-start gap-3">
                  <Badge className={`${getPriorityColor(action.priority)} text-xs`}>
                    {action.priority.toUpperCase()}
                  </Badge>
                  <div className="flex-1">
                    <p className="font-medium">{action.action}</p>
                    <p className="text-sm text-gray-600">
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

      {/* Main Tabs */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="calls">Call Volume</TabsTrigger>
          <TabsTrigger value="agreements">Agreements</TabsTrigger>
          <TabsTrigger value="lists">Partner Lists</TabsTrigger>
          <TabsTrigger value="team">Team Performance</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Pipeline Health */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Pipeline Health
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span>Upcoming Calls (Next Week)</span>
                  <Badge variant="outline">{dashboardData.pipelineHealth.upcomingCalls.nextWeek}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span>Active Lists Out</span>
                  <Badge variant="outline">{dashboardData.pipelineHealth.activeListsOut.total}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span>Overdue Partner Lists</span>
                  <Badge className={dashboardData.pipelineHealth.pendingAgreements.overduePartnerLists > 0 ? "bg-red-100 text-red-800" : ""}>
                    {dashboardData.pipelineHealth.pendingAgreements.overduePartnerLists}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span>Average List Size</span>
                  <Badge variant="outline">{dashboardData.pipelineHealth.activeListsOut.averageListSize}</Badge>
                </div>
              </CardContent>
            </Card>

            {/* Financial Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Financial Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span>Monthly Revenue</span>
                  <Badge variant="outline">£{dashboardData.financialSummary.monthlyRevenue.toLocaleString()}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span>Revenue per BDR</span>
                  <Badge variant="outline">£{dashboardData.financialSummary.revenuePerBDR.toLocaleString()}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span>Revenue per Call</span>
                  <Badge variant="outline">£{dashboardData.financialSummary.revenuePerCall.toLocaleString()}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span>Revenue per List</span>
                  <Badge variant="outline">£{dashboardData.financialSummary.revenuePerList.toLocaleString()}</Badge>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Conversion Funnel */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div>
                  <span>Conversion Funnel</span>
                  <CardDescription className="mt-1">Track leads through each stage of the sales process</CardDescription>
                </div>
                <Link href="/finance">
                  <Button variant="outline" className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Finance Overview
                  </Button>
                </Link>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{dashboardData.pipelineHealth.conversionFunnel.callsBooked}</div>
                  <div className="text-sm text-gray-600">Calls Booked</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{dashboardData.pipelineHealth.conversionFunnel.callsConducted}</div>
                  <div className="text-sm text-gray-600">Calls Conducted</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-yellow-600">{dashboardData.pipelineHealth.conversionFunnel.proposalsSent}</div>
                  <div className="text-sm text-gray-600">Proposals Sent</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">{dashboardData.pipelineHealth.conversionFunnel.agreementsSigned}</div>
                  <div className="text-sm text-gray-600">Agreements</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">{dashboardData.pipelineHealth.conversionFunnel.listsSent}</div>
                  <div className="text-sm text-gray-600">Lists Sent</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-700">{dashboardData.pipelineHealth.conversionFunnel.salesGenerated}</div>
                  <div className="text-sm text-gray-600">Sales</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Predictions */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5" />
                  Predictions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span>Expected Calls Next Week</span>
                  <Badge variant="outline">{dashboardData.predictions.expectedCallsNextWeek}</Badge>
                </div>
                <div className="flex justify-between">
                  <span>Expected Agreements Next Month</span>
                  <Badge variant="outline">{dashboardData.predictions.expectedAgreementsNextMonth}</Badge>
                </div>
                <div className="flex justify-between">
                  <span>Expected Revenue Next Quarter</span>
                  <Badge variant="outline">£{dashboardData.predictions.expectedRevenueNextQuarter.toLocaleString()}</Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Insights & Opportunities</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {dashboardData.predictions.opportunities.length > 0 && (
                  <div>
                    <h4 className="font-medium text-green-700 mb-2">Opportunities</h4>
                    {dashboardData.predictions.opportunities.slice(0, 2).map((opportunity, index) => (
                      <p key={index} className="text-sm text-green-600">• {opportunity}</p>
                    ))}
                  </div>
                )}
                {dashboardData.predictions.riskFactors.length > 0 && (
                  <div>
                    <h4 className="font-medium text-red-700 mb-2">Risk Factors</h4>
                    {dashboardData.predictions.riskFactors.slice(0, 2).map((risk, index) => (
                      <p key={index} className="text-sm text-red-600">• {risk}</p>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Call Volume Tab */}
        <TabsContent value="calls">
          <Card>
            <CardHeader>
              <CardTitle>Call Volume Analysis</CardTitle>
              <CardDescription>Detailed analysis of call scheduling, execution, and conversion</CardDescription>
            </CardHeader>
            <CardContent>
              {callVolumeData ? (
                <div className="space-y-6">
                  {/* Call Volume Trends */}
                  <div>
                    <h3 className="text-lg font-medium mb-4">Weekly Call Volume Trend</h3>
                    <div className="grid grid-cols-4 gap-4">
                      {dashboardData.trends.weeklyCallVolume.map((week, index) => (
                        <div key={index} className="text-center p-4 border rounded-lg">
                          <div className="text-sm text-gray-600">{week.week}</div>
                          <div className="text-2xl font-bold mt-1">{week.calls}</div>
                          <div className="text-xs text-gray-500">Target: {week.target}</div>
                          <div className={`text-xs mt-1 ${week.variance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {week.variance >= 0 ? '+' : ''}{week.variance}%
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Team Call Performance */}
                  <div>
                    <h3 className="text-lg font-medium mb-4">Team Call Performance</h3>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="text-center p-4 border rounded-lg">
                        <div className="text-2xl font-bold text-blue-600">{callVolumeData.teamSummary?.totalCallsBookedThisWeek || 0}</div>
                        <div className="text-sm text-gray-600">Calls Booked This Week</div>
                      </div>
                      <div className="text-center p-4 border rounded-lg">
                        <div className="text-2xl font-bold text-green-600">{callVolumeData.teamSummary?.totalCallsConductedThisWeek || 0}</div>
                        <div className="text-sm text-gray-600">Calls Conducted This Week</div>
                      </div>
                      <div className="text-center p-4 border rounded-lg">
                        <div className="text-2xl font-bold text-purple-600">{callVolumeData.teamSummary?.totalUpcomingCalls || 0}</div>
                        <div className="text-sm text-gray-600">Upcoming Calls</div>
                      </div>
                      <div className="text-center p-4 border rounded-lg">
                        <div className="text-2xl font-bold text-orange-600">{Math.round(callVolumeData.teamSummary?.teamCallToAgreementRate || 0)}%</div>
                        <div className="text-sm text-gray-600">Call to Agreement Rate</div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <p>Loading call volume data...</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Agreements Tab */}
        <TabsContent value="agreements">
          <Card>
            <CardHeader>
              <CardTitle>Agreement Tracking</CardTitle>
              <CardDescription>Monitor agreements, partner list deployment, and conversion timing</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Monthly Agreement Trends */}
                <div>
                  <h3 className="text-lg font-medium mb-4">Monthly Agreement Trend</h3>
                  <div className="grid grid-cols-4 gap-4">
                    {dashboardData.trends.monthlyAgreements.map((month, index) => (
                      <div key={index} className="text-center p-4 border rounded-lg">
                        <div className="text-sm text-gray-600">{month.month}</div>
                        <div className="text-2xl font-bold mt-1">{month.agreements}</div>
                        <div className="text-xs text-gray-500">Target: {month.target}</div>
                        <div className={`text-xs mt-1 ${month.variance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {month.variance >= 0 ? '+' : ''}{month.variance}%
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Agreement Status */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  <div className="text-center p-6 border rounded-lg bg-yellow-50">
                    <div className="text-3xl font-bold text-yellow-600">{dashboardData.pipelineHealth.pendingAgreements.proposalsAwaitingResponse}</div>
                    <div className="text-sm text-gray-600 mt-2">Proposals Awaiting Response</div>
                  </div>
                  <div className="text-center p-6 border rounded-lg bg-blue-50">
                    <div className="text-3xl font-bold text-blue-600">{dashboardData.pipelineHealth.pendingAgreements.agreementsAwaitingLists}</div>
                    <div className="text-sm text-gray-600 mt-2">Agreements Awaiting Lists</div>
                  </div>
                  <div className="text-center p-6 border rounded-lg bg-red-50">
                    <div className="text-3xl font-bold text-red-600">{dashboardData.pipelineHealth.pendingAgreements.overduePartnerLists}</div>
                    <div className="text-sm text-gray-600 mt-2">Overdue Partner Lists</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Partner Lists Tab */}
        <TabsContent value="lists">
          <Card>
            <CardHeader>
              <CardTitle>Partner List Analytics</CardTitle>
              <CardDescription>Analysis of list sizes, conversion rates, and performance optimization</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* List Size Distribution */}
                <div>
                  <h3 className="text-lg font-medium mb-4">Active Lists by Size</h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center p-6 border rounded-lg">
                      <div className="text-3xl font-bold text-green-600">{dashboardData.pipelineHealth.activeListsOut.smallLists}</div>
                      <div className="text-sm text-gray-600 mt-2">Small Lists (3-8 partners)</div>
                    </div>
                    <div className="text-center p-6 border rounded-lg">
                      <div className="text-3xl font-bold text-blue-600">{dashboardData.pipelineHealth.activeListsOut.mediumLists}</div>
                      <div className="text-sm text-gray-600 mt-2">Medium Lists (9-15 partners)</div>
                    </div>
                    <div className="text-center p-6 border rounded-lg">
                      <div className="text-3xl font-bold text-purple-600">{dashboardData.pipelineHealth.activeListsOut.largeLists}</div>
                      <div className="text-sm text-gray-600 mt-2">Large Lists (16+ partners)</div>
                    </div>
                  </div>
                </div>

                {/* Partner List Performance */}
                {partnerListData && (
                  <div>
                    <h3 className="text-lg font-medium mb-4">Team Partner List Performance</h3>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="text-center p-4 border rounded-lg">
                        <div className="text-2xl font-bold text-blue-600">{partnerListData.teamSummary?.totalActiveListsOut || 0}</div>
                        <div className="text-sm text-gray-600">Active Lists Out</div>
                      </div>
                      <div className="text-center p-4 border rounded-lg">
                        <div className="text-2xl font-bold text-green-600">{Math.round(partnerListData.teamSummary?.teamAverageListSize || 0)}</div>
                        <div className="text-sm text-gray-600">Average List Size</div>
                      </div>
                      <div className="text-center p-4 border rounded-lg">
                        <div className="text-2xl font-bold text-purple-600">{Math.round(partnerListData.teamSummary?.teamOverallConversionRate || 0)}%</div>
                        <div className="text-sm text-gray-600">Overall Conversion Rate</div>
                      </div>
                      <div className="text-center p-4 border rounded-lg">
                        <div className="text-2xl font-bold text-orange-600">£{Math.round(partnerListData.teamSummary?.teamTotalRevenue || 0).toLocaleString()}</div>
                        <div className="text-sm text-gray-600">Total Revenue</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Team Performance Tab */}
        <TabsContent value="team">
          <Card>
            <CardHeader>
              <CardTitle>Team Performance</CardTitle>
              <CardDescription>Individual and team performance metrics and benchmarks</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Team Overview */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">{dashboardData.teamPerformance.totalBDRs}</div>
                    <div className="text-sm text-gray-600">Total BDRs</div>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold text-green-600">{dashboardData.teamPerformance.activeBDRs}</div>
                    <div className="text-sm text-gray-600">Active BDRs</div>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold text-purple-600">{dashboardData.teamPerformance.topPerformers.length}</div>
                    <div className="text-sm text-gray-600">Top Performers</div>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold text-orange-600">{dashboardData.teamPerformance.needsSupport.length}</div>
                    <div className="text-sm text-gray-600">Need Support</div>
                  </div>
                </div>

                {/* Benchmark Metrics */}
                <div>
                  <h3 className="text-lg font-medium mb-4">Team Benchmarks</h3>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="text-center p-4 border rounded-lg">
                      <div className="text-2xl font-bold">{dashboardData.teamPerformance.benchmarkMetrics.avgCallsPerWeek}</div>
                      <div className="text-sm text-gray-600">Avg Calls/Week</div>
                    </div>
                    <div className="text-center p-4 border rounded-lg">
                      <div className="text-2xl font-bold">{dashboardData.teamPerformance.benchmarkMetrics.avgAgreementsPerMonth}</div>
                      <div className="text-sm text-gray-600">Avg Agreements/Month</div>
                    </div>
                    <div className="text-center p-4 border rounded-lg">
                      <div className="text-2xl font-bold">{dashboardData.teamPerformance.benchmarkMetrics.avgListsPerMonth}</div>
                      <div className="text-sm text-gray-600">Avg Lists/Month</div>
                    </div>
                    <div className="text-center p-4 border rounded-lg">
                      <div className="text-2xl font-bold">{dashboardData.teamPerformance.benchmarkMetrics.teamConversionRate}%</div>
                      <div className="text-sm text-gray-600">Team Conversion Rate</div>
                    </div>
                  </div>
                </div>

                {/* Top Performers */}
                {dashboardData.teamPerformance.topPerformers.length > 0 && (
                  <div>
                    <h3 className="text-lg font-medium mb-4">Top Performers</h3>
                    <div className="flex flex-wrap gap-2">
                      {dashboardData.teamPerformance.topPerformers.map((performer, index) => (
                        <Badge key={index} className="bg-green-100 text-green-800">
                          {performer}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Need Support */}
                {dashboardData.teamPerformance.needsSupport.length > 0 && (
                  <div>
                    <h3 className="text-lg font-medium mb-4">Team Members Needing Support</h3>
                    <div className="flex flex-wrap gap-2">
                      {dashboardData.teamPerformance.needsSupport.map((member, index) => (
                        <Badge key={index} className="bg-yellow-100 text-yellow-800">
                          {member}
                        </Badge>
                      ))}
                    </div>
                  </div>
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