'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { LayoutDashboard, Users, LineChart, BarChart3, TrendingUp, Calendar, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { FinanceBoard } from '@/components/finance-board';

export default function Home() {
  return (
    <div className="space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold tracking-tight">EMG CRM Dashboard</h1>
        <p className="text-muted-foreground mt-2">Manage your leads, pipeline, reporting, and finances from a central location</p>
      </div>
      
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 max-w-none mx-auto">
        <Card className="hover:shadow-lg transition-shadow flex flex-col h-full">
          <CardHeader className="pb-3 flex-shrink-0">
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Leads Management
            </CardTitle>
            <CardDescription>View, create, and manage all your sales leads</CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground flex-grow">
            <p>Access all your leads in a comprehensive table view. Create new leads and track their progress through your sales process.</p>
          </CardContent>
          <CardFooter className="flex-shrink-0">
            <Link href="/leads" className="w-full">
              <Button className="w-full" size="lg">
                <Users className="h-4 w-4 mr-2" />
                Go to Leads
              </Button>
            </Link>
          </CardFooter>
        </Card>

        <Card className="hover:shadow-lg transition-shadow flex flex-col h-full">
          <CardHeader className="pb-3 flex-shrink-0">
            <CardTitle className="flex items-center gap-2">
              <LineChart className="h-5 w-5" />
              Pipeline Management
            </CardTitle>
            <CardDescription>Monitor and manage your sales pipeline</CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground flex-grow">
            <p>Track calls, agreements, partner lists, and sublists. Manage deals through all stages of your sales process.</p>
          </CardContent>
          <CardFooter className="flex-shrink-0">
            <Link href="/pipeline" className="w-full">
              <Button className="w-full" size="lg">
                <LineChart className="h-4 w-4 mr-2" />
                Go to Pipeline
              </Button>
            </Link>
          </CardFooter>
        </Card>

        <Card className="hover:shadow-lg transition-shadow flex flex-col h-full">
          <CardHeader className="pb-3 flex-shrink-0">
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Sales Performance Analytics
            </CardTitle>
            <CardDescription>Complete reporting & performance dashboard</CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground flex-grow">
            <p>Comprehensive reporting focused on call volume, agreements, partner lists, and BDR performance. Monitor what matters most to your business.</p>
            <div className="mt-3 text-xs space-y-1">
              <div className="flex items-center gap-1">
                <ArrowRight className="h-3 w-3" />
                Call volume & future pipeline
              </div>
              <div className="flex items-center gap-1">
                <ArrowRight className="h-3 w-3" />
                Agreement tracking & list deployment
              </div>
              <div className="flex items-center gap-1">
                <ArrowRight className="h-3 w-3" />
                Partner list performance by size
              </div>
              <div className="flex items-center gap-1">
                <ArrowRight className="h-3 w-3" />
                Executive KPIs & critical actions
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex-shrink-0">
            <Link href="/reporting" className="w-full">
              <Button className="w-full" size="lg">
                <TrendingUp className="h-4 w-4 mr-2" />
                Open Reporting Dashboard
              </Button>
            </Link>
          </CardFooter>
        </Card>

        <FinanceBoard />
      </div>
    </div>
  );
}
