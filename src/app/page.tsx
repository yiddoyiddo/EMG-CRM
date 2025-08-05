'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { LayoutDashboard, Users, LineChart, BarChart3, TrendingUp, Calendar, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export default function Home() {
  return (
    <div className="space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold tracking-tight">EMG CRM Dashboard</h1>
        <p className="text-muted-foreground mt-2">Manage your leads, pipeline, and reporting from a central location</p>
      </div>
      
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 max-w-none mx-auto">
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Leads Management
            </CardTitle>
            <CardDescription>View, create, and manage all your sales leads</CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            <p>Access all your leads in a comprehensive table view. Create new leads and track their progress through your sales process.</p>
          </CardContent>
          <CardFooter>
            <Link href="/leads" className="w-full">
              <Button className="w-full" size="lg">
                <Users className="h-4 w-4 mr-2" />
                Go to Leads
              </Button>
            </Link>
          </CardFooter>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <LineChart className="h-5 w-5" />
              Pipeline Management
            </CardTitle>
            <CardDescription>Monitor and manage your sales pipeline</CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            <p>Track calls, agreements, partner lists, and sublists. Manage deals through all stages of your sales process.</p>
          </CardContent>
          <CardFooter>
            <Link href="/pipeline" className="w-full">
              <Button className="w-full" size="lg">
                <LineChart className="h-4 w-4 mr-2" />
                Go to Pipeline
              </Button>
            </Link>
          </CardFooter>
        </Card>

        <Card className="hover:shadow-lg transition-shadow border-2 border-blue-200 bg-gradient-to-br from-blue-50 via-purple-50 to-green-50">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              📊 Sales Performance Analytics
            </CardTitle>
            <CardDescription className="text-blue-700">Complete reporting & performance dashboard</CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            <p>Comprehensive reporting focused on call volume, agreements, partner lists, and BDR performance. Monitor what matters most to your business.</p>
            <div className="mt-3 text-xs text-blue-600">
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
          <CardFooter>
            <Link href="/reporting" className="w-full">
              <Button className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700" size="lg" variant="default">
                <TrendingUp className="h-4 w-4 mr-2" />
                Open Reporting Dashboard
              </Button>
            </Link>
          </CardFooter>
        </Card>
      </div>
      
      {/* Quick Stats Preview */}
      <div className="bg-muted/30 rounded-lg p-6 border">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          Quick Overview
        </h2>
        <p className="text-sm text-muted-foreground mb-4">
          Your CRM system is designed around your specific sales process: Lead → Call → Agreement → Partner List → Sales
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
          <div className="bg-background rounded-lg p-4 border">
            <div className="text-2xl font-bold text-blue-600">📞</div>
            <div className="text-sm font-medium">Call Management</div>
            <div className="text-xs text-muted-foreground">Schedule, track, convert</div>
          </div>
          <div className="bg-background rounded-lg p-4 border">
            <div className="text-2xl font-bold text-green-600">📋</div>
            <div className="text-sm font-medium">Agreement Tracking</div>
            <div className="text-xs text-muted-foreground">Monitor list deployment timing</div>
          </div>
          <div className="bg-background rounded-lg p-4 border">
            <div className="text-2xl font-bold text-purple-600">👥</div>
            <div className="text-sm font-medium">Partner Lists</div>
            <div className="text-xs text-muted-foreground">Size optimization & conversion</div>
          </div>
        </div>
      </div>
    </div>
  );
}
