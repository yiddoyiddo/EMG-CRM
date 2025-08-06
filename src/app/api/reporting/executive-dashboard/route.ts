import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireRole } from '@/lib/authorize';
import { getCache, setCache } from '@/lib/cache';
import { subDays, startOfQuarter, endOfQuarter, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays } from 'date-fns';
import {
  calculateKPIs,
  calculateTeamPerformance,
  assessPipelineHealth,
  calculateTrends,
  identifyCriticalActions,
  calculateFinancialSummary,
  generatePredictiveInsights
} from '@/lib/reporting-helpers';

interface ExecutiveDashboard {
  // Key Performance Indicators by time period
  kpis: {
    thisWeek: {
      callVolume: {
        current: number;
        target: number;
        status: 'excellent' | 'good' | 'needs_attention' | 'critical';
      };
      agreements: {
        current: number;
        target: number;
        status: 'excellent' | 'good' | 'needs_attention' | 'critical';
      };
      listsOut: {
        current: number;
        target: number;
        status: 'excellent' | 'good' | 'needs_attention' | 'critical';
      };
      sales: {
        current: number;
        target: number;
        status: 'excellent' | 'good' | 'needs_attention' | 'critical';
      };
    };
    lastWeek: {
      callVolume: {
        current: number;
        target: number;
        status: 'excellent' | 'good' | 'needs_attention' | 'critical';
      };
      agreements: {
        current: number;
        target: number;
        status: 'excellent' | 'good' | 'needs_attention' | 'critical';
      };
      listsOut: {
        current: number;
        target: number;
        status: 'excellent' | 'good' | 'needs_attention' | 'critical';
      };
      sales: {
        current: number;
        target: number;
        status: 'excellent' | 'good' | 'needs_attention' | 'critical';
      };
    };
    thisMonth: {
      callVolume: {
        current: number;
        target: number;
        status: 'excellent' | 'good' | 'needs_attention' | 'critical';
      };
      agreements: {
        current: number;
        target: number;
        status: 'excellent' | 'good' | 'needs_attention' | 'critical';
      };
      listsOut: {
        current: number;
        target: number;
        status: 'excellent' | 'good' | 'needs_attention' | 'critical';
      };
      conversionRate: {
        current: number;
        target: number;
        status: 'excellent' | 'good' | 'needs_attention' | 'critical';
      };
    };
    lastMonth: {
      callVolume: {
        current: number;
        target: number;
        status: 'excellent' | 'good' | 'needs_attention' | 'critical';
      };
      agreements: {
        current: number;
        target: number;
        status: 'excellent' | 'good' | 'needs_attention' | 'critical';
      };
      listsOut: {
        current: number;
        target: number;
        status: 'excellent' | 'good' | 'needs_attention' | 'critical';
      };
      conversionRate: {
        current: number;
        target: number;
        status: 'excellent' | 'good' | 'needs_attention' | 'critical';
      };
    };
  };
  
  // Team Performance Summary
  teamPerformance: {
    totalBDRs: number;
    activeBDRs: number;
    topPerformers: string[];
    needsSupport: string[];
    benchmarkMetrics: {
      avgCallsPerWeek: number;
      avgAgreementsPerMonth: number;
      avgListsPerMonth: number;
      teamConversionRate: number;
    };
  };
  
  // Pipeline Health
  pipelineHealth: {
    upcomingCalls: {
      nextWeek: number;
      next2Weeks: number;
      total: number;
    };
    pendingAgreements: {
      proposalsAwaitingResponse: number;
      agreementsAwaitingLists: number;
      overduePartnerLists: number;
    };
    activeListsOut: {
      total: number;
      smallLists: number;
      mediumLists: number;
      largeLists: number;
      averageListSize: number;
    };
    conversionFunnel: {
      callsBooked: number;
      callsConducted: number;
      proposalsSent: number;
      agreementsSigned: number;
      listsSent: number;
      salesGenerated: number;
    };
  };
  
  // Time-based Trends
  trends: {
    weeklyCallVolume: Array<{
      week: string;
      calls: number;
      target: number;
      variance: number;
    }>;
    monthlyAgreements: Array<{
      month: string;
      agreements: number;
      target: number;
      variance: number;
    }>;
    quarterlyListsOut: Array<{
      quarter: string;
      lists: number;
      conversions: number;
      revenue: number;
    }>;
  };
  
  // Critical Actions Required
  criticalActions: Array<{
    priority: 'urgent' | 'high' | 'medium';
    category: 'calls' | 'agreements' | 'lists' | 'team';
    action: string;
    assignedTo?: string;
    metric?: number;
    deadline?: string;
  }>;
  
  // BDR List
  bdrList: string[];

  // Revenue & Financial Metrics
  financialSummary: {
    monthlyRevenue: number;
    quarterlyRevenue: number;
    revenuePerBDR: number;
    revenuePerCall: number;
    revenuePerList: number;
    forecastAccuracy: number;
  };
  
  // Predictive Insights
  predictions: {
    expectedCallsNextWeek: number;
    expectedAgreementsNextMonth: number;
    expectedRevenueNextQuarter: number;
    riskFactors: string[];
    opportunities: string[];
  };
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || 'current'; // current, historical, forecast
    const bdr = searchParams.get('bdr');
    
    // Basic LRU cache (5-min TTL)
    const cacheKey = `exec-${bdr || 'all'}`;
    const cached = getCache<any>(cacheKey);
    if (cached) {
      return NextResponse.json(cached);
    }

    const now = new Date();
    
    // Date ranges
    const thisWeekStart = startOfWeek(now, { weekStartsOn: 1 });
    const thisWeekEnd = endOfWeek(now, { weekStartsOn: 1 });
    const thisMonthStart = startOfMonth(now);
    const thisMonthEnd = endOfMonth(now);
    const thisQuarterStart = startOfQuarter(now);
    const thisQuarterEnd = endOfQuarter(now);
    const lastMonthStart = startOfMonth(subDays(now, 30)); // Last 30 days for historical
    const lastMonthEnd = endOfMonth(subDays(now, 30));
    const nextWeekEnd = endOfWeek(addDays(now, 7), { weekStartsOn: 1 });
    const next2WeeksEnd = endOfWeek(addDays(now, 14), { weekStartsOn: 1 });
    
    // Build where clauses
    const pipelineWhere: any = {};
    const financeWhere: any = {};
    if (bdr) {
      pipelineWhere.bdr = bdr;
      financeWhere.bdr = bdr;
    }

    const activityLogWhere: any = {
      timestamp: {
        gte: subDays(now, 90) // Last 90 days
      }
    };
    if (bdr) {
      activityLogWhere.bdr = bdr;
    }

    const leadWhere: any = {};
    if (bdr) {
      leadWhere.bdr = bdr;
    }

    // Get comprehensive data
    const [
      pipelineItems,
      activityLogs,
      leads,
      allBDRs,
      kpiTargetsRaw,
      financeEntries
    ] = await Promise.all([
      prisma.pipelineItem.findMany({
        where: pipelineWhere,
        select: {
          id: true,
          name: true,
          bdr: true,
          category: true,
          status: true,
          addedDate: true,
          lastUpdated: true,
          callDate: true,
          expectedCloseDate: true,
          partnerListSentDate: true,
          partnerListSize: true,
          firstSaleDate: true,
          totalSalesFromList: true,
          value: true,
          isSublist: true,
          parentId: true,
          notes: true,
        },
      }),
      prisma.activityLog.findMany({
        where: activityLogWhere,
        select: {
          id: true,
          bdr: true,
          activityType: true,
          timestamp: true,
          pipelineItemId: true,
          notes: true,
        },
      }),
      prisma.lead.findMany({
        where: leadWhere,
        select: {
          id: true,
          bdr: true,
          status: true,
          addedDate: true,
        },
      }),
      prisma.pipelineItem.findMany({
        select: { bdr: true },
        distinct: ['bdr']
      }).then(p => p.map(i => i.bdr).filter(Boolean) as string[]),
      prisma.kpiTarget.findMany(),
      prisma.financeEntry.findMany({
        where: financeWhere,
        select: {
          id: true,
          bdr: true,
          status: true,
          soldAmount: true,
          gbpAmount: true,
          invoiceDate: true,
          createdAt: true,
          month: true,
        },
      }),
    ]);

    const kpiTargets = kpiTargetsRaw.reduce((acc: { [key: string]: number }, target: { name: string, value: number }) => {
      acc[target.name] = target.value;
      return acc;
    }, {});

    // Calculate KPIs
    const kpis = calculateKPIs(pipelineItems, activityLogs, kpiTargets, now, financeEntries);
    
    // Team Performance Analysis
    const teamPerformance = calculateTeamPerformance(pipelineItems, activityLogs, financeEntries);
    
    // Pipeline Health Assessment
    const pipelineHealth = assessPipelineHealth(pipelineItems, activityLogs, now, financeEntries);
    
    // Trend Analysis
    const trends = calculateTrends(pipelineItems, activityLogs, now, financeEntries);
    
    // Critical Actions
    const criticalActions = identifyCriticalActions(pipelineItems, activityLogs, teamPerformance, now);
    
    // Financial Summary
    const financialSummary = calculateFinancialSummary(pipelineItems, activityLogs, now, financeEntries);
    
    // Predictive Insights
    const predictions = generatePredictiveInsights(pipelineItems, activityLogs, trends, now);

    const dashboard: ExecutiveDashboard = {
      kpis,
      teamPerformance,
      pipelineHealth,
      trends,
      criticalActions,
      financialSummary,
      predictions,
      bdrList: allBDRs
    };

    const respBody = {
      dashboard,
      generatedAt: now.toISOString(),
      period,
    };

    setCache(cacheKey, respBody);

    return NextResponse.json(respBody);
    
  } catch (error) {
    console.error('Error generating executive dashboard:', error);
    return NextResponse.json({ 
      error: (error as Error).message,
      dashboard: null
    }, { status: 500 });
  }
} 