'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Users,
  Search,
  Filter,
  Download,
  RefreshCw,
  Calendar,
  BarChart3,
  AlertCircle,
} from 'lucide-react';
import { format, subDays, subMonths } from 'date-fns';
import { WarningSeverity, DuplicateType, UserDecision } from '@prisma/client';
import { useSession } from 'next-auth/react';
import { redirect } from 'next/navigation';
import { hasPermission } from '@/lib/permissions';
import { PERMISSIONS } from '@/lib/permissions';

interface DuplicateStatistics {
  totalWarnings: number;
  proceedCount: number;
  cancelledCount: number;
  proceedRate: number;
  severityBreakdown: Record<WarningSeverity, number>;
}

interface DuplicateWarning {
  id: string;
  createdAt: string;
  severity: WarningSeverity;
  warningType: DuplicateType;
  triggerAction: string;
  decisionMade: boolean;
  userDecision?: UserDecision;
  decisionAt?: string;
  triggeredBy: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
  potentialDuplicates: Array<{
    id: string;
    matchType: DuplicateType;
    confidence: number;
    existingCompany?: string;
    ownedBy?: {
      id: string;
      name: string;
      role: string;
    };
    lastContactDate?: string;
    recordStatus?: string;
  }>;
}

export default function DuplicatesAdminPage() {
  const { data: session } = useSession();
  const [statistics, setStatistics] = useState<DuplicateStatistics | null>(null);
  const [warnings, setWarnings] = useState<DuplicateWarning[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState<string>('30');

  // Check admin permissions
  useEffect(() => {
    if (session && !hasPermission(session.user as any, PERMISSIONS.DUPLICATES.MANAGE.resource, PERMISSIONS.DUPLICATES.MANAGE.action) &&
        !hasPermission(session.user as any, PERMISSIONS.DUPLICATES.VIEW_ALL.resource, PERMISSIONS.DUPLICATES.VIEW_ALL.action)) {
      redirect('/');
    }
  }, [session]);

  // Fetch statistics and warnings
  useEffect(() => {
    if (session) {
      fetchData();
    }
  }, [session, dateRange]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const dateFrom = dateRange === 'all' ? undefined : 
        format(subDays(new Date(), parseInt(dateRange)), 'yyyy-MM-dd\'T\'HH:mm:ss\'Z\'');
      const dateTo = format(new Date(), 'yyyy-MM-dd\'T\'HH:mm:ss\'Z\'');

      const [statsResponse, warningsResponse] = await Promise.all([
        fetch(`/api/admin/duplicates?action=statistics${dateFrom ? `&dateFrom=${dateFrom}&dateTo=${dateTo}` : ''}`),
        fetch('/api/admin/duplicates?action=recent-warnings&limit=100&includeResolved=true')
      ]);

      if (statsResponse.ok) {
        const stats = await statsResponse.json();
        setStatistics(stats);
      }

      if (warningsResponse.ok) {
        const warningsData = await warningsResponse.json();
        setWarnings(warningsData);
      }
    } catch (error) {
      console.error('Error fetching duplicate data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredWarnings = warnings.filter(warning => {
    const matchesSearch = !searchTerm || 
      warning.triggeredBy.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      warning.triggeredBy.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      warning.potentialDuplicates.some(dup => 
        dup.existingCompany?.toLowerCase().includes(searchTerm.toLowerCase())
      );

    const matchesSeverity = severityFilter === 'all' || warning.severity === severityFilter;

    const matchesStatus = statusFilter === 'all' || 
      (statusFilter === 'pending' && !warning.decisionMade) ||
      (statusFilter === 'resolved' && warning.decisionMade) ||
      (statusFilter === 'proceeded' && warning.userDecision === UserDecision.PROCEEDED) ||
      (statusFilter === 'cancelled' && warning.userDecision === UserDecision.CANCELLED);

    return matchesSearch && matchesSeverity && matchesStatus;
  });

  const getSeverityColor = (severity: WarningSeverity) => {
    switch (severity) {
      case WarningSeverity.CRITICAL:
        return 'destructive';
      case WarningSeverity.HIGH:
        return 'destructive';
      case WarningSeverity.MEDIUM:
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const getDecisionColor = (decision?: UserDecision) => {
    switch (decision) {
      case UserDecision.PROCEEDED:
        return 'default';
      case UserDecision.CANCELLED:
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const formatMatchType = (matchType: DuplicateType) => {
    return matchType.toLowerCase().replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Less than 1 hour ago';
    if (diffInHours < 24) return `${diffInHours} hours ago`;
    if (diffInHours < 168) return `${Math.floor(diffInHours / 24)} days ago`;
    return format(date, 'MMM dd, yyyy');
  };

  if (!session) {
    return <div>Loading...</div>;
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Duplicate Management</h1>
          <p className="text-muted-foreground">
            Monitor and analyze duplicate detection system performance
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchData} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="warnings">Recent Warnings</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {/* Date Range Selector */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Time Period
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Select time period" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">Last 7 days</SelectItem>
                  <SelectItem value="30">Last 30 days</SelectItem>
                  <SelectItem value="90">Last 90 days</SelectItem>
                  <SelectItem value="365">Last year</SelectItem>
                  <SelectItem value="all">All time</SelectItem>
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {/* Statistics Cards */}
          {statistics && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Warnings</CardTitle>
                  <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{statistics.totalWarnings}</div>
                  <p className="text-xs text-muted-foreground">
                    Duplicate warnings shown
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Proceed Rate</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{statistics.proceedRate.toFixed(1)}%</div>
                  <p className="text-xs text-muted-foreground">
                    BDRs proceeding despite warnings
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Proceeded</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{statistics.proceedCount}</div>
                  <p className="text-xs text-muted-foreground">
                    Warnings overridden
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Cancelled</CardTitle>
                  <TrendingDown className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{statistics.cancelledCount}</div>
                  <p className="text-xs text-muted-foreground">
                    Actions cancelled
                  </p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Severity Breakdown */}
          {statistics && (
            <Card>
              <CardHeader>
                <CardTitle>Warning Severity Breakdown</CardTitle>
                <CardDescription>Distribution of warning severities</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {Object.entries(statistics.severityBreakdown).map(([severity, count]) => (
                    <div key={severity} className="text-center">
                      <div className="text-2xl font-bold">{count}</div>
                      <Badge variant={getSeverityColor(severity as WarningSeverity)}>
                        {severity}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="warnings" className="space-y-4">
          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Filters
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <Label htmlFor="search">Search</Label>
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="search"
                      placeholder="Search by user name, email, or company..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-8"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="severity">Severity</Label>
                  <Select value={severityFilter} onValueChange={setSeverityFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="All severities" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Severities</SelectItem>
                      <SelectItem value="CRITICAL">Critical</SelectItem>
                      <SelectItem value="HIGH">High</SelectItem>
                      <SelectItem value="MEDIUM">Medium</SelectItem>
                      <SelectItem value="LOW">Low</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="status">Status</Label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="All statuses" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="resolved">Resolved</SelectItem>
                      <SelectItem value="proceeded">Proceeded</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Warnings Table */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Duplicate Warnings ({filteredWarnings.length})</CardTitle>
              <CardDescription>
                Latest duplicate detection warnings and their outcomes
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8">
                  <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2" />
                  <p>Loading warnings...</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Severity</TableHead>
                      <TableHead>Matches</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredWarnings.map((warning) => (
                      <TableRow key={warning.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{warning.triggeredBy.name}</div>
                            <div className="text-sm text-muted-foreground">{warning.triggeredBy.email}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {formatMatchType(warning.warningType)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={getSeverityColor(warning.severity)}>
                            {warning.severity}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {warning.potentialDuplicates.length} duplicate(s)
                            {warning.potentialDuplicates.length > 0 && (
                              <div className="text-xs text-muted-foreground">
                                {warning.potentialDuplicates[0].existingCompany || 'Unknown Company'}
                                {warning.potentialDuplicates[0].ownedBy && 
                                  ` • ${warning.potentialDuplicates[0].ownedBy.name}`
                                }
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {warning.decisionMade ? (
                            <Badge variant={getDecisionColor(warning.userDecision)}>
                              {warning.userDecision}
                            </Badge>
                          ) : (
                            <Badge variant="outline">Pending</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">{formatTimeAgo(warning.createdAt)}</div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                System Performance Analytics
              </CardTitle>
              <CardDescription>
                Detailed insights into duplicate detection system effectiveness
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Advanced analytics and reporting features will be available in future releases.
                  Current basic statistics are shown in the Overview tab.
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-semibold mb-2">Most Common Duplicate Types</h4>
                    <p className="text-sm text-muted-foreground">
                      Analysis of which types of duplicates are most frequently detected
                    </p>
                  </div>
                  
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-semibold mb-2">User Behavior Patterns</h4>
                    <p className="text-sm text-muted-foreground">
                      Insights into how different users respond to duplicate warnings
                    </p>
                  </div>
                  
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-semibold mb-2">Time-based Trends</h4>
                    <p className="text-sm text-muted-foreground">
                      Duplicate detection patterns over time and seasonal variations
                    </p>
                  </div>
                  
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-semibold mb-2">False Positive Analysis</h4>
                    <p className="text-sm text-muted-foreground">
                      Track system accuracy and identify areas for improvement
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}