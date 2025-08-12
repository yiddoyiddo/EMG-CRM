'use client';

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
// Replace missing Alert import with inline alert UI
import { Navbar } from '@/components/ui/navbar';
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  Target, 
  Filter, 
  Bell, 
  Download,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Clock,
  Award,
  Phone,
  Mail,
  Calendar,
  Zap
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

interface Notification {
  id: string;
  type: 'success' | 'warning' | 'error' | 'info';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  priority: 'low' | 'medium' | 'high';
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

const fetchNotifications = async () => {
  const response = await fetch('/api/reporting/advanced/notifications');
  if (!response.ok) {
    throw new Error('Failed to fetch notifications');
  }
  return response.json();
};

export default function AdvancedReportingPage() {
  const [filters, setFilters] = useState<FilterOptions>({
    dateRange: 'week',
    territory: 'all',
    experience: 'all',
    status: 'all',
    minCalls: 0,
    maxCalls: 1000,
    minConversion: 0,
    maxConversion: 100
  });

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);

  const { data: bdrData, isLoading, error, refetch } = useQuery({
    queryKey: ['bdrPerformance', filters],
    queryFn: () => fetchBDRPerformanceData(filters),
  });

  const { data: notificationData } = useQuery({
    queryKey: ['notifications'],
    queryFn: fetchNotifications,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  useEffect(() => {
    if (notificationData) {
      setNotifications(notificationData);
    }
  }, [notificationData]);

  const unreadNotifications = notifications.filter(n => !n.read);
  const highPriorityNotifications = notifications.filter(n => n.priority === 'high' && !n.read);

  const getPerformanceStatus = (performance: number) => {
    if (performance >= 90) return { status: 'excellent', color: 'text-green-600', bg: 'bg-green-50' };
    if (performance >= 75) return { status: 'good', color: 'text-blue-600', bg: 'bg-blue-50' };
    if (performance >= 60) return { status: 'average', color: 'text-yellow-600', bg: 'bg-yellow-50' };
    return { status: 'needs_improvement', color: 'text-red-600', bg: 'bg-red-50' };
  };

  const exportData = () => {
    const csvContent = "data:text/csv;charset=utf-8," + 
      "Name,Calls Today,Calls Week,Agreements Today,Agreements Week,Conversion Rate,Avg Call Duration,Weekly Goal Progress\n" +
      bdrData?.map((bdr: BDRPerformance) => 
        `${bdr.name},${bdr.callsToday},${bdr.callsWeek},${bdr.agreementsToday},${bdr.agreementsWeek},${bdr.conversionRate}%,${bdr.avgCallDuration}min,${bdr.weeklyGoalProgress}%`
      ).join('\n');
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'bdr_performance_report.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <>
      <Navbar />
      <div className="space-y-6 p-6">
        {/* Header with Notifications */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Advanced Business Intelligence</h1>
            <p className="text-muted-foreground">BDR Performance Comparison & Real-time Analytics</p>
          </div>
          <div className="flex items-center space-x-2 rounded-xl border border-white/30 dark:border-white/10 bg-white/60 dark:bg-white/[0.05] backdrop-blur p-2">
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
              onClick={exportData}
              className="flex items-center space-x-2"
            >
              <Download className="h-4 w-4" />
              Export
            </Button>
            <div className="relative">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowNotifications(!showNotifications)}
                className="flex items-center space-x-2"
              >
                <Bell className="h-4 w-4" />
                {unreadNotifications.length > 0 && (
                  <Badge variant="destructive" className="absolute -top-2 -right-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs">
                    {unreadNotifications.length}
                  </Badge>
                )}
              </Button>
              {showNotifications && (
                <div className="absolute right-0 top-12 w-80 bg-white/80 dark:bg-white/[0.06] backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-lg shadow-[0_10px_30px_-15px_rgba(0,0,0,0.5)] z-50 max-h-96 overflow-y-auto">
                  <div className="p-4 border-b">
                    <h3 className="font-semibold">Notifications</h3>
                  </div>
                  {notifications.length === 0 ? (
                    <div className="p-4 text-center text-muted-foreground">
                      No notifications
                    </div>
                  ) : (
                    <div className="divide-y">
                      {notifications.map((notification) => (
                        <div key={notification.id} className={`p-4 ${!notification.read ? 'bg-muted/50' : ''}`}>
                          <div className="flex items-start space-x-3">
                            <div className={`mt-1 ${
                              notification.type === 'success' ? 'text-green-500' :
                              notification.type === 'warning' ? 'text-yellow-500' :
                              notification.type === 'error' ? 'text-red-500' : 'text-blue-500'
                            }`}>
                              {notification.type === 'success' && <CheckCircle className="h-4 w-4" />}
                              {notification.type === 'warning' && <AlertTriangle className="h-4 w-4" />}
                              {notification.type === 'error' && <AlertTriangle className="h-4 w-4" />}
                              {notification.type === 'info' && <Clock className="h-4 w-4" />}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center justify-between">
                                <h4 className="font-medium text-sm">{notification.title}</h4>
                                <Badge variant={notification.priority === 'high' ? 'destructive' : 'secondary'} className="text-xs">
                                  {notification.priority}
                                </Badge>
                              </div>
                              <p className="text-sm text-muted-foreground mt-1">{notification.message}</p>
                              <p className="text-xs text-muted-foreground mt-2">{notification.timestamp}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* High Priority Alerts */}
        {highPriorityNotifications.length > 0 && (
          <div className="border-red-200 bg-red-50 border rounded p-3 flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5" />
            <div className="text-sm text-red-800">
              <strong>{highPriorityNotifications.length} high priority notification(s)</strong> require immediate attention.
            </div>
          </div>
        )}

        {/* Advanced Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Filter className="h-5 w-5" />
              Advanced Filters
            </CardTitle>
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
          </CardContent>
        </Card>

        {/* Main Content Tabs */}
        <Tabs defaultValue="comparison" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="comparison">Performance Comparison</TabsTrigger>
            <TabsTrigger value="analytics">Advanced Analytics</TabsTrigger>
            <TabsTrigger value="trends">Trends & Patterns</TabsTrigger>
            <TabsTrigger value="rankings">Rankings & Leaderboard</TabsTrigger>
          </TabsList>

          <TabsContent value="comparison" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Performance Comparison Chart */}
              <Card>
                <CardHeader>
                  <CardTitle>BDR Performance Comparison</CardTitle>
                  <CardDescription>Weekly call volume and agreement rates</CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="h-80 flex items-center justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height={320}>
                      <BarChart data={bdrData?.slice(0, 10)}>
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
                      <BarChart data={bdrData?.slice(0, 10)}>
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
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {bdrData?.map((bdr: BDRPerformance) => {
                        const performanceStatus = getPerformanceStatus(bdr.weeklyGoalProgress);
                        return (
                          <TableRow key={bdr.id}>
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
                              </div>
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

          <TabsContent value="analytics" className="space-y-4">
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
                            { name: 'Excellent (90%+)', value: bdrData?.filter((b: BDRPerformance) => b.weeklyGoalProgress >= 90).length || 0 },
                            { name: 'Good (75-89%)', value: bdrData?.filter((b: BDRPerformance) => b.weeklyGoalProgress >= 75 && b.weeklyGoalProgress < 90).length || 0 },
                            { name: 'Average (60-74%)', value: bdrData?.filter((b: BDRPerformance) => b.weeklyGoalProgress >= 60 && b.weeklyGoalProgress < 75).length || 0 },
                            { name: 'Needs Improvement (<60%)', value: bdrData?.filter((b: BDRPerformance) => b.weeklyGoalProgress < 60).length || 0 }
                          ]}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name} ${(((percent || 0) * 100).toFixed(0))}%`}
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

          <TabsContent value="trends" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Weekly Trends */}
              <Card>
                <CardHeader>
                  <CardTitle>Weekly Performance Trends</CardTitle>
                  <CardDescription>Call volume and agreement trends over time</CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="h-80 flex items-center justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height={320}>
                      <LineChart data={[
                        { week: 'Week 1', calls: 1200, agreements: 180 },
                        { week: 'Week 2', calls: 1350, agreements: 210 },
                        { week: 'Week 3', calls: 1100, agreements: 165 },
                        { week: 'Week 4', calls: 1400, agreements: 225 },
                        { week: 'Week 5', calls: 1250, agreements: 195 },
                        { week: 'Week 6', calls: 1500, agreements: 240 }
                      ]}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="week" />
                        <YAxis />
                        <Tooltip />
                        <Line type="monotone" dataKey="calls" stroke="#8884d8" strokeWidth={2} />
                        <Line type="monotone" dataKey="agreements" stroke="#82ca9d" strokeWidth={2} />
                      </LineChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>

              {/* Conversion Rate Trends */}
              <Card>
                <CardHeader>
                  <CardTitle>Conversion Rate Trends</CardTitle>
                  <CardDescription>Weekly conversion rate progression</CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="h-80 flex items-center justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height={320}>
                      <LineChart data={[
                        { week: 'Week 1', conversion: 15.0 },
                        { week: 'Week 2', conversion: 15.6 },
                        { week: 'Week 3', conversion: 15.0 },
                        { week: 'Week 4', conversion: 16.1 },
                        { week: 'Week 5', conversion: 15.6 },
                        { week: 'Week 6', conversion: 16.0 }
                      ]}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="week" />
                        <YAxis />
                        <Tooltip />
                        <Line type="monotone" dataKey="conversion" stroke="#ffc658" strokeWidth={2} />
                      </LineChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>
            </div>
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
                      {bdrData?.slice(0, 5).map((bdr: BDRPerformance, index: number) => (
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
                      {bdrData?.slice(0, 5).map((bdr: BDRPerformance, index: number) => (
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
                      {bdrData?.slice(0, 5).map((bdr: BDRPerformance, index: number) => (
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
    </>
  );
} 