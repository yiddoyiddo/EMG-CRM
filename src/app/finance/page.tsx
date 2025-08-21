'use client';

import React, { useState, useEffect } from 'react';
import { Navbar } from '@/components/ui/navbar';
import { FinanceTable } from '@/components/finance-table';
import { FinanceForm } from '@/components/finance-form';
import { LeadGenCommsBoard } from '@/components/lead-gen-comms-board';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Plus, DollarSign, TrendingUp, TrendingDown, Activity, AlertCircle, Clock, BarChart3, PieChart, Target, HelpCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { useSession } from 'next-auth/react';

interface FinanceEntry {
  id: number;
  company: string;
  bdr: string;
  leadGen: boolean;
  status: string;
  invoiceDate: Date | null;
  dueDate: Date | null;
  soldAmount: number | null;
  gbpAmount: number | null;
  exchangeRate: number | null;
  exchangeRateDate: Date | null;
  actualGbpReceived: number | null;
  notes: string | null;
  commissionPaid: boolean;
  danCommissionPaid: boolean;
  bdrCommissionAmount: number | null;
  danCommissionAmount: number | null;
  isMarkCawstonLead: boolean;
  month: string;
  createdAt: Date;
  updatedAt: Date;
}

interface FinanceAnalytics {
  totalRevenue: number;
  ytdRevenue: number;
  monthlyRevenue: number;
  quarterlyRevenue: number;
  averageDealSize: number;
  conversionRate: number;
  overdueDays: number;
  monthlyGrowth: number;
  totalDeals: number;
  ytdDeals: number;
  monthlyDeals: number;
  averagePaymentTime: number;
  statusBreakdown: { [key: string]: number };
  monthlyTrends: Array<{ month: string; revenue: number; deals: number }>;
  bdrPerformance: Array<{ bdr: string; revenue: number; deals: number; avgDealSize: number }>;
  paymentStatus: {
    paid: number;
    pending: number;
    overdue: number;
  };
  danCommissions: {
    totalOwed: number;
    totalPaid: number;
    outstanding: number;
    byStatus: { [key: string]: { owed: number; paid: number; outstanding: number } };
    byMonth: Array<{ month: string; owed: number; paid: number; outstanding: number }>;
  };
}

export default function FinancePage() {
  const { data: session } = useSession();
  const [entries, setEntries] = useState<FinanceEntry[]>([]);
  const [groupedEntries, setGroupedEntries] = useState<{ [key: string]: FinanceEntry[] }>({});
  const [analytics, setAnalytics] = useState<FinanceAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<FinanceEntry | null>(null);
  const [viewMode, setViewMode] = useState<'analytics' | 'table' | 'groups'>('groups');
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 10,
    total: 0,
    totalPages: 0,
  });
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    bdr: '',
    month: '',
  });

  const fetchAnalytics = async () => {
    try {
      setAnalyticsLoading(true);
      const response = await fetch('/api/finance?analytics=true');
      if (response.ok) {
        const data = await response.json();
        setAnalytics(data.analytics);
      }
    } catch (error) {
      console.error('Error fetching finance analytics:', error);
    } finally {
      setAnalyticsLoading(false);
    }
  };

  const convertDateStrings = (entries: Record<string, any>[]): FinanceEntry[] => {
    return entries.map(entry => ({
      ...entry,
      invoiceDate: entry.invoiceDate ? new Date(entry.invoiceDate) : null,
      dueDate: entry.dueDate ? new Date(entry.dueDate) : null,
      exchangeRateDate: entry.exchangeRateDate ? new Date(entry.exchangeRateDate) : null,
      createdAt: new Date(entry.createdAt),
      updatedAt: new Date(entry.updatedAt),
    }));
  };

  const convertGroupedEntries = (groupedData: Record<string, any>): { [key: string]: FinanceEntry[] } => {
    const converted: { [key: string]: FinanceEntry[] } = {};
    for (const [key, entries] of Object.entries(groupedData)) {
      converted[key] = convertDateStrings(entries as Record<string, any>[]);
    }
    return converted;
  };

  const fetchEntries = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        ...(viewMode === 'table' && { page: pagination.page.toString() }),
        ...(viewMode === 'table' && { pageSize: pagination.pageSize.toString() }),
        ...(viewMode === 'groups' && { groupByMonth: 'true' }),
        ...(filters.search && { search: filters.search }),
        ...(filters.status && { status: filters.status }),
        ...(filters.bdr && { bdr: filters.bdr }),
        ...(filters.month && { month: filters.month }),
      });
      
      const response = await fetch(`/api/finance?${params}`);
      if (response.ok) {
        const data = await response.json();
        
        if (viewMode === 'groups') {
          setGroupedEntries(convertGroupedEntries(data.groupedEntries || {}));
        } else if (viewMode === 'table') {
          setEntries(convertDateStrings(data.financeEntries || []));
          setPagination({
            page: data.page,
            pageSize: data.pageSize,
            total: data.total,
            totalPages: data.totalPages,
          });
        }
      }
    } catch (error) {
      console.error('Error fetching finance entries:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEntries();
    fetchAnalytics();
  }, [pagination.page, pagination.pageSize, filters, viewMode]);

  const handleFormSubmit = async (data: Omit<FinanceEntry, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      const url = editingEntry ? `/api/finance/${editingEntry.id}` : '/api/finance';
      const method = editingEntry ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      
      if (response.ok) {
        setIsFormOpen(false);
        setEditingEntry(null);
        fetchEntries();
      } else {
        console.error('Error saving entry:', response.statusText);
      }
    } catch (error) {
      console.error('Error saving entry:', error);
    }
  };

  const handleEdit = (entry: FinanceEntry) => {
    setEditingEntry(entry);
    setIsFormOpen(true);
  };

  const handleDelete = async (id: number) => {
    try {
      const response = await fetch(`/api/finance/${id}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        fetchEntries();
      }
    } catch (error) {
      console.error('Error deleting entry:', error);
    }
  };

  const handleCreate = () => {
    setEditingEntry(null);
    setIsFormOpen(true);
  };

  const handlePaginationChange = (page: number, pageSize: number) => {
    setPagination(prev => ({ ...prev, page, pageSize }));
  };

  const handleFiltersChange = (newFilters: any) => {
    setFilters(newFilters);
    setPagination(prev => ({ ...prev, page: 1 }));
  };


  const getTrendIcon = (value: number) => {
    if (value > 0) return <TrendingUp className="h-4 w-4 text-green-600" />;
    if (value < 0) return <TrendingDown className="h-4 w-4 text-red-600" />;
    return <Activity className="h-4 w-4 text-gray-600" />;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GB', { 
      style: 'currency', 
      currency: 'GBP' 
    }).format(amount);
  };

  // Determine if user is BDR and should have restricted access
  const isBDR = session?.user?.role === 'BDR';
  
  // BDRs should only see Monthly Groups and Data Table, not Financial Analytics
  const allowedTabs = isBDR ? ['groups', 'table'] : ['analytics', 'groups', 'table'];
  
  // Ensure BDRs are on a valid tab
  useEffect(() => {
    if (isBDR && viewMode === 'analytics') {
      setViewMode('groups');
    }
  }, [isBDR, viewMode]);

  return (
    <div className="space-y-6">
      <Navbar />
      <div className="p-4 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">
            {isBDR ? 'My Finance Data' : 'Finance Overview & Board'}
          </h1>
          <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Finance Entry
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <FinanceForm
                entry={editingEntry}
                onSubmit={handleFormSubmit}
                onCancel={() => {
                  setIsFormOpen(false);
                  setEditingEntry(null);
                }}
              />
            </DialogContent>
          </Dialog>
        </div>

        <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as 'analytics' | 'table' | 'groups')} className="space-y-6">
          <TabsList className={`grid w-full ${isBDR ? 'grid-cols-2' : 'grid-cols-3'}`}>
            {allowedTabs.includes('analytics') && (
              <TabsTrigger value="analytics">Financial Analytics</TabsTrigger>
            )}
            <TabsTrigger value="groups">Monthly Groups</TabsTrigger>
            <TabsTrigger value="table">Data Table</TabsTrigger>
          </TabsList>

          {!isBDR && (
            <TabsContent value="analytics" className="space-y-6">
            {analyticsLoading ? (
              <div className="flex items-center justify-center min-h-[400px]">
                <div className="text-center">
                  <Activity className="h-8 w-8 animate-spin mx-auto mb-4" />
                  <p>Loading finance analytics...</p>
                </div>
              </div>
            ) : analytics ? (
              <>
                {/* Key Financial Metrics */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <Card className="border-2 border-green-200 bg-green-50">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <DollarSign className="h-4 w-4" />
                        Year-to-Date Revenue
                        {getTrendIcon(analytics.monthlyGrowth)}
                        <Tooltip>
                          <TooltipTrigger>
                            <HelpCircle className="h-4 w-4 text-gray-400 hover:text-gray-600" />
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">
                            <p><strong>What it measures:</strong> Total revenue generated from January 1st to current date</p>
                            <p><strong>How it&apos;s calculated:</strong> Sum of all &apos;gbpAmount&apos; fields from finance entries where invoiceDate is within current year</p>
                            <p><strong>Monthly trend:</strong> Growth percentage compared to previous month revenue</p>
                          </TooltipContent>
                        </Tooltip>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{formatCurrency(analytics.ytdRevenue)}</div>
                      <p className="text-xs text-gray-600 mt-1">
                        This Month: {formatCurrency(analytics.monthlyRevenue)} • {analytics.ytdDeals} deals YTD
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="border-2 border-blue-200 bg-blue-50">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <Target className="h-4 w-4" />
                        Average Deal Size
                        <Tooltip>
                          <TooltipTrigger>
                            <HelpCircle className="h-4 w-4 text-gray-400 hover:text-gray-600" />
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">
                            <p><strong>What it measures:</strong> Average financial value per completed deal</p>
                            <p><strong>How it&apos;s calculated:</strong> Total revenue (gbpAmount) ÷ Total number of finance entries</p>
                            <p><strong>Conversion rate:</strong> Percentage of deals with &apos;Paid&apos; status out of total deals</p>
                            <p><strong>Use case:</strong> Helps identify deal quality and pricing strategy effectiveness</p>
                          </TooltipContent>
                        </Tooltip>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{formatCurrency(analytics.averageDealSize)}</div>
                      <p className="text-xs text-gray-600 mt-1">
                        Conversion: {analytics.conversionRate.toFixed(1)}% • {analytics.totalDeals} total deals
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="border-2 border-yellow-200 bg-yellow-50">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        Payment Health
                        <Tooltip>
                          <TooltipTrigger>
                            <HelpCircle className="h-4 w-4 text-gray-400 hover:text-gray-600" />
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">
                            <p><strong>What it measures:</strong> Average number of days payments are overdue</p>
                            <p><strong>How it&apos;s calculated:</strong> For entries with &apos;Overdue&apos; status, calculate days between dueDate and today, then average</p>
                            <p><strong>Payment time:</strong> Average days from invoice to payment for completed transactions</p>
                            <p><strong>Cash flow indicator:</strong> Lower numbers indicate better cash flow management</p>
                          </TooltipContent>
                        </Tooltip>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{Math.round(analytics.overdueDays)} days</div>
                      <p className="text-xs text-gray-600 mt-1">
                        Avg payment time: {Math.round(analytics.averagePaymentTime)} days
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="border-2 border-purple-200 bg-purple-50">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <TrendingUp className="h-4 w-4" />
                        Monthly Growth
                        <Tooltip>
                          <TooltipTrigger>
                            <HelpCircle className="h-4 w-4 text-gray-400 hover:text-gray-600" />
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">
                            <p><strong>What it measures:</strong> Revenue growth percentage from previous month</p>
                            <p><strong>How it&apos;s calculated:</strong> ((Current month revenue - Previous month revenue) ÷ Previous month revenue) × 100</p>
                            <p><strong>Quarterly context:</strong> {formatCurrency(analytics.quarterlyRevenue)} revenue this quarter</p>
                            <p><strong>Growth indicators:</strong> Positive = growth, Negative = decline, 0 = flat</p>
                          </TooltipContent>
                        </Tooltip>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{analytics.monthlyGrowth > 0 ? '+' : ''}{analytics.monthlyGrowth.toFixed(1)}%</div>
                      <p className="text-xs text-gray-600 mt-1">
                        Quarterly: {formatCurrency(analytics.quarterlyRevenue)} • {analytics.monthlyDeals} deals this month
                      </p>
                    </CardContent>
                  </Card>
                </div>

                {/* Lead Gen Comms Section - Only visible to non-BDRs */}
                <LeadGenCommsBoard 
                  danCommissions={analytics.danCommissions}
                  loading={analyticsLoading}
                />

                {/* Payment Status Overview */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <PieChart className="h-5 w-5" />
                      Payment Status Distribution
                      <Tooltip>
                        <TooltipTrigger>
                          <HelpCircle className="h-4 w-4 text-gray-400 hover:text-gray-600" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          <p><strong>What it shows:</strong> Current payment status breakdown across all finance entries</p>
                          <p><strong>Paid:</strong> Completed transactions with 'Paid' status</p>
                          <p><strong>Pending:</strong> Invoices sent but payment not yet received</p>
                          <p><strong>Overdue:</strong> Payments past their due date requiring follow-up</p>
                          <p><strong>Use case:</strong> Monitor cash flow health and identify collection priorities</p>
                        </TooltipContent>
                      </Tooltip>
                    </CardTitle>
                    <CardDescription>Track payment collection efficiency and cash flow health</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="text-center p-4 border rounded-lg bg-green-50">
                        <div className="text-3xl font-bold text-green-600">{analytics.paymentStatus.paid}</div>
                        <div className="text-sm text-gray-600 mt-2">Paid</div>
                        <div className="text-xs text-gray-500 mt-1">
                          {analytics.totalDeals > 0 ? Math.round((analytics.paymentStatus.paid / analytics.totalDeals) * 100) : 0}% of total
                        </div>
                      </div>
                      <div className="text-center p-4 border rounded-lg bg-yellow-50">
                        <div className="text-3xl font-bold text-yellow-600">{analytics.paymentStatus.pending}</div>
                        <div className="text-sm text-gray-600 mt-2">Pending</div>
                        <div className="text-xs text-gray-500 mt-1">
                          {analytics.totalDeals > 0 ? Math.round((analytics.paymentStatus.pending / analytics.totalDeals) * 100) : 0}% of total
                        </div>
                      </div>
                      <div className="text-center p-4 border rounded-lg bg-red-50">
                        <div className="text-3xl font-bold text-red-600">{analytics.paymentStatus.overdue}</div>
                        <div className="text-sm text-gray-600 mt-2">Overdue</div>
                        <div className="text-xs text-gray-500 mt-1">
                          {analytics.totalDeals > 0 ? Math.round((analytics.paymentStatus.overdue / analytics.totalDeals) * 100) : 0}% of total
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* BDR Performance */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BarChart3 className="h-5 w-5" />
                      BDR Financial Performance
                      <Tooltip>
                        <TooltipTrigger>
                          <HelpCircle className="h-4 w-4 text-gray-400 hover:text-gray-600" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          <p><strong>What it shows:</strong> Financial performance metrics by individual Business Development Representative</p>
                          <p><strong>Revenue:</strong> Total gbpAmount from finance entries attributed to each BDR</p>
                          <p><strong>Deals:</strong> Count of finance entries per BDR</p>
                          <p><strong>Avg Deal Size:</strong> Revenue ÷ Number of deals per BDR</p>
                          <p><strong>Sorting:</strong> BDRs ranked by total revenue (highest first)</p>
                          <p><strong>Use case:</strong> Identify top revenue generators and coaching opportunities</p>
                        </TooltipContent>
                      </Tooltip>
                    </CardTitle>
                    <CardDescription>Individual revenue contribution and deal quality analysis</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {analytics.bdrPerformance.map((bdr, index) => (
                        <div key={index} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
                          <div className="flex items-center gap-3">
                            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-600 text-sm font-bold">
                              #{index + 1}
                            </div>
                            <div>
                              <div className="font-medium">{bdr.bdr}</div>
                              <div className="text-sm text-gray-600">
                                {bdr.deals} deals • {((bdr.revenue / analytics.ytdRevenue) * 100).toFixed(1)}% of YTD revenue
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-bold">{formatCurrency(bdr.revenue)}</div>
                            <div className="text-sm text-gray-600">
                              Avg: {formatCurrency(bdr.avgDealSize)}
                            </div>
                          </div>
                        </div>
                      ))}
                      {analytics.bdrPerformance.length === 0 && (
                        <div className="text-center py-8 text-gray-500">
                          No BDR performance data available
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Monthly Trends */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Activity className="h-5 w-5" />
                      6-Month Revenue Trends
                      <Tooltip>
                        <TooltipTrigger>
                          <HelpCircle className="h-4 w-4 text-gray-400 hover:text-gray-600" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          <p><strong>What it shows:</strong> Revenue and deal volume patterns over the last 6 months</p>
                          <p><strong>How it&apos;s calculated:</strong> Finance entries grouped by month field, summing gbpAmount per month</p>
                          <p><strong>Progress bars:</strong> Relative to highest revenue month in the period</p>
                          <p><strong>Deal volume:</strong> Count of finance entries per month</p>
                          <p><strong>Use case:</strong> Identify seasonal patterns, growth trends, and forecasting</p>
                        </TooltipContent>
                      </Tooltip>
                    </CardTitle>
                    <CardDescription>Historical performance analysis for trend identification and forecasting</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {analytics.monthlyTrends.map((month, index) => {
                        const maxRevenue = Math.max(...analytics.monthlyTrends.map(m => m.revenue));
                        const avgDealSize = month.deals > 0 ? month.revenue / month.deals : 0;
                        const isCurrentMonth = index === analytics.monthlyTrends.length - 1;
                        return (
                          <div key={index} className={`flex items-center justify-between p-3 border rounded-lg ${isCurrentMonth ? 'bg-blue-50 border-blue-200' : 'hover:bg-gray-50'}`}>
                            <div>
                              <div className="flex items-center gap-2">
                                <div className="font-medium">{month.month}</div>
                                {isCurrentMonth && (
                                  <Badge variant="outline" className="text-xs">Current</Badge>
                                )}
                              </div>
                              <div className="text-sm text-gray-600">
                                {month.deals} deals • Avg: {formatCurrency(avgDealSize)}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="font-bold">{formatCurrency(month.revenue)}</div>
                              <div className="flex items-center gap-2 mt-1">
                                <Progress 
                                  value={maxRevenue > 0 ? (month.revenue / maxRevenue) * 100 : 0} 
                                  className="w-24" 
                                />
                                <span className="text-xs text-gray-500 min-w-[35px]">
                                  {maxRevenue > 0 ? Math.round((month.revenue / maxRevenue) * 100) : 0}%
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                      {analytics.monthlyTrends.length === 0 && (
                        <div className="text-center py-8 text-gray-500">
                          No monthly trend data available
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </>
            ) : (
              <div className="flex items-center justify-center min-h-[400px]">
                <div className="text-center">
                  <AlertCircle className="h-8 w-8 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No analytics data available</p>
                </div>
              </div>
            )}
          </TabsContent>
          )}
        
          <TabsContent value="groups">
            <FinanceTable
              data={[]}
              groupedData={groupedEntries}
              isLoading={loading}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onCreate={handleCreate}
              pagination={pagination}
              onPaginationChange={handlePaginationChange}
              filters={filters}
              onFiltersChange={handleFiltersChange}
              viewMode="groups"
              onViewModeChange={() => {}}
            />
          </TabsContent>

          <TabsContent value="table">
            <FinanceTable
              data={entries}
              groupedData={{}}
              isLoading={loading}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onCreate={handleCreate}
              pagination={pagination}
              onPaginationChange={handlePaginationChange}
              filters={filters}
              onFiltersChange={handleFiltersChange}
              viewMode="table"
              onViewModeChange={() => {}}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}