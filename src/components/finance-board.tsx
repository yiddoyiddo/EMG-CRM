'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  Target, 
  Clock, 
  HelpCircle,
  Plus,
  AlertCircle
} from 'lucide-react';
import Link from 'next/link';

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
}

export function FinanceBoard() {
  const [analytics, setAnalytics] = useState<FinanceAnalytics | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/finance?analytics=true');
      if (response.ok) {
        const data = await response.json();
        setAnalytics(data.analytics);
      }
    } catch (error) {
      console.error('Error fetching finance analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const getTrendIcon = (value: number) => {
    if (value > 0) return <TrendingUp className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />;
    if (value < 0) return <TrendingDown className="h-4 w-4 text-rose-600 dark:text-rose-400" />;
    return <Activity className="h-4 w-4 text-muted-foreground" />;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GB', { 
      style: 'currency', 
      currency: 'GBP' 
    }).format(amount);
  };

  if (loading) {
    return (
      <Card className="hover:shadow-lg transition-shadow flex flex-col h-full">
        <CardHeader className="pb-3 flex-shrink-0">
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Finance Overview
          </CardTitle>
          <CardDescription>Loading financial metrics...</CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground flex-grow">
          <div className="flex items-center justify-center py-8">
            <Activity className="h-6 w-6 animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!analytics) {
    return (
      <Card className="hover:shadow-lg transition-shadow flex flex-col h-full">
        <CardHeader className="pb-3 flex-shrink-0">
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Finance Overview
          </CardTitle>
          <CardDescription>Financial performance and revenue tracking</CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground flex-grow">
          <div className="flex items-center justify-center py-8 text-center">
            <div>
              <AlertCircle className="h-8 w-8 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-600">No finance data available</p>
              <p className="text-xs text-gray-500 mt-1">Add finance entries to see metrics</p>
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex-shrink-0">
          <Link href="/finance" className="w-full">
            <Button className="w-full" size="lg">
              <Plus className="h-4 w-4 mr-2" />
              Go to Finance
            </Button>
          </Link>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card className="hover:shadow-lg transition-shadow flex flex-col h-full">
      <CardHeader className="pb-3 flex-shrink-0">
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="h-5 w-5" />
          Finance Overview
          {getTrendIcon(analytics.monthlyGrowth)}
        </CardTitle>
        <CardDescription>Financial performance and revenue tracking</CardDescription>
      </CardHeader>
      <CardContent className="text-sm text-muted-foreground flex-grow">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-muted/50 rounded-lg p-3 border">
              <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(analytics.ytdRevenue)}</div>
              <div className="text-xs text-muted-foreground">YTD Revenue</div>
            </div>
            <div className="bg-muted/50 rounded-lg p-3 border">
              <div className="text-lg font-bold text-blue-600 dark:text-blue-400">{formatCurrency(analytics.averageDealSize)}</div>
              <div className="text-xs text-muted-foreground">Avg Deal Size</div>
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span>Payment Status</span>
              <span className="text-muted-foreground">{analytics.totalDeals} total deals</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="text-center">
                <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{analytics.paymentStatus.paid}</div>
                <div className="text-xs text-muted-foreground">Paid</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-amber-600 dark:text-amber-400">{analytics.paymentStatus.pending}</div>
                <div className="text-xs text-muted-foreground">Pending</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-rose-600 dark:text-rose-400">{analytics.paymentStatus.overdue}</div>
                <div className="text-xs text-muted-foreground">Overdue</div>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span>Monthly Growth</span>
              <span className={`font-medium ${analytics.monthlyGrowth >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                {analytics.monthlyGrowth > 0 ? '+' : ''}{analytics.monthlyGrowth.toFixed(1)}%
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <Clock className="h-3 w-3" />
              <span>Avg payment time: {Math.round(analytics.averagePaymentTime)} days</span>
            </div>
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex-shrink-0">
        <Link href="/finance" className="w-full">
          <Button className="w-full" size="lg">
            <DollarSign className="h-4 w-4 mr-2" />
            Open Finance Dashboard
          </Button>
        </Link>
      </CardFooter>
    </Card>
  );
}
