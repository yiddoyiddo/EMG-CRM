'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { LayoutDashboard, Users, LineChart, BarChart3, TrendingUp, Calendar, ArrowRight, Shield, UserPlus, Settings } from 'lucide-react';
import Link from 'next/link';
import { FinanceBoard } from '@/components/finance-board';
import { RoleBasedDashboard } from '@/components/role-based-dashboard';
import { BDRKPIDashboard } from '@/components/bdr-kpi-dashboard';
import { useSession } from 'next-auth/react';
import { Badge } from '@/components/ui/badge';

export default function Home() {
  const { data: session } = useSession();
  const userRole = session?.user?.role;

  // Show BDR-specific dashboard for BDRs
  if (userRole === 'BDR') {
    return <BDRKPIDashboard />;
  }

  // Show role-based dashboard for all other roles
  if (session?.user) {
    return <RoleBasedDashboard />;
  }

  // Fallback for non-authenticated users
  return (
    <div className="relative mx-auto max-w-4xl space-y-10 py-8 text-center">
      <div className="space-y-4">
        <h1 className="text-4xl md:text-6xl font-semibold tracking-tight leading-[1.1]">
          <span className="bg-gradient-to-r from-primary via-chart-3 to-accent bg-clip-text text-transparent">
            EMG CRM
          </span>
        </h1>
        <p className="mx-auto max-w-2xl text-balance text-muted-foreground text-base md:text-lg">
          A sleek, focused workspace with effortless navigation and real-time insights.
        </p>
      </div>

      <Card className="mx-auto max-w-xl border-white/20 bg-white/60 dark:bg-white/5 backdrop-blur-xl shadow-[0_20px_60px_-28px_rgba(0,0,0,0.35)]">
        <CardHeader>
          <CardTitle className="text-xl md:text-2xl">Welcome</CardTitle>
          <CardDescription>Sign in for your personalized dashboard and KPIs</CardDescription>
        </CardHeader>
        <CardContent>
          <Link href="/auth/login" className="w-full">
            <Button className="w-full h-11 text-base">
              <Shield className="h-4 w-4 mr-2" />
              Sign In to Continue
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
