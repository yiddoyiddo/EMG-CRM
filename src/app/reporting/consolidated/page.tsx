'use client'
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Navbar } from "@/components/ui/navbar";
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, 
  LineChart, Line, PieChart, Pie, Cell,
  FunnelChart, Funnel, LabelList,
  RadialBarChart, RadialBar, Legend,
  AreaChart, Area
} from 'recharts';
import { TrendingUp, TrendingDown, Phone, Clock, Target, DollarSign, Calendar, Users, Activity, AlertTriangle } from 'lucide-react';

// Enhanced interface to match the new API
interface ConversionFunnelStage {
  stage: string;
  count: number;
  percentage: number;
  conversionRate: number;
  teamAverage: number;
  dropoffRate: number;
}

interface DetailedBDRMetrics {
  bdr: string;
  totalItems: number;
  conversionEfficiency: number;
  activityScore: number;
  conversionFunnel: ConversionFunnelStage[];
  thisWeek: {
    callsProposed: number;
    callsBooked: number;
    proposalsSent: number;
    agreementsSigned: number;
    listsOut: number;
    sold: number;
  };
  thisMonth: {
    callsProposed: number;
    callsBooked: number;
    proposalsSent: number;
    agreementsSigned: number;
    listsOut: number;
    sold: number;
  };
  forecast: {
    upcomingCalls: number;
    pendingAgreements: number;
    listsOut: number;
    projectedClosures: number;
    nextWeekCallsScheduled: number;
    next30DaysRevenuePotential: number;
  };
  weeklyTarget: number;
  weeklyProgress: number;
  monthlyTarget: number;
  monthlyProgress: number;
  callToProposalRate: number;
  proposalToAgreementRate: number;
  agreementToSoldRate: number;
  overallConversionRate: number;
  categoryDistribution: Array<{
    category: string;
    count: number;
    percentage: number;
  }>;
  weeklyTrend: Array<{
    week: string;
    callsProposed: number;
    callsBooked: number;
    proposalsSent: number;
    agreements: number;
    sold: number;
  }>;
  vsTeamAverage: {
    conversionRate: { value: number; comparison: 'above' | 'below' | 'average' };
    activityScore: { value: number; comparison: 'above' | 'below' | 'average' };
    efficiency: { value: number; comparison: 'above' | 'below' | 'average' };
  };
}

interface EnhancedUnifiedReportingData {
  executiveOverview: {
    totalLeads: number;
    totalPipelineItems: number;
    teamActivityScore: number;
    overallConversionRate: number;
    totalRevenuePotential: number;
    monthlyRecurringRevenue: number;
  };
  teamConversionFunnel: {
    stages: ConversionFunnelStage[];
    totalFunnelVolume: number;
    overallEfficiency: number;
    biggestDropoff: { stage: string; rate: number };
    'improvement opportunities': string[];
  };
  forecastMetrics: {
    upcomingCalls: {
      today: number;
      tomorrow: number;
      thisWeek: number;
      nextWeek: number;
      next30Days: number;
    };
    pendingAgreements: {
      total: number;
      profile: number;
      media: number;
      averageValue: number;
      totalValue: number;
    };
    listsOut: {
      total: number;
      thisWeek: number;
      averageDaysToClose: number;
      conversionRate: number;
    };
    revenue: {
      projectedThisMonth: number;
      projectedNext30Days: number;
      pipelineValue: number;
      weightedPipelineValue: number;
    };
  };
  bdrPerformance: DetailedBDRMetrics[];
  teamAnalytics: {
    topPerformer: { bdr: string; metric: string; value: number };
    needsAttention: { bdr: string; issue: string };
    teamAverages: {
      conversionRate: number;
      activityScore: number;
      callToProposalRate: number;
      proposalToAgreementRate: number;
      agreementToSoldRate: number;
    };
    weekOverWeekGrowth: number;
    monthOverMonthGrowth: number;
  };
  activityAnalysis: {
    dailyMetrics: Array<{
      date: string;
      callsProposed: number;
      callsBooked: number;
      proposalsSent: number;
      agreements: number;
      sold: number;
      totalActivity: number;
    }>;
    weeklyComparison: Array<{
      period: string;
      callsProposed: number;
      callsBooked: number;
      proposalsSent: number;
      agreements: number;
      sold: number;
    }>;
    activityHeatmap: Array<{
      bdr: string;
      day: string;
      activity: number;
    }>;
  };
  insights: {
    topOpportunities: string[];
    criticalAlerts: string[];
    recommendations: string[];
  };
}

export default function EnhancedReportingPage() {
  const [data, setData] = useState<EnhancedUnifiedReportingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedBdr, setSelectedBdr] = useState<string>('All Team');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/reporting/unified')
      .then(res => res.json())
      .then(data => {
        console.log('Received data:', data);
        if (data.error) {
          setError(data.error);
        } else {
          setData(data);
          if (data.bdrPerformance?.length > 0) {
            setSelectedBdr(data.bdrPerformance[0].bdr);
          }
        }
        setLoading(false);
      })
      .catch(error => {
        console.error('Error fetching unified reporting data:', error);
        setError(error.message);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading Enhanced Reporting Suite...</div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-red-600">Error loading reporting data: {error || 'Unknown error'}</div>
      </div>
    );
  }

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D', '#FFC658', '#FF7C7C'];
  
  const selectedBdrData = selectedBdr === 'All Team' 
    ? null 
    : data.bdrPerformance.find(bdr => bdr.bdr === selectedBdr);

  // Helper function to get comparison icon
  const getComparisonIcon = (comparison: 'above' | 'below' | 'average') => {
    switch (comparison) {
      case 'above': return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'below': return <TrendingDown className="h-4 w-4 text-red-500" />;
      default: return <Target className="h-4 w-4 text-gray-500" />;
    }
  };

  // Enhanced funnel visualization data
  const funnelVisualizationData = data.teamConversionFunnel.stages.map((stage, index) => ({
    name: stage.stage,
    value: stage.count,
    percentage: stage.percentage,
    fill: COLORS[index % COLORS.length],
    conversionRate: stage.conversionRate,
    dropoffRate: stage.dropoffRate
  }));

  return (
    <>
      <Navbar />
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text text-transparent">
            🚀 Enhanced Reporting Suite
          </h1>
          <p className="text-gray-600 mt-2">Complete conversion funnel analysis & forecasting</p>
        </div>
        <div className="flex items-center gap-4">
          <Select value={selectedBdr} onValueChange={setSelectedBdr}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Select BDR" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All Team">All Team</SelectItem>
              {data.bdrPerformance.map(bdr => (
                <SelectItem key={bdr.bdr} value={bdr.bdr}>{bdr.bdr}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Badge variant="default" className="bg-green-600">Live Data</Badge>
        </div>
      </div>

      {/* Critical Alerts */}
      {data.insights.criticalAlerts.length > 0 && (
        <Card className="mb-6 border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-700">
              <AlertTriangle className="h-5 w-5" />
              Critical Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {data.insights.criticalAlerts.map((alert, index) => (
                <div key={index} className="text-red-600">• {alert}</div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="overview">Executive</TabsTrigger>
          <TabsTrigger value="funnel">Conversion Funnel</TabsTrigger>
          <TabsTrigger value="forecast">Forecasting</TabsTrigger>
          <TabsTrigger value="individual">Individual BDR</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        {/* Executive Overview Tab */}
        <TabsContent value="overview">
          <div className="space-y-6">
            {/* Executive KPIs */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Total Pipeline
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-blue-600">{data.executiveOverview.totalPipelineItems}</p>
                  <p className="text-sm text-blue-500 mt-1">{data.executiveOverview.totalLeads} leads in system</p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Target className="h-4 w-4" />
                    Conversion Rate
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-green-600">{data.executiveOverview.overallConversionRate.toFixed(1)}%</p>
                  <p className="text-sm text-green-500 mt-1">Team efficiency: {data.teamConversionFunnel.overallEfficiency}%</p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Revenue Potential
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-purple-600">${(data.executiveOverview.totalRevenuePotential / 1000).toFixed(0)}K</p>
                  <p className="text-sm text-purple-500 mt-1">Monthly: ${(data.executiveOverview.monthlyRecurringRevenue / 1000).toFixed(0)}K</p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Activity className="h-4 w-4" />
                    Team Activity
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-orange-600">{data.executiveOverview.teamActivityScore.toFixed(1)}%</p>
                  <p className="text-sm text-orange-500 mt-1">Activity score</p>
                </CardContent>
              </Card>
            </div>

            {/* Top Opportunities & Team Performance */}
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-green-500" />
                    Top Opportunities
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {data.insights.topOpportunities.length > 0 ? (
                      data.insights.topOpportunities.map((opportunity, index) => (
                        <div key={index} className="p-3 bg-green-50 rounded-lg border border-green-200">
                          <p className="text-green-700 font-medium">🎯 {opportunity}</p>
                        </div>
                      ))
                    ) : (
                      <p className="text-gray-500">No immediate opportunities identified</p>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Team Performance Snapshot</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                      <span className="font-medium">Top Performer</span>
                      <div className="text-right">
                        <p className="font-bold text-blue-600">{data.teamAnalytics.topPerformer.bdr}</p>
                        <p className="text-sm text-blue-500">{data.teamAnalytics.topPerformer.value}% {data.teamAnalytics.topPerformer.metric}</p>
                      </div>
                    </div>
                    
                    {data.teamAnalytics.needsAttention.bdr && (
                      <div className="flex justify-between items-center p-3 bg-yellow-50 rounded-lg">
                        <span className="font-medium">Needs Attention</span>
                        <div className="text-right">
                          <p className="font-bold text-yellow-600">{data.teamAnalytics.needsAttention.bdr}</p>
                          <p className="text-sm text-yellow-600">{data.teamAnalytics.needsAttention.issue}</p>
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-4 pt-2">
                      <div className="text-center">
                        <p className="text-2xl font-bold text-green-600">{data.teamAnalytics.teamAverages.conversionRate.toFixed(1)}%</p>
                        <p className="text-sm text-gray-500">Avg Conversion</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-blue-600">{data.teamAnalytics.teamAverages.activityScore.toFixed(1)}%</p>
                        <p className="text-sm text-gray-500">Avg Activity</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Daily Activity Trends */}
            <Card>
              <CardHeader>
                <CardTitle>Daily Activity Trends</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={data.activityAnalysis.dailyMetrics}>
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Area key="daily-calls-proposed" type="monotone" dataKey="callsProposed" stackId="1" stroke="#8884d8" fill="#8884d8" name="Calls Proposed" />
                    <Area key="daily-calls-booked" type="monotone" dataKey="callsBooked" stackId="1" stroke="#82ca9d" fill="#82ca9d" name="Calls Booked" />
                    <Area key="daily-proposals-sent" type="monotone" dataKey="proposalsSent" stackId="1" stroke="#ffc658" fill="#ffc658" name="Proposals" />
                    <Area key="daily-agreements" type="monotone" dataKey="agreements" stackId="1" stroke="#ff7c7c" fill="#ff7c7c" name="Agreements" />
                    <Area key="daily-sold" type="monotone" dataKey="sold" stackId="1" stroke="#00C49F" fill="#00C49F" name="Daily Sales" />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Conversion Funnel Tab */}
        <TabsContent value="funnel">
          <div className="space-y-6">
            {/* Funnel Overview */}
            <div className="grid gap-6 md:grid-cols-3">
              <Card className="md:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5" />
                    Complete Conversion Funnel
                  </CardTitle>
                  <p className="text-sm text-gray-600">
                    Total Volume: {data.teamConversionFunnel.totalFunnelVolume} | 
                    Overall Efficiency: {data.teamConversionFunnel.overallEfficiency}%
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {data.teamConversionFunnel.stages.map((stage, index) => (
                      <div key={`team-${stage.stage}-${index}`} className="space-y-2">
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-3">
                            <span className="font-medium text-lg">{stage.stage}</span>
                            <Badge variant="outline">{stage.count}</Badge>
                            {stage.dropoffRate > 0 && (
                              <Badge variant="destructive" className="text-xs">
                                -{stage.dropoffRate}% dropoff
                              </Badge>
                            )}
                          </div>
                          <div className="text-right">
                            <p className="font-bold">{stage.percentage.toFixed(1)}%</p>
                            {index > 0 && stage.conversionRate > 0 && (
                              <p className="text-sm text-gray-500">{stage.conversionRate.toFixed(1)}% conversion</p>
                            )}
                          </div>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-6 relative overflow-hidden">
                          <div 
                            className={`h-6 rounded-full transition-all duration-500 ${
                              index === 0 ? 'bg-blue-500' :
                              index === 1 ? 'bg-green-500' :
                              index === 2 ? 'bg-yellow-500' :
                              index === 3 ? 'bg-purple-500' :
                              index === 4 ? 'bg-orange-500' :
                              index === 5 ? 'bg-emerald-500' : 'bg-red-500'
                            }`}
                            style={{ width: `${Math.max(stage.percentage, 2)}%` }}
                          >
                            <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent" />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Funnel Analysis</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                      <h4 className="font-medium text-red-700 mb-2">Biggest Dropoff</h4>
                      <p className="text-red-600">{data.teamConversionFunnel.biggestDropoff.stage}</p>
                      <p className="text-2xl font-bold text-red-700">{data.teamConversionFunnel.biggestDropoff.rate.toFixed(1)}%</p>
                    </div>

                    <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                      <h4 className="font-medium text-blue-700 mb-2">Improvements</h4>
                      <div className="space-y-2">
                        {data.teamConversionFunnel['improvement opportunities'].length > 0 ? (
                          data.teamConversionFunnel['improvement opportunities'].map((opportunity, index) => (
                            <p key={index} className="text-blue-600 text-sm">• {opportunity}</p>
                          ))
                        ) : (
                          <p className="text-blue-600 text-sm">Funnel is performing well</p>
                        )}
                      </div>
                    </div>

                    <ResponsiveContainer width="100%" height={200}>
                      <PieChart>
                        <Pie
                          data={funnelVisualizationData.filter(d => d.name !== 'Declined/Q&A')}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          label={({name, value}) => `${name}: ${value}`}
                        >
                          {funnelVisualizationData.map((entry, index) => (
                            <Cell key={`cell-${entry.name}-${index}`} fill={entry.fill} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* BDR Funnel Comparison */}
            <Card>
              <CardHeader>
                <CardTitle>BDR Conversion Rate Comparison</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={data.bdrPerformance}>
                    <XAxis dataKey="bdr" />
                    <YAxis />
                    <Tooltip />
                    <Bar key="conversion-call-to-proposal" dataKey="callToProposalRate" fill="#8884d8" name="Call → Proposal %" />
                    <Bar key="conversion-proposal-to-agreement" dataKey="proposalToAgreementRate" fill="#82ca9d" name="Proposal → Agreement %" />
                    <Bar key="conversion-agreement-to-sold" dataKey="agreementToSoldRate" fill="#ffc658" name="Agreement → Sold %" />
                    <Bar key="conversion-overall" dataKey="overallConversionRate" fill="#ff7c7c" name="Overall Conversion %" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Forecasting Tab */}
        <TabsContent value="forecast">
          <div className="space-y-6">
            {/* Primary Forecasting Metrics */}
            <div className="grid gap-6 md:grid-cols-3">
              <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-blue-700">
                    <Phone className="h-5 w-5" />
                    Upcoming Calls
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span>Today:</span>
                      <span className="font-bold text-2xl text-blue-600">{data.forecastMetrics.upcomingCalls.today}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Tomorrow:</span>
                      <span className="font-bold text-blue-600">{data.forecastMetrics.upcomingCalls.tomorrow}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between">
                      <span>This Week:</span>
                      <span className="font-bold text-blue-600">{data.forecastMetrics.upcomingCalls.thisWeek}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Next Week:</span>
                      <span className="font-bold text-blue-600">{data.forecastMetrics.upcomingCalls.nextWeek}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Next 30 Days:</span>
                      <span className="font-bold text-xl text-blue-700">{data.forecastMetrics.upcomingCalls.next30Days}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-green-700">
                    <Target className="h-5 w-5" />
                    Pending Agreements
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="text-center">
                      <p className="text-4xl font-bold text-green-600">{data.forecastMetrics.pendingAgreements.total}</p>
                      <p className="text-sm text-green-600">Total Pending</p>
                    </div>
                    <Separator />
                    <div className="flex justify-between">
                      <span>Profile:</span>
                      <span className="font-bold text-green-600">{data.forecastMetrics.pendingAgreements.profile}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Average Value:</span>
                      <span className="font-bold text-green-600">${Math.round(data.forecastMetrics.pendingAgreements.averageValue).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Total Value:</span>
                      <span className="font-bold text-xl text-green-700">${Math.round(data.forecastMetrics.pendingAgreements.totalValue).toLocaleString()}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-purple-700">
                    <DollarSign className="h-5 w-5" />
                    Lists Out
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="text-center">
                      <p className="text-4xl font-bold text-purple-600">{data.forecastMetrics.listsOut.total}</p>
                      <p className="text-sm text-purple-600">Total Active</p>
                    </div>
                    <Separator />
                    <div className="flex justify-between">
                      <span>This Week:</span>
                      <span className="font-bold text-purple-600">{data.forecastMetrics.listsOut.thisWeek}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Avg Days to Close:</span>
                      <span className="font-bold text-purple-600">{data.forecastMetrics.listsOut.averageDaysToClose}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Conversion Rate:</span>
                      <span className="font-bold text-xl text-purple-700">{data.forecastMetrics.listsOut.conversionRate}%</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Revenue Projections */}
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5 text-green-500" />
                    Revenue Projections
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="p-4 bg-green-50 rounded-lg">
                      <div className="flex justify-between items-center">
                        <span className="font-medium">This Month</span>
                        <span className="text-2xl font-bold text-green-600">
                          ${(data.forecastMetrics.revenue.projectedThisMonth / 1000).toFixed(0)}K
                        </span>
                      </div>
                    </div>
                    <div className="p-4 bg-blue-50 rounded-lg">
                      <div className="flex justify-between items-center">
                        <span className="font-medium">Next 30 Days</span>
                        <span className="text-2xl font-bold text-blue-600">
                          ${(data.forecastMetrics.revenue.projectedNext30Days / 1000).toFixed(0)}K
                        </span>
                      </div>
                    </div>
                    <div className="p-4 bg-purple-50 rounded-lg">
                      <div className="flex justify-between items-center">
                        <span className="font-medium">Pipeline Value</span>
                        <span className="text-xl font-bold text-purple-600">
                          ${(data.forecastMetrics.revenue.pipelineValue / 1000).toFixed(0)}K
                        </span>
                      </div>
                      <div className="text-sm text-purple-500 mt-1">
                        Weighted: ${(data.forecastMetrics.revenue.weightedPipelineValue / 1000).toFixed(0)}K
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>BDR Forecast Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={data.bdrPerformance}>
                      <XAxis dataKey="bdr" />
                      <YAxis />
                      <Tooltip />
                      <Bar key="forecast-upcoming-calls" dataKey="forecast.upcomingCalls" fill="#8884d8" name="upcomingCalls" />
                      <Bar key="forecast-pending-agreements" dataKey="forecast.pendingAgreements" fill="#82ca9d" name="pendingAgreements" />
                      <Bar key="forecast-revenue-potential" dataKey="forecast.next30DaysRevenuePotential" fill="#ffc658" name="next30DaysRevenuePotential" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            {/* Recommendations */}
            <Card>
              <CardHeader>
                <CardTitle>📋 Recommendations</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-3">
                  {data.insights.recommendations.length > 0 ? (
                    data.insights.recommendations.map((recommendation, index) => (
                      <div key={index} className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                        <p className="text-blue-700">💡 {recommendation}</p>
                      </div>
                    ))
                  ) : (
                    <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                      <p className="text-green-700">✅ All metrics look good!</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Individual BDR Tab */}
        <TabsContent value="individual">
          <div className="space-y-6">
            {selectedBdrData ? (
              <>
                {/* BDR Overview */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="h-5 w-5" />
                      {selectedBdrData.bdr} - Complete Dashboard
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                      <div className="text-center p-4 bg-blue-50 rounded-lg">
                        <p className="text-3xl font-bold text-blue-600">{selectedBdrData.totalItems}</p>
                        <p className="text-sm text-blue-500">Total Pipeline Items</p>
                      </div>
                      <div className="text-center p-4 bg-green-50 rounded-lg">
                        <p className="text-3xl font-bold text-green-600">{selectedBdrData.conversionEfficiency}%</p>
                        <p className="text-sm text-green-500">Conversion Efficiency</p>
                      </div>
                      <div className="text-center p-4 bg-purple-50 rounded-lg">
                        <p className="text-3xl font-bold text-purple-600">{selectedBdrData.overallConversionRate}%</p>
                        <p className="text-sm text-purple-500">Overall Conversion</p>
                      </div>
                      <div className="text-center p-4 bg-orange-50 rounded-lg">
                        <p className="text-3xl font-bold text-orange-600">{selectedBdrData.activityScore}%</p>
                        <p className="text-sm text-orange-500">Activity Score</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* BDR Forecasting (Most Important) */}
                <div className="grid gap-6 md:grid-cols-3">
                  <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
                    <CardHeader>
                      <CardTitle className="text-blue-700 flex items-center gap-2">
                        <Phone className="h-5 w-5" />
                        Upcoming Calls
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="text-center">
                          <p className="text-4xl font-bold text-blue-600">{selectedBdrData.forecast.upcomingCalls}</p>
                          <p className="text-sm text-blue-600">Total Scheduled</p>
                        </div>
                        <Separator />
                        <div className="flex justify-between">
                          <span>Next Week:</span>
                          <span className="font-bold text-blue-600">{selectedBdrData.forecast.nextWeekCallsScheduled}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
                    <CardHeader>
                      <CardTitle className="text-green-700 flex items-center gap-2">
                        <Target className="h-5 w-5" />
                        Pending Agreements
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="text-center">
                          <p className="text-4xl font-bold text-green-600">{selectedBdrData.forecast.pendingAgreements}</p>
                          <p className="text-sm text-green-600">Ready to Close</p>
                        </div>
                        <Separator />
                        <div className="flex justify-between">
                          <span>Projected:</span>
                          <span className="font-bold text-green-600">{selectedBdrData.forecast.projectedClosures}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
                    <CardHeader>
                      <CardTitle className="text-purple-700 flex items-center gap-2">
                        <DollarSign className="h-5 w-5" />
                        Revenue Potential
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="text-center">
                          <p className="text-3xl font-bold text-purple-600">
                            ${(selectedBdrData.forecast.next30DaysRevenuePotential / 1000).toFixed(0)}K
                          </p>
                          <p className="text-sm text-purple-600">Next 30 Days</p>
                        </div>
                        <Separator />
                        <div className="flex justify-between">
                          <span>Lists Out:</span>
                          <span className="font-bold text-purple-600">{selectedBdrData.forecast.listsOut}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* BDR Performance vs Team */}
                <Card>
                  <CardHeader>
                    <CardTitle>Performance vs Team Average</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-4 md:grid-cols-3">
                      <div className="p-4 border rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium">Conversion Rate</h4>
                          {getComparisonIcon(selectedBdrData.vsTeamAverage.conversionRate.comparison)}
                        </div>
                        <div className="flex justify-between">
                          <span>You: {selectedBdrData.overallConversionRate}%</span>
                          <span>Team: {data.teamAnalytics.teamAverages.conversionRate.toFixed(1)}%</span>
                        </div>
                        <div className="text-sm text-gray-500 mt-1">
                          {selectedBdrData.vsTeamAverage.conversionRate.comparison === 'above' ? '📈 Above average' : 
                           selectedBdrData.vsTeamAverage.conversionRate.comparison === 'below' ? '📉 Below average' : '📊 Average'}
                        </div>
                      </div>
                      
                      <div className="p-4 border rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium">Activity Score</h4>
                          {getComparisonIcon(selectedBdrData.vsTeamAverage.activityScore.comparison)}
                        </div>
                        <div className="flex justify-between">
                          <span>You: {selectedBdrData.activityScore}%</span>
                          <span>Team: {data.teamAnalytics.teamAverages.activityScore.toFixed(1)}%</span>
                        </div>
                        <div className="text-sm text-gray-500 mt-1">
                          {selectedBdrData.vsTeamAverage.activityScore.comparison === 'above' ? '📈 Above average' : 
                           selectedBdrData.vsTeamAverage.activityScore.comparison === 'below' ? '📉 Below average' : '📊 Average'}
                        </div>
                      </div>
                      
                      <div className="p-4 border rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium">Efficiency Score</h4>
                          {getComparisonIcon(selectedBdrData.vsTeamAverage.efficiency.comparison)}
                        </div>
                        <div className="flex justify-between">
                          <span>You: {selectedBdrData.conversionEfficiency}%</span>
                          <span>Team: {data.teamConversionFunnel.overallEfficiency}%</span>
                        </div>
                        <div className="text-sm text-gray-500 mt-1">
                          {selectedBdrData.vsTeamAverage.efficiency.comparison === 'above' ? '📈 Above average' : '📉 Below average'}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* BDR Weekly Trend & Targets */}
                <div className="grid gap-6 md:grid-cols-2">
                  <Card>
                    <CardHeader>
                      <CardTitle>Weekly Performance Trend</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={selectedBdrData.weeklyTrend}>
                          <XAxis dataKey="week" />
                          <YAxis />
                          <Tooltip />
                          <Line key="weekly-calls-proposed" type="monotone" dataKey="callsProposed" stroke="#8884d8" name="Calls Proposed" strokeWidth={2} />
                          <Line key="weekly-calls-booked" type="monotone" dataKey="callsBooked" stroke="#82ca9d" name="Calls Booked" strokeWidth={2} />
                          <Line key="weekly-proposals-sent" type="monotone" dataKey="proposalsSent" stroke="#ffc658" name="Proposals" strokeWidth={2} />
                          <Line key="weekly-agreements" type="monotone" dataKey="agreements" stroke="#ff7c7c" name="Agreements" strokeWidth={2} />
                          <Line key="weekly-sold" type="monotone" dataKey="sold" stroke="#00C49F" name="Weekly Sales" strokeWidth={2} />
                        </LineChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Target Progress</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-6">
                        <div>
                          <div className="flex justify-between text-sm mb-2">
                            <span className="font-medium">Weekly Target</span>
                            <span>{selectedBdrData.weeklyProgress.toFixed(1)}% of {selectedBdrData.weeklyTarget}</span>
                          </div>
                          <Progress value={Math.min(selectedBdrData.weeklyProgress, 100)} className="h-4" />
                          <div className="flex justify-between text-xs text-gray-500 mt-1">
                            <span>{selectedBdrData.thisWeek.agreementsSigned} agreements this week</span>
                            <span>Target: {selectedBdrData.weeklyTarget}</span>
                          </div>
                        </div>

                        <div>
                          <div className="flex justify-between text-sm mb-2">
                            <span className="font-medium">Monthly Target</span>
                            <span>{selectedBdrData.monthlyProgress.toFixed(1)}% of {selectedBdrData.monthlyTarget}</span>
                          </div>
                          <Progress value={Math.min(selectedBdrData.monthlyProgress, 100)} className="h-4" />
                          <div className="flex justify-between text-xs text-gray-500 mt-1">
                            <span>{selectedBdrData.thisMonth.agreementsSigned} agreements this month</span>
                            <span>Target: {selectedBdrData.monthlyTarget}</span>
                          </div>
                        </div>

                        <div className="pt-4 border-t">
                          <h4 className="font-medium mb-3">This Week Summary</h4>
                          <div className="grid grid-cols-2 gap-3 text-sm">
                            <div className="text-center p-2 bg-blue-50 rounded">
                              <p className="font-bold text-blue-600">{selectedBdrData.thisWeek.callsProposed}</p>
                              <p className="text-blue-500">Calls Proposed</p>
                            </div>
                            <div className="text-center p-2 bg-green-50 rounded">
                              <p className="font-bold text-green-600">{selectedBdrData.thisWeek.callsBooked}</p>
                              <p className="text-green-500">Calls Booked</p>
                            </div>
                            <div className="text-center p-2 bg-yellow-50 rounded">
                              <p className="font-bold text-yellow-600">{selectedBdrData.thisWeek.proposalsSent}</p>
                              <p className="text-yellow-500">Proposals</p>
                            </div>
                            <div className="text-center p-2 bg-purple-50 rounded">
                              <p className="font-bold text-purple-600">{selectedBdrData.thisWeek.sold}</p>
                              <p className="text-purple-500">Sold</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* BDR Conversion Funnel */}
                <Card>
                  <CardHeader>
                    <CardTitle>{selectedBdrData.bdr}'s Conversion Funnel</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {selectedBdrData.conversionFunnel.map((stage, index) => (
                        <div key={`bdr-${stage.stage}-${index}`} className="space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="font-medium">{stage.stage}</span>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline">{stage.count}</Badge>
                              <span className="text-sm text-gray-500">{stage.percentage.toFixed(1)}%</span>
                            </div>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-4">
                            <div 
                              className={`h-4 rounded-full transition-all duration-300 ${
                                index === 0 ? 'bg-blue-500' :
                                index === 1 ? 'bg-green-500' :
                                index === 2 ? 'bg-yellow-500' :
                                index === 3 ? 'bg-purple-500' :
                                index === 4 ? 'bg-orange-500' :
                                index === 5 ? 'bg-emerald-500' : 'bg-red-500'
                              }`}
                              style={{ width: `${Math.max(stage.percentage, 2)}%` }}
                            ></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>Select a BDR for Individual Analysis</CardTitle>
                </CardHeader>
                <CardContent>
                  <p>Choose a BDR from the dropdown above to see their detailed performance metrics, forecasting data, and conversion funnel analysis.</p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* Performance Tab */}
        <TabsContent value="performance">
          <div className="space-y-6">
            {/* BDR Performance Leaderboard */}
            <Card>
              <CardHeader>
                <CardTitle>BDR Performance Leaderboard</CardTitle>
                <p className="text-sm text-gray-600">Ranked by conversion efficiency</p>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {data.bdrPerformance.map((bdr, index) => (
                    <div key={bdr.bdr} className="flex items-center justify-between p-4 border rounded-lg hover:shadow-md transition-shadow">
                      <div className="flex items-center gap-4">
                        <Badge variant={index < 2 ? "default" : "secondary"} className={
                          index === 0 ? "bg-yellow-500" : 
                          index === 1 ? "bg-gray-400" : 
                          index === 2 ? "bg-orange-500" : ""
                        }>
                          #{index + 1}
                        </Badge>
                        <span className="font-medium text-lg">{bdr.bdr}</span>
                      </div>
                      <div className="flex items-center gap-6">
                        <div className="text-center">
                          <p className="text-sm text-gray-500">Efficiency</p>
                          <p className="font-bold text-green-600">{bdr.conversionEfficiency}%</p>
                        </div>
                        <div className="text-center">
                          <p className="text-sm text-gray-500">Conversion</p>
                          <p className="font-bold text-blue-600">{bdr.overallConversionRate}%</p>
                        </div>
                        <div className="text-center">
                          <p className="text-sm text-gray-500">Pipeline</p>
                          <p className="font-bold">{bdr.totalItems}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-sm text-gray-500">This Month</p>
                          <p className="font-bold">{bdr.thisMonth.agreementsSigned} agreements</p>
                        </div>
                        <div className="text-center">
                          <p className="text-sm text-gray-500">Activity</p>
                          <p className="font-bold text-purple-600">{bdr.activityScore}%</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Team Performance Charts */}
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Weekly Progress Overview</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {data.bdrPerformance.slice(0, 5).map(bdr => (
                      <div key={bdr.bdr} className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="font-medium">{bdr.bdr}</span>
                          <span>{bdr.weeklyProgress.toFixed(1)}% of target</span>
                        </div>
                        <Progress value={Math.min(bdr.weeklyProgress, 100)} className="h-3" />
                        <div className="flex justify-between text-xs text-gray-500">
                          <span>{bdr.thisWeek.agreementsSigned} agreements this week</span>
                          <span>Target: {bdr.weeklyTarget}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Conversion Rates by BDR</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={data.bdrPerformance.slice(0, 8)}>
                      <XAxis dataKey="bdr" />
                      <YAxis />
                      <Tooltip />
                      <Bar key="performance-overall" dataKey="overallConversionRate" fill="#8884d8" name="Overall %" />
                      <Bar key="performance-call-proposal" dataKey="callToProposalRate" fill="#82ca9d" name="Call→Proposal %" />
                      <Bar key="performance-proposal-agreement" dataKey="proposalToAgreementRate" fill="#ffc658" name="Proposal→Agreement %" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* Activity Tab */}
        <TabsContent value="activity">
          <div className="space-y-6">
            {/* Weekly Comparison */}
            <Card>
              <CardHeader>
                <CardTitle>This Week vs Last Week</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={data.activityAnalysis.weeklyComparison}>
                    <XAxis dataKey="period" />
                    <YAxis />
                    <Tooltip />
                    <Bar key="comparison-calls-proposed" dataKey="callsProposed" fill="#8884d8" name="Calls Proposed" />
                    <Bar key="comparison-calls-booked" dataKey="callsBooked" fill="#82ca9d" name="Calls Booked" />
                    <Bar key="comparison-proposals-sent" dataKey="proposalsSent" fill="#ffc658" name="Proposals" />
                    <Bar key="comparison-agreements" dataKey="agreements" fill="#ff7c7c" name="Agreements" />
                    <Bar key="comparison-sold" dataKey="sold" fill="#00C49F" name="Sales Volume" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Daily Activity Trends */}
            <Card>
              <CardHeader>
                <CardTitle>Daily Activity Trends (Last 7 Days)</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={data.activityAnalysis.dailyMetrics}>
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Line key="activity-calls-proposed" type="monotone" dataKey="callsProposed" stroke="#8884d8" name="Calls Proposed" strokeWidth={2} />
                    <Line key="activity-calls-booked" type="monotone" dataKey="callsBooked" stroke="#82ca9d" name="Calls Booked" strokeWidth={2} />
                    <Line key="activity-proposals-sent" type="monotone" dataKey="proposalsSent" stroke="#ffc658" name="Proposals" strokeWidth={2} />
                    <Line key="activity-agreements" type="monotone" dataKey="agreements" stroke="#ff7c7c" name="Agreements" strokeWidth={2} />
                    <Line key="activity-sold" type="monotone" dataKey="sold" stroke="#00C49F" name="Sales Activity" strokeWidth={2} />
                    <Line key="activity-total" type="monotone" dataKey="totalActivity" stroke="#8B5CF6" name="Total Activity" strokeWidth={3} strokeDasharray="5 5" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
    </>
  );
} 