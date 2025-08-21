'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle,
  CheckCircle,
  Clock
} from 'lucide-react';
import { getMonthName } from '@/lib/date-utils';

interface DanCommissions {
  totalOwed: number;
  totalPaid: number;
  outstanding: number;
  byStatus: { [key: string]: { owed: number; paid: number; outstanding: number } };
  byMonth: Array<{ month: string; owed: number; paid: number; outstanding: number }>;
}

interface LeadGenCommsBoardProps {
  danCommissions: DanCommissions;
  loading?: boolean;
}

export function LeadGenCommsBoard({ danCommissions, loading }: LeadGenCommsBoardProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GB', { 
      style: 'currency', 
      currency: 'GBP' 
    }).format(amount);
  };

  const getStatusIcon = (outstanding: number) => {
    if (outstanding === 0) return <CheckCircle className="h-4 w-4 text-green-600" />;
    if (outstanding > 1000) return <AlertTriangle className="h-4 w-4 text-red-600" />;
    return <Clock className="h-4 w-4 text-amber-600" />;
  };

  const getStatusBadgeVariant = (outstanding: number) => {
    if (outstanding === 0) return 'default';
    if (outstanding > 1000) return 'destructive';
    return 'secondary';
  };

  if (loading) {
    return (
      <Card className="hover:shadow-lg transition-shadow">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Lead Gen Comms
          </CardTitle>
          <CardDescription>Dan Reeves commission tracking</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="text-center">Loading commission data...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="h-5 w-5" />
          Lead Gen Comms
          {danCommissions.outstanding > 0 ? (
            <TrendingUp className="h-4 w-4 text-amber-600" />
          ) : (
            <CheckCircle className="h-4 w-4 text-green-600" />
          )}
        </CardTitle>
        <CardDescription>Dan Reeves commission tracking and outstanding payments</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Summary Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-muted/50 rounded-lg p-3 border">
            <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
              {formatCurrency(danCommissions.totalOwed)}
            </div>
            <div className="text-xs text-muted-foreground">Total Commission Owed</div>
          </div>
          <div className="bg-muted/50 rounded-lg p-3 border">
            <div className="text-lg font-bold text-blue-600 dark:text-blue-400">
              {formatCurrency(danCommissions.totalPaid)}
            </div>
            <div className="text-xs text-muted-foreground">Total Paid</div>
          </div>
          <div className="bg-muted/50 rounded-lg p-3 border">
            <div className={`text-lg font-bold ${danCommissions.outstanding > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-green-600 dark:text-green-400'}`}>
              {formatCurrency(danCommissions.outstanding)}
            </div>
            <div className="text-xs text-muted-foreground">Outstanding</div>
          </div>
        </div>

        {/* Outstanding by Status */}
        {Object.keys(danCommissions.byStatus).length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-muted-foreground">Outstanding by Status</h4>
            <div className="space-y-2">
              {Object.entries(danCommissions.byStatus)
                .filter(([, data]) => data.outstanding > 0)
                .sort((a, b) => b[1].outstanding - a[1].outstanding)
                .map(([status, data]) => (
                  <div key={status} className="flex items-center justify-between p-2 bg-muted/30 rounded">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(data.outstanding)}
                      <span className="text-sm font-medium">{status}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={getStatusBadgeVariant(data.outstanding)}>
                        {formatCurrency(data.outstanding)}
                      </Badge>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Recent Months */}
        {danCommissions.byMonth.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-muted-foreground">Recent Months</h4>
            <div className="space-y-2">
              {danCommissions.byMonth.slice(0, 6).map((monthData) => (
                <div key={monthData.month} className="flex items-center justify-between p-2 bg-muted/30 rounded">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(monthData.outstanding)}
                    <span className="text-sm font-medium">{getMonthName(monthData.month)}</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    <span className="text-muted-foreground">
                      Owed: {formatCurrency(monthData.owed)}
                    </span>
                    <span className="text-green-600">
                      Paid: {formatCurrency(monthData.paid)}
                    </span>
                    {monthData.outstanding > 0 && (
                      <Badge variant="secondary">
                        Outstanding: {formatCurrency(monthData.outstanding)}
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Payment Rate */}
        <div className="pt-3 border-t">
          <div className="flex items-center justify-between text-xs">
            <span>Payment Rate</span>
            <span className={`font-medium ${danCommissions.totalOwed > 0 ? 'text-emerald-600' : 'text-muted-foreground'}`}>
              {danCommissions.totalOwed > 0 
                ? `${((danCommissions.totalPaid / danCommissions.totalOwed) * 100).toFixed(1)}% paid`
                : 'No commissions yet'
              }
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}