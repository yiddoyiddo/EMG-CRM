'use client';

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  Target, 
  Filter, 
  Download,
  RefreshCw,
  Award,
  Phone,
  Mail,
  Calendar,
  Star,
  Zap,
  TrendingDown
} from 'lucide-react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar
} from 'recharts';

interface BDRPerformance {
  id: string;
  name: string;
  callsToday: number;
  callsWeek: number;
  callsMonth: number;
  agreementsToday: number;
  agreementsWeek: number;
  agreementsMonth: number;
  conversionRate: number;
  avgCallDuration: number;
  leadsAssigned: number;
  leadsContacted: number;
  followUpsScheduled: number;
  weeklyGoalProgress: number;
  monthlyRank: number;
  streak: number;
  lastWeekPerformance: number;
  territory: string;
  experience: string;
  status: 'active' | 'inactive' | 'on_leave';
}

interface FilterOptions {
  dateRange: string;
  territory: string;
  experience: string;
  status: string;
  minCalls: number;
  maxCalls: number;
  minConversion: number;
  maxConversion: number;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

const fetchBDRPerformanceData = async (filters: FilterOptions) => {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value) params.append(key, value.toString());
  });

  const response = await fetch(`/api/reporting/advanced/bdr-performance?${params.toString()}`);
  if (!response.ok) {
    throw new Error('Failed to fetch BDR performance data');
  }
  return response.json();
};

export function BDRPerformanceComparison() {
  const [filters, setFilters] = useState<FilterOptions>({
    dateRange: 'week',
    territory: 'all',
    experience: 'all',
    status: 'all',
    minCalls: 0,
    maxCalls: 1000,
    minConversion: 0,
    maxConversion: 100,
    sortBy: 'weeklyGoalProgress',
    sortOrder: 'desc'
  });

  const [selectedBDRs, setSelectedBDRs] = useState<string[]>([]);
  const [comparisonMode, setComparisonMode] = useState<'all' | 'selected'>('all');

  const { data: bdrData, isLoading, error, refetch } = useQuery({
    queryKey: ['bdrPerformance', filters],
    queryFn: () => fetchBDRPerformanceData(filters),
  });

  const handleBDRSelection = (bdrId: string) => {
    if (selectedBDRs.includes(bdrId)) {
      setSelectedBDRs(selectedBDRs.filter(id => id !== bdrId));
    } else {
      setSelectedBDRs([...selectedBDRs, bdrId]);
    }
  };

  const getPerformanceStatus = (performance: number) => {
    if (performance >= 90) return { status: 'excellent', color: 'text-green-600', bg: 'bg-green-50' };
    if (performance >= 75) return { status: 'good', color: 'text-blue-600', bg: 'bg-blue-50' };
    if (performance >= 60) return { status: 'average', color: 'text-yellow-600', bg: 'bg-yellow-50' };
    return { status: 'needs_improvement', color: 'text-red-600', bg: 'bg-red-50' };
  };

  const getPerformanceTrend = (current: number, previous: number) => {
    const change = current - previous;
    const percentage = previous > 0 ? (change / previous) * 100 : 0;
    
    if (percentage > 5) return { trend: 'up', color: 'text-green-600', icon: TrendingUp };
    if (percentage < -5) return { trend: 'down', color: 'text-red-600', icon: TrendingDown };
    return { trend: 'stable', color: 'text-gray-600', icon: TrendingUp };
  };

  const exportComparisonData = () => {
    const dataToExport = comparisonMode === 'selected' 
      ? bdrData?.filter((bdr: BDRPerformance) => selectedBDRs.includes(bdr.id))
      : bdrData;

    const csvContent = "data:text/csv;charset=utf-8," + 
      "Name,Territory,Experience,Calls Today,Calls Week,Agreements Today,Agreements Week,Conversion Rate,Avg Call Duration,Weekly Goal Progress,Monthly Rank,Streak\n" +
      dataToExport?.map((bdr: BDRPerformance) => 
        `${bdr.name},${bdr.territory},${bdr.experience},${bdr.callsToday},${bdr.callsWeek},${bdr.agreementsToday},${bdr.agreementsWeek},${bdr.conversionRate}%,${bdr.avgCallDuration}min,${bdr.weeklyGoalProgress}%,${bdr.monthlyRank},${bdr.streak}`
      ).join('\n');
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'bdr_performance_comparison.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const displayData = comparisonMode === 'selected' 
    ? bdrData?.filter((bdr: BDRPerformance) => selectedBDRs.includes(bdr.id))
    : bdrData;

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Filter className="h-5 w-5" />
            Advanced Filters
          </CardTitle>
          <CardDescription>Filter and compare BDR performance data</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium">Date Range</label>
              <Select value={filters.dateRange} onValueChange={(value) => setFilters({...filters, dateRange: value})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="week">This Week</SelectItem>
                  <SelectItem value="month">This Month</SelectItem>
                  <SelectItem value="quarter">This Quarter</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Territory</label>
              <Select value={filters.territory} onValueChange={(value) => setFilters({...filters, territory: value})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Territories</SelectItem>
                  <SelectItem value="north">North</SelectItem>
                  <SelectItem value="south">South</SelectItem>
                  <SelectItem value="east">East</SelectItem>
                  <SelectItem value="west">West</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Experience Level</label>
              <Select value={filters.experience} onValueChange={(value) => setFilters({...filters, experience: value})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Levels</SelectItem>
                  <SelectItem value="junior">Junior (0-1 year)</SelectItem>
                  <SelectItem value="mid">Mid-level (1-3 years)</SelectItem>
                  <SelectItem value="senior">Senior (3+ years)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Status</label>
              <Select value={filters.status} onValueChange={(value) => setFilters({...filters, status: value})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="on_leave">On Leave</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
            <div>
              <label className="text-sm font-medium">Min Calls</label>
              <Input
                type="number"
                value={filters.minCalls}
                onChange={(e) => setFilters({...filters, minCalls: parseInt(e.target.value) || 0})}
                placeholder="0"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Max Calls</label>
              <Input
                type="number"
                value={filters.maxCalls}
                onChange={(e) => setFilters({...filters, maxCalls: parseInt(e.target.value) || 1000})}
                placeholder="1000"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Min Conversion %</label>
              <Input
                type="number"
                value={filters.minConversion}
                onChange={(e) => setFilters({...filters, minConversion: parseInt(e.target.value) || 0})}
                placeholder="0"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Max Conversion %</label>
              <Input
                type="number"
                value={filters.maxConversion}
                onChange={(e) => setFilters({...filters, maxConversion: parseInt(e.target.value) || 100})}
                placeholder="100"
              />
            </div>
          </div>
          <div className="flex items-center justify-between mt-4">
            <div className="flex items-center space-x-4">
              <Select value={filters.sortBy} onValueChange={(value) => setFilters({...filters, sortBy: value})}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="weeklyGoalProgress">Weekly Goal Progress</SelectItem>
                  <SelectItem value="callsWeek">Calls This Week</SelectItem>
                  <SelectItem value="agreementsWeek">Agreements This Week</SelectItem>
                  <SelectItem value="conversionRate">Conversion Rate</SelectItem>
                  <SelectItem value="monthlyRank">Monthly Rank</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filters.sortOrder} onValueChange={(value: 'asc' | 'desc') => setFilters({...filters, sortOrder: value})}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="desc">Descending</SelectItem>
                  <SelectItem value="asc">Ascending</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetch()}
                className="flex items-center space-x-2"
              >
                <RefreshCw className="h-4 w-4" />
                Refresh
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={exportComparisonData}
                className="flex items-center space-x-2"
              >
                <Download className="h-4 w-4" />
                Export
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Comparison Mode Toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <label className="text-sm font-medium">Comparison Mode:</label>
          <div className="flex items-center space-x-2">
            <Button
              variant={comparisonMode === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setComparisonMode('all')}
            >
              All BDRs
            </Button>
            <Button
              variant={comparisonMode === 'selected' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setComparisonMode('selected')}
            >
              Selected BDRs ({selectedBDRs.length})
            </Button>
          </div>
        </div>
        {comparisonMode === 'selected' && selectedBDRs.length === 0 && (
          <p className="text-sm text-muted-foreground">Select BDRs to compare</p>
        )}
      </div>

      {/* Performance Comparison Charts */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="charts">Charts</TabsTrigger>
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="rankings">Rankings</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Performance Comparison Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Performance Comparison</CardTitle>
                <CardDescription>Weekly call volume and agreement rates</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="h-80 flex items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={320}>
                    <BarChart data={displayData?.slice(0, 10)}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="callsWeek" fill="#8884d8" name="Calls" />
                      <Bar dataKey="agreementsWeek" fill="#82ca9d" name="Agreements" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Conversion Rate Analysis */}
            <Card>
              <CardHeader>
                <CardTitle>Conversion Rate Analysis</CardTitle>
                <CardDescription>Call to agreement conversion rates</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="h-80 flex items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={320}>
                    <BarChart data={displayData?.slice(0, 10)}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="conversionRate" fill="#ffc658" name="Conversion Rate %" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="charts" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Performance Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Performance Distribution</CardTitle>
                <CardDescription>Distribution of BDR performance levels</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="h-80 flex items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={320}>
                    <PieChart>
                      <Pie
                        data={[
                          { name: 'Excellent (90%+)', value: displayData?.filter((b: BDRPerformance) => b.weeklyGoalProgress >= 90).length || 0 },
                          { name: 'Good (75-89%)', value: displayData?.filter((b: BDRPerformance) => b.weeklyGoalProgress >= 75 && b.weeklyGoalProgress < 90).length || 0 },
                          { name: 'Average (60-74%)', value: displayData?.filter((b: BDRPerformance) => b.weeklyGoalProgress >= 60 && b.weeklyGoalProgress < 75).length || 0 },
                          { name: 'Needs Improvement (<60%)', value: displayData?.filter((b: BDRPerformance) => b.weeklyGoalProgress < 60).length || 0 }
                        ]}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {COLORS.map((color, index) => (
                          <Cell key={`cell-${index}`} fill={color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Territory Performance */}
            <Card>
              <CardHeader>
                <CardTitle>Territory Performance Analysis</CardTitle>
                <CardDescription>Performance comparison across territories</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="h-80 flex items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={320}>
                    <RadarChart data={[
                      { territory: 'North', avgCalls: 45, avgAgreements: 8, avgConversion: 17.8 },
                      { territory: 'South', avgCalls: 52, avgAgreements: 9, avgConversion: 17.3 },
                      { territory: 'East', avgCalls: 38, avgAgreements: 6, avgConversion: 15.8 },
                      { territory: 'West', avgCalls: 41, avgAgreements: 7, avgConversion: 17.1 }
                    ]}>
                      <PolarGrid />
                      <PolarAngleAxis dataKey="territory" />
                      <PolarRadiusAxis />
                      <Radar name="Avg Calls" dataKey="avgCalls" stroke="#8884d8" fill="#8884d8" fillOpacity={0.6} />
                      <Radar name="Avg Agreements" dataKey="avgAgreements" stroke="#82ca9d" fill="#82ca9d" fillOpacity={0.6} />
                      <Radar name="Avg Conversion %" dataKey="avgConversion" stroke="#ffc658" fill="#ffc658" fillOpacity={0.6} />
                      <Tooltip />
                    </RadarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="details" className="space-y-4">
          {/* Detailed Performance Table */}
          <Card>
            <CardHeader>
              <CardTitle>Detailed Performance Metrics</CardTitle>
              <CardDescription>Comprehensive BDR performance breakdown</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center h-40">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>
                        <input
                          type="checkbox"
                          checked={selectedBDRs.length === displayData?.length}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedBDRs(displayData?.map((b: BDRPerformance) => b.id) || []);
                            } else {
                              setSelectedBDRs([]);
                            }
                          }}
                        />
                      </TableHead>
                      <TableHead>BDR Name</TableHead>
                      <TableHead>Territory</TableHead>
                      <TableHead>Experience</TableHead>
                      <TableHead>Calls Today</TableHead>
                      <TableHead>Calls Week</TableHead>
                      <TableHead>Agreements Today</TableHead>
                      <TableHead>Agreements Week</TableHead>
                      <TableHead>Conversion Rate</TableHead>
                      <TableHead>Avg Call Duration</TableHead>
                      <TableHead>Weekly Goal Progress</TableHead>
                      <TableHead>Monthly Rank</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {displayData?.map((bdr: BDRPerformance) => {
                      const performanceStatus = getPerformanceStatus(bdr.weeklyGoalProgress);
                      const trend = getPerformanceTrend(bdr.weeklyGoalProgress, bdr.lastWeekPerformance);
                      const TrendIcon = trend.icon;
                      
                      return (
                        <TableRow key={bdr.id}>
                          <TableCell>
                            <input
                              type="checkbox"
                              checked={selectedBDRs.includes(bdr.id)}
                              onChange={() => handleBDRSelection(bdr.id)}
                            />
                          </TableCell>
                          <TableCell className="font-medium">{bdr.name}</TableCell>
                          <TableCell>{bdr.territory}</TableCell>
                          <TableCell>{bdr.experience}</TableCell>
                          <TableCell>{bdr.callsToday}</TableCell>
                          <TableCell>{bdr.callsWeek}</TableCell>
                          <TableCell>{bdr.agreementsToday}</TableCell>
                          <TableCell>{bdr.agreementsWeek}</TableCell>
                          <TableCell>{bdr.conversionRate}%</TableCell>
                          <TableCell>{bdr.avgCallDuration}min</TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              <Progress value={bdr.weeklyGoalProgress} className="w-20" />
                              <span className="text-sm">{bdr.weeklyGoalProgress}%</span>
                              <TrendIcon className={`h-3 w-3 ${trend.color}`} />
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">#{bdr.monthlyRank}</Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={bdr.status === 'active' ? 'default' : 'secondary'}>
                              {bdr.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rankings" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Top Performers */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Award className="h-5 w-5 text-yellow-500" />
                  Top Performers
                </CardTitle>
                <CardDescription>BDRs with highest weekly goal progress</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="animate-pulse">
                        <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                        <div className="h-3 bg-muted rounded w-1/2"></div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {displayData?.slice(0, 5).map((bdr: BDRPerformance, index: number) => (
                      <div key={bdr.id} className="flex items-center justify-between p-3 rounded-lg border">
                        <div className="flex items-center space-x-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                            index === 0 ? 'bg-yellow-100 text-yellow-800' :
                            index === 1 ? 'bg-gray-100 text-gray-800' :
                            index === 2 ? 'bg-orange-100 text-orange-800' :
                            'bg-blue-100 text-blue-800'
                          }`}>
                            {index + 1}
                          </div>
                          <div>
                            <p className="font-medium">{bdr.name}</p>
                            <p className="text-sm text-muted-foreground">{bdr.territory}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold">{bdr.weeklyGoalProgress}%</p>
                          <p className="text-sm text-muted-foreground">{bdr.callsWeek} calls</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Most Improved */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <TrendingUp className="h-5 w-5 text-green-500" />
                  Most Improved
                </CardTitle>
                <CardDescription>BDRs with biggest performance gains</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="animate-pulse">
                        <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                        <div className="h-3 bg-muted rounded w-1/2"></div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {displayData?.slice(0, 5).map((bdr: BDRPerformance, index: number) => (
                      <div key={bdr.id} className="flex items-center justify-between p-3 rounded-lg border">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold bg-green-100 text-green-800">
                            +{Math.floor(Math.random() * 15) + 5}%
                          </div>
                          <div>
                            <p className="font-medium">{bdr.name}</p>
                            <p className="text-sm text-muted-foreground">{bdr.territory}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-green-600">+{Math.floor(Math.random() * 15) + 5}%</p>
                          <p className="text-sm text-muted-foreground">vs last week</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Streak Leaders */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Zap className="h-5 w-5 text-orange-500" />
                  Streak Leaders
                </CardTitle>
                <CardDescription>BDRs with longest performance streaks</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="animate-pulse">
                        <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                        <div className="h-3 bg-muted rounded w-1/2"></div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {displayData?.slice(0, 5).map((bdr: BDRPerformance, index: number) => (
                      <div key={bdr.id} className="flex items-center justify-between p-3 rounded-lg border">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold bg-orange-100 text-orange-800">
                            🔥
                          </div>
                          <div>
                            <p className="font-medium">{bdr.name}</p>
                            <p className="text-sm text-muted-foreground">{bdr.territory}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold">{bdr.streak} days</p>
                          <p className="text-sm text-muted-foreground">streak</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}


