import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { 
  startOfWeek, endOfWeek, startOfMonth, endOfMonth, 
  subWeeks, subMonths, format, startOfDay, endOfDay, subDays, addWeeks, addDays
} from 'date-fns';

// Enhanced conversion funnel stages mapping
type PipelineStatus = 'BDR Followed Up' | 'Call Booked' | 'Proposal - Profile' | 'Proposal - Media Sales' | 
                     'Agreement - Profile' | 'List Out' | 'Sold' | 'DECLINED' | 'Passed Over';

const CONVERSION_FUNNEL_STAGES = [
  { key: 'call_proposed', label: 'Call Proposed', statuses: ['BDR Followed Up'] as PipelineStatus[] },
  { key: 'call_booked', label: 'Call Booked', statuses: ['Call Booked'] as PipelineStatus[] },
  { key: 'proposal_sent', label: 'Proposal Sent', statuses: ['Proposal - Profile', 'Proposal - Media Sales'] as PipelineStatus[] },
  { key: 'agreement_reached', label: 'Agreement Reached', statuses: ['Agreement - Profile'] as PipelineStatus[] },
  { key: 'list_out', label: 'List Out', statuses: ['List Out'] as PipelineStatus[] },
  { key: 'sold', label: 'Sold', statuses: ['Sold'] as PipelineStatus[] },
  { key: 'declined', label: 'Declined/Q&A', statuses: ['DECLINED', 'Passed Over'] as PipelineStatus[] }
] as const;

interface ConversionFunnelStage {
  stage: string;
  count: number;
  percentage: number;
  conversionRate: number;
  teamAverage: number;
  dropoffRate: number;
}

interface BDRConversionFunnel {
  bdr: string;
  stages: ConversionFunnelStage[];
  totalItems: number;
  conversionEfficiency: number;
}

interface DetailedBDRMetrics {
  bdr: string;
  
  // Core metrics
  totalItems: number;
  conversionEfficiency: number;
  activityScore: number;
  
  // Conversion funnel
  conversionFunnel: ConversionFunnelStage[];
  
  // Time-based metrics
  thisWeek: {
    callsProposed: number;
    callsBooked: number;
    proposalsSent: number;
    agreementsSigned: number;
    listsOut: number;
    sold: number;
  };
  thisMonth: {
    callsProposed: number;
    callsBooked: number;
    proposalsSent: number;
    agreementsSigned: number;
    listsOut: number;
    sold: number;
  };
  
  // Forecast metrics (most important)
  forecast: {
    upcomingCalls: number;
    pendingAgreements: number;
    listsOut: number;
    projectedClosures: number;
    nextWeekCallsScheduled: number;
    next30DaysRevenuePotential: number;
  };
  
  // Performance tracking
  weeklyTarget: number;
  weeklyProgress: number;
  monthlyTarget: number;
  monthlyProgress: number;
  
  // Conversion rates
  callToProposalRate: number;
  proposalToAgreementRate: number;
  agreementToSoldRate: number;
  overallConversionRate: number;
  
  // Category breakdown
  categoryDistribution: Array<{
    category: string;
    count: number;
    percentage: number;
  }>;
  
  // Trend analysis
  weeklyTrend: Array<{
    week: string;
    callsProposed: number;
    callsBooked: number;
    proposalsSent: number;
    agreements: number;
    sold: number;
  }>;
  
  // Performance vs team
  vsTeamAverage: {
    conversionRate: { value: number; comparison: 'above' | 'below' | 'average' };
    activityScore: { value: number; comparison: 'above' | 'below' | 'average' };
    efficiency: { value: number; comparison: 'above' | 'below' | 'average' };
  };
}

interface EnhancedUnifiedReportingData {
  // Executive Overview
  executiveOverview: {
    totalLeads: number;
    totalPipelineItems: number;
    teamActivityScore: number;
    overallConversionRate: number;
    totalRevenuePotential: number;
    monthlyRecurringRevenue: number;
  };

  // Team Conversion Funnel (Primary Focus)
  teamConversionFunnel: {
    stages: ConversionFunnelStage[];
    totalFunnelVolume: number;
    overallEfficiency: number;
    biggestDropoff: { stage: string; rate: number };
    "improvement opportunities": string[];
  };

  // Forecasting Metrics (Primary Focus)
  forecastMetrics: {
    upcomingCalls: {
      today: number;
      tomorrow: number;
      thisWeek: number;
      nextWeek: number;
      next30Days: number;
    };
    pendingAgreements: {
      total: number;
      profile: number;
      media: number;
      averageValue: number;
      totalValue: number;
    };
    listsOut: {
      total: number;
      thisWeek: number;
      averageDaysToClose: number;
      conversionRate: number;
    };
    revenue: {
      projectedThisMonth: number;
      projectedNext30Days: number;
      pipelineValue: number;
      weightedPipelineValue: number;
    };
  };

  // Individual BDR Performance (Enhanced)
  bdrPerformance: DetailedBDRMetrics[];

  // Team Analytics
  teamAnalytics: {
    topPerformer: { bdr: string; metric: string; value: number };
    needsAttention: { bdr: string; issue: string };
    teamAverages: {
      conversionRate: number;
      activityScore: number;
      callToProposalRate: number;
      proposalToAgreementRate: number;
      agreementToSoldRate: number;
    };
    weekOverWeekGrowth: number;
    monthOverMonthGrowth: number;
  };

  // Activity Analysis
  activityAnalysis: {
    dailyMetrics: Array<{
      date: string;
      callsProposed: number;
      callsBooked: number;
      proposalsSent: number;
      agreements: number;
      sold: number;
      totalActivity: number;
    }>;
    weeklyComparison: Array<{
      period: string;
      callsProposed: number;
      callsBooked: number;
      proposalsSent: number;
      agreements: number;
      sold: number;
    }>;
    activityHeatmap: Array<{
      bdr: string;
      day: string;
      activity: number;
    }>;
  };

  // Performance Insights
  insights: {
    topOpportunities: string[];
    criticalAlerts: string[];
    recommendations: string[];
  };
}

export async function GET() {
  try {
    const now = new Date();
    
    // Date calculations
    const thisWeekStart = startOfWeek(now, { weekStartsOn: 1 });
    const thisWeekEnd = endOfWeek(now, { weekStartsOn: 1 });
    const lastWeekStart = startOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });
    const lastWeekEnd = endOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });
    const nextWeekStart = startOfWeek(addWeeks(now, 1), { weekStartsOn: 1 });
    const nextWeekEnd = endOfWeek(addWeeks(now, 1), { weekStartsOn: 1 });
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);
    const lastMonthStart = startOfMonth(subMonths(now, 1));
    const lastMonthEnd = endOfMonth(subMonths(now, 1));

    // Get all data in parallel
    const [allPipelineItems, allLeads, activityLogs, financeEntries] = await Promise.all([
      prisma.pipelineItem.findMany({
        select: {
          id: true,
          bdr: true,
          category: true,
          status: true,
          callDate: true,
          lastUpdated: true,
          addedDate: true,
          value: true,
          probability: true,
          expectedCloseDate: true,
          company: true,
          name: true,
        },
      }),
      prisma.lead.count(),
      prisma.activityLog.findMany({
        where: {
          timestamp: {
            gte: subDays(now, 60), // Extended to 60 days for better analysis
          },
        },
        select: {
          id: true,
          bdr: true,
          activityType: true,
          timestamp: true,
          description: true,
          pipelineItemId: true,
          previousStatus: true,
          newStatus: true,
        },
      }),
      prisma.financeEntry.findMany({
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

    // Helper function to get stage for status
    const getStageForStatus = (status: string): string | null => {
      const stage = CONVERSION_FUNNEL_STAGES.find(s => s.statuses.includes(status as PipelineStatus));
      return stage ? stage.key : null;
    };

    // Helper function to calculate conversion funnel for team or individual BDR
    const calculateConversionFunnel = (items: typeof allPipelineItems): ConversionFunnelStage[] => {
      const totalItems = items.length;
      if (totalItems === 0) return [];

      const stageCounts = CONVERSION_FUNNEL_STAGES.map(stage => ({
        ...stage,
        count: items.filter(item => stage.statuses.includes(item.status as PipelineStatus)).length
      }));

      // Calculate progression through funnel (excluding declined path)
      const progressiveStages = stageCounts.filter(s => s.key !== 'declined');
      const startingVolume = progressiveStages.reduce((sum, s) => sum + s.count, 0);

      return CONVERSION_FUNNEL_STAGES.map((stage, index) => {
        const stageData = stageCounts.find(s => s.key === stage.key)!;
        const count = stageData.count;
        const percentage = totalItems > 0 ? (count / totalItems) * 100 : 0;
        
        // Calculate conversion rate from previous stage
        let conversionRate = 100;
        let dropoffRate = 0;
        
        if (index > 0 && stage.key !== 'declined') {
          const previousStage = progressiveStages[index - 1];
          if (previousStage && previousStage.count > 0) {
            conversionRate = (count / previousStage.count) * 100;
            dropoffRate = 100 - conversionRate;
          }
        }

        return {
          stage: stage.label,
          count,
          percentage: Math.round(percentage * 100) / 100,
          conversionRate: Math.round(conversionRate * 100) / 100,
          teamAverage: 0, // Will be calculated later
          dropoffRate: Math.round(dropoffRate * 100) / 100
        };
      });
    };

    // Calculate team conversion funnel
    const teamFunnelStages = calculateConversionFunnel(allPipelineItems);
    const totalFunnelVolume = allPipelineItems.length;
    const overallConversionRate = totalFunnelVolume > 0 ? 
      (teamFunnelStages.find(s => s.stage === 'Sold')?.count || 0) / totalFunnelVolume * 100 : 0;

    // Find biggest dropoff
    const dropoffRates = teamFunnelStages.filter(s => s.dropoffRate > 0);
    const biggestDropoff = dropoffRates.reduce((max, stage) => 
      stage.dropoffRate > max.rate ? { stage: stage.stage, rate: stage.dropoffRate } : max,
      { stage: '', rate: 0 }
    );

    // Group items by BDR for detailed analysis
    const bdrData: { [key: string]: typeof allPipelineItems } = {};
    allPipelineItems.forEach(item => {
      if (item.bdr) {
        if (!bdrData[item.bdr]) bdrData[item.bdr] = [];
        bdrData[item.bdr].push(item);
      }
    });

    // Group finance entries by BDR for sales analysis
    const bdrFinanceData: { [key: string]: typeof financeEntries } = {};
    financeEntries.forEach(entry => {
      if (entry.bdr) {
        if (!bdrFinanceData[entry.bdr]) bdrFinanceData[entry.bdr] = [];
        bdrFinanceData[entry.bdr].push(entry);
      }
    });

    // Get KPI targets for individual BDRs (fetch once outside the loop)
    const kpiTargetsRaw = await prisma.kpiTarget.findMany();
    const kpiTargets = kpiTargetsRaw.reduce((acc: { [key: string]: number }, target: { name: string, value: number }) => {
      acc[target.name] = target.value;
      return acc;
    }, {});
    
    // Calculate detailed BDR metrics
    const bdrPerformance: DetailedBDRMetrics[] = Object.entries(bdrData).map(([bdrName, items]) => {
      const bdrActivityLogs = activityLogs.filter(log => log.bdr === bdrName);
      const bdrFinanceEntries = bdrFinanceData[bdrName] || [];
      
      // Calculate conversion funnel for this BDR
      const bdrFunnel = calculateConversionFunnel(items);
      
      // Time-based metrics
      const thisWeekItems = items.filter(item => 
        item.lastUpdated >= thisWeekStart && item.lastUpdated <= thisWeekEnd
      );
      const thisMonthItems = items.filter(item => 
        item.lastUpdated >= monthStart && item.lastUpdated <= monthEnd
      );

      // Sales metrics from finance entries
      const thisWeekSales = bdrFinanceEntries.filter(entry => 
        entry.createdAt >= thisWeekStart && entry.createdAt <= thisWeekEnd
      );
      const thisMonthSales = bdrFinanceEntries.filter(entry => 
        entry.createdAt >= monthStart && entry.createdAt <= monthEnd
      );

      const thisWeek = {
        callsProposed: thisWeekItems.filter(item => 
          CONVERSION_FUNNEL_STAGES[0].statuses.includes(item.status as any)
        ).length,
        callsBooked: thisWeekItems.filter(item => 
          CONVERSION_FUNNEL_STAGES[1].statuses.includes(item.status as any)
        ).length,
        proposalsSent: thisWeekItems.filter(item => 
          CONVERSION_FUNNEL_STAGES[2].statuses.includes(item.status as any)
        ).length,
        agreementsSigned: thisWeekItems.filter(item => 
          CONVERSION_FUNNEL_STAGES[3].statuses.includes(item.status as any)
        ).length,
        listsOut: thisWeekItems.filter(item => 
          CONVERSION_FUNNEL_STAGES[4].statuses.includes(item.status as any)
        ).length,
        sold: thisWeekSales.length, // Use finance entries for sales count
      };

      const thisMonth = {
        callsProposed: thisMonthItems.filter(item => 
          CONVERSION_FUNNEL_STAGES[0].statuses.includes(item.status as any)
        ).length,
        callsBooked: thisMonthItems.filter(item => 
          CONVERSION_FUNNEL_STAGES[1].statuses.includes(item.status as any)
        ).length,
        proposalsSent: thisMonthItems.filter(item => 
          CONVERSION_FUNNEL_STAGES[2].statuses.includes(item.status as any)
        ).length,
        agreementsSigned: thisMonthItems.filter(item => 
          CONVERSION_FUNNEL_STAGES[3].statuses.includes(item.status as any)
        ).length,
        listsOut: thisMonthItems.filter(item => 
          CONVERSION_FUNNEL_STAGES[4].statuses.includes(item.status as any)
        ).length,
        sold: thisMonthSales.length, // Use finance entries for sales count
      };

      // Forecasting metrics (most important)
      const upcomingCalls = items.filter(item => 
        item.status === 'Call Booked' && 
        item.callDate && 
        item.callDate > now
      ).length;

      const pendingAgreements = items.filter(item => 
        item.status === 'Agreement - Profile'
      ).length;

      const listsOut = items.filter(item => 
        item.status === 'List Out'
      ).length;

      const nextWeekCalls = items.filter(item => 
        item.status === 'Call Booked' && 
        item.callDate && 
        item.callDate >= nextWeekStart && 
        item.callDate <= nextWeekEnd
      ).length;

      // Revenue potential calculation from finance entries
      const bdrRevenue = bdrFinanceEntries.reduce((sum, entry) => sum + (entry.gbpAmount || 0), 0);
      const next30DaysRevenuePotential = bdrRevenue * 0.1; // Estimate 10% of current revenue for next 30 days

      // Conversion rates
      const callToProposalCount = items.filter(item => 
        ['Proposal - Profile', 'Proposal - Media Sales', 'Agreement - Profile', 'List Out', 'Sold'].includes(item.status)
      ).length;
      const proposalToAgreementCount = items.filter(item => 
        ['Agreement - Profile', 'List Out', 'Sold'].includes(item.status)
      ).length;
      const agreementToSoldCount = bdrFinanceEntries.length; // Use finance entries count as sold count
      const totalProposals = items.filter(item => 
        ['Proposal - Profile', 'Proposal - Media Sales'].includes(item.status)
      ).length;

      const callToProposalRate = items.length > 0 ? (callToProposalCount / items.length) * 100 : 0;
      const proposalToAgreementRate = totalProposals > 0 ? (proposalToAgreementCount / totalProposals) * 100 : 0;
      const agreementToSoldRate = pendingAgreements > 0 ? (agreementToSoldCount / pendingAgreements) * 100 : 0;
      const overallConversionRate = items.length > 0 ? (agreementToSoldCount / items.length) * 100 : 0;

      // Activity score calculation
      const recentActivityCount = bdrActivityLogs.filter(log => 
        log.timestamp >= subDays(now, 7)
      ).length;
      const activityScore = Math.min(100, (recentActivityCount / Math.max(items.length, 1)) * 100);

      // Category distribution
      const categoryCount: { [key: string]: number } = {};
      items.forEach(item => {
        if (item.category) {
          categoryCount[item.category] = (categoryCount[item.category] || 0) + 1;
        }
      });
      
      const categoryDistribution = Object.entries(categoryCount).map(([category, count]) => ({
        category,
        count,
        percentage: items.length > 0 ? (count / items.length) * 100 : 0
      }));

      // Weekly trend analysis
      const weeklyTrend = [];
      for (let i = 4; i >= 0; i--) {
        const weekStart = startOfWeek(subWeeks(now, i), { weekStartsOn: 1 });
        const weekEnd = endOfWeek(subWeeks(now, i), { weekStartsOn: 1 });
        
        const weekItems = items.filter(item => 
          item.lastUpdated >= weekStart && item.lastUpdated <= weekEnd
        );
        
        const weekSales = bdrFinanceEntries.filter(entry => 
          entry.createdAt >= weekStart && entry.createdAt <= weekEnd
        );
        
        weeklyTrend.push({
          week: `Week ${5 - i}`,
          callsProposed: weekItems.filter(item => item.status === 'BDR Followed Up').length,
          callsBooked: weekItems.filter(item => item.status === 'Call Booked').length,
          proposalsSent: weekItems.filter(item => 
            ['Proposal - Profile', 'Proposal - Media Sales'].includes(item.status)
          ).length,
          agreements: weekItems.filter(item => item.status === 'Agreement - Profile').length,
          sold: weekSales.length // Use finance entries for sales count
        });
      }

      // Targets and progress using new KPI targets
      const weeklyTarget = kpiTargets.weeklyAgreements || 3; // Agreements per week
      const monthlyTarget = kpiTargets.monthlyAgreements || 12; // Agreements per month
      const weeklyProgress = (thisWeek.agreementsSigned / weeklyTarget) * 100;
      const monthlyProgress = (thisMonth.agreementsSigned / monthlyTarget) * 100;

      // Conversion efficiency score
      const conversionEfficiency = (overallConversionRate + activityScore) / 2;

      return {
        bdr: bdrName,
        totalItems: items.length,
        conversionEfficiency: Math.round(conversionEfficiency * 100) / 100,
        activityScore: Math.round(activityScore * 100) / 100,
        conversionFunnel: bdrFunnel,
        thisWeek,
        thisMonth,
        forecast: {
          upcomingCalls,
          pendingAgreements,
          listsOut,
          projectedClosures: Math.round(pendingAgreements * 0.7), // 70% estimated close rate
          nextWeekCallsScheduled: nextWeekCalls,
          next30DaysRevenuePotential: Math.round(next30DaysRevenuePotential)
        },
        weeklyTarget,
        weeklyProgress: Math.round(weeklyProgress * 100) / 100,
        monthlyTarget,
        monthlyProgress: Math.round(monthlyProgress * 100) / 100,
        callToProposalRate: Math.round(callToProposalRate * 100) / 100,
        proposalToAgreementRate: Math.round(proposalToAgreementRate * 100) / 100,
        agreementToSoldRate: Math.round(agreementToSoldRate * 100) / 100,
        overallConversionRate: Math.round(overallConversionRate * 100) / 100,
        categoryDistribution,
        weeklyTrend,
        vsTeamAverage: {
          conversionRate: { 
            value: overallConversionRate, 
            comparison: overallConversionRate > overallConversionRate ? 'above' : 'below' 
          },
          activityScore: { 
            value: activityScore, 
            comparison: activityScore > 50 ? 'above' : 'below' 
          },
          efficiency: { 
            value: conversionEfficiency, 
            comparison: conversionEfficiency > 50 ? 'above' : 'below' 
          }
        }
      };
    });

    // Calculate team averages
    const teamAverages = {
      conversionRate: bdrPerformance.length > 0 ? 
        bdrPerformance.reduce((sum, bdr) => sum + bdr.overallConversionRate, 0) / bdrPerformance.length : 0,
      activityScore: bdrPerformance.length > 0 ? 
        bdrPerformance.reduce((sum, bdr) => sum + bdr.activityScore, 0) / bdrPerformance.length : 0,
      callToProposalRate: bdrPerformance.length > 0 ? 
        bdrPerformance.reduce((sum, bdr) => sum + bdr.callToProposalRate, 0) / bdrPerformance.length : 0,
      proposalToAgreementRate: bdrPerformance.length > 0 ? 
        bdrPerformance.reduce((sum, bdr) => sum + bdr.proposalToAgreementRate, 0) / bdrPerformance.length : 0,
      agreementToSoldRate: bdrPerformance.length > 0 ? 
        bdrPerformance.reduce((sum, bdr) => sum + bdr.agreementToSoldRate, 0) / bdrPerformance.length : 0,
    };

    // Update BDR performance with team averages for comparison
    bdrPerformance.forEach(bdr => {
      bdr.vsTeamAverage = {
        conversionRate: { 
          value: bdr.overallConversionRate, 
          comparison: bdr.overallConversionRate > teamAverages.conversionRate ? 'above' : 
                     bdr.overallConversionRate < teamAverages.conversionRate ? 'below' : 'average'
        },
        activityScore: { 
          value: bdr.activityScore, 
          comparison: bdr.activityScore > teamAverages.activityScore ? 'above' : 
                     bdr.activityScore < teamAverages.activityScore ? 'below' : 'average'
        },
        efficiency: { 
          value: bdr.conversionEfficiency, 
          comparison: bdr.conversionEfficiency > (teamAverages.conversionRate + teamAverages.activityScore) / 2 ? 'above' : 'below'
        }
      };
    });

    // Calculate executive overview
    const totalRevenuePotential = allPipelineItems
      .filter(item => item.value && item.probability)
      .reduce((sum, item) => sum + (item.value! * (item.probability! / 100)), 0);

    const monthlyRecurringRevenue = financeEntries
      .filter(entry => {
        const currentMonth = new Date().toISOString().slice(0, 7);
        return entry.month === currentMonth;
      })
      .reduce((sum, entry) => sum + (entry.gbpAmount || 0), 0);

    // Daily metrics for activity analysis
    const dailyMetrics = [];
    for (let i = 7; i >= 0; i--) {
      const date = subDays(now, i);
      const dayStart = startOfDay(date);
      const dayEnd = endOfDay(date);
      
      const dayItems = allPipelineItems.filter(item => 
        item.addedDate >= dayStart && item.addedDate <= dayEnd
      );
      
      const daySales = financeEntries.filter(entry => 
        entry.invoiceDate && 
        entry.invoiceDate >= dayStart && entry.invoiceDate <= dayEnd
      );
      
      const dayMetrics = {
        date: format(date, 'MMM dd'),
        callsProposed: dayItems.filter(item => item.status === 'BDR Followed Up').length,
        callsBooked: dayItems.filter(item => item.status === 'Call Booked').length,
        proposalsSent: dayItems.filter(item => 
          ['Proposal - Profile', 'Proposal - Media Sales'].includes(item.status)
        ).length,
        agreements: dayItems.filter(item => item.status === 'Agreement - Profile').length,
        sold: daySales.length, // Use finance entries for sales count
        totalActivity: dayItems.length
      };
      
      dailyMetrics.push(dayMetrics);
    }

    // Forecasting metrics
    const upcomingCallsData = {
      today: allPipelineItems.filter(item => 
        item.status === 'Call Booked' && 
        item.callDate && 
        startOfDay(item.callDate).getTime() === startOfDay(now).getTime()
      ).length,
      tomorrow: allPipelineItems.filter(item => 
        item.status === 'Call Booked' && 
        item.callDate && 
        startOfDay(item.callDate).getTime() === startOfDay(addDays(now, 1)).getTime()
      ).length,
      thisWeek: allPipelineItems.filter(item => 
        item.status === 'Call Booked' && 
        item.callDate && 
        item.callDate >= thisWeekStart && 
        item.callDate <= thisWeekEnd
      ).length,
      nextWeek: allPipelineItems.filter(item => 
        item.status === 'Call Booked' && 
        item.callDate && 
        item.callDate >= nextWeekStart && 
        item.callDate <= nextWeekEnd
      ).length,
      next30Days: allPipelineItems.filter(item => 
        item.status === 'Call Booked' && 
        item.callDate && 
        item.callDate >= now && 
        item.callDate <= addDays(now, 30)
      ).length
    };

    const pendingAgreementsData = {
      total: allPipelineItems.filter(item => item.status === 'Agreement - Profile').length,
      profile: allPipelineItems.filter(item => item.status === 'Agreement - Profile').length,
      media: allPipelineItems.filter(item => item.status === 'Agreement - Profile').length, // Adjust if media agreements exist
      averageValue: 0,
      totalValue: 0
    };

    const agreementValues = allPipelineItems
      .filter(item => item.status === 'Agreement - Profile' && item.value)
      .map(item => item.value!);
    
    if (agreementValues.length > 0) {
      pendingAgreementsData.averageValue = agreementValues.reduce((sum, val) => sum + val, 0) / agreementValues.length;
      pendingAgreementsData.totalValue = agreementValues.reduce((sum, val) => sum + val, 0);
    }

    // Compile enhanced unified data
    const enhancedUnifiedData: EnhancedUnifiedReportingData = {
      executiveOverview: {
        totalLeads: allLeads,
        totalPipelineItems: allPipelineItems.length,
        teamActivityScore: Math.round(teamAverages.activityScore * 100) / 100,
        overallConversionRate: Math.round(overallConversionRate * 100) / 100,
        totalRevenuePotential: Math.round(totalRevenuePotential),
        monthlyRecurringRevenue: Math.round(monthlyRecurringRevenue),
      },

      teamConversionFunnel: {
        stages: teamFunnelStages,
        totalFunnelVolume,
        overallEfficiency: Math.round((overallConversionRate + teamAverages.activityScore) / 2 * 100) / 100,
        biggestDropoff,
        "improvement opportunities": [
          biggestDropoff.rate > 50 ? `High dropoff at ${biggestDropoff.stage} (${biggestDropoff.rate}%)` : '',
          teamAverages.activityScore < 50 ? 'Low team activity score - increase engagement' : '',
          overallConversionRate < 20 ? 'Low overall conversion rate - review qualification process' : ''
        ].filter(Boolean)
      },

      forecastMetrics: {
        upcomingCalls: upcomingCallsData,
        pendingAgreements: pendingAgreementsData,
        listsOut: {
          total: allPipelineItems.filter(item => item.status === 'List Out').length,
          thisWeek: allPipelineItems.filter(item => 
            item.status === 'List Out' && 
            item.lastUpdated >= thisWeekStart && 
            item.lastUpdated <= thisWeekEnd
          ).length,
          averageDaysToClose: 14, // Placeholder - could be calculated from historical data
          conversionRate: 65 // Placeholder - could be calculated from historical data
        },
        revenue: {
          projectedThisMonth: Math.round(bdrPerformance.reduce((sum, bdr) => sum + bdr.forecast.next30DaysRevenuePotential, 0)),
          projectedNext30Days: Math.round(bdrPerformance.reduce((sum, bdr) => sum + bdr.forecast.next30DaysRevenuePotential, 0)),
          pipelineValue: Math.round(totalRevenuePotential),
          weightedPipelineValue: Math.round(totalRevenuePotential * 0.6) // 60% weighted average
        }
      },

      bdrPerformance: bdrPerformance.sort((a, b) => b.conversionEfficiency - a.conversionEfficiency),

      teamAnalytics: {
        topPerformer: bdrPerformance.length > 0 ? 
          { bdr: bdrPerformance[0].bdr, metric: 'Conversion Efficiency', value: bdrPerformance[0].conversionEfficiency } :
          { bdr: '', metric: '', value: 0 },
        needsAttention: bdrPerformance.length > 0 ? 
          bdrPerformance.reduce((min, bdr) => bdr.activityScore < min.score ? 
            { bdr: bdr.bdr, issue: `Low activity score (${bdr.activityScore}%)`, score: bdr.activityScore } : min,
            { bdr: '', issue: '', score: 100 }
          ) : { bdr: '', issue: '' },
        teamAverages,
        weekOverWeekGrowth: 0, // Would need historical data to calculate
        monthOverMonthGrowth: 0 // Would need historical data to calculate
      },

      activityAnalysis: {
        dailyMetrics,
        weeklyComparison: [
          {
            period: 'Last Week',
            callsProposed: allPipelineItems.filter(item => 
              item.status === 'BDR Followed Up' && 
              item.lastUpdated >= lastWeekStart && 
              item.lastUpdated <= lastWeekEnd
            ).length,
            callsBooked: allPipelineItems.filter(item => 
              item.status === 'Call Booked' && 
              item.lastUpdated >= lastWeekStart && 
              item.lastUpdated <= lastWeekEnd
            ).length,
            proposalsSent: allPipelineItems.filter(item => 
              ['Proposal - Profile', 'Proposal - Media Sales'].includes(item.status) && 
              item.lastUpdated >= lastWeekStart && 
              item.lastUpdated <= lastWeekEnd
            ).length,
            agreements: allPipelineItems.filter(item => 
              item.status === 'Agreement - Profile' && 
              item.lastUpdated >= lastWeekStart && 
              item.lastUpdated <= lastWeekEnd
            ).length,
            sold: financeEntries.filter(entry => 
              entry.createdAt >= lastWeekStart && 
              entry.createdAt <= lastWeekEnd
            ).length, // Use finance entries for sales count
          },
          {
            period: 'This Week',
            callsProposed: allPipelineItems.filter(item => 
              item.status === 'BDR Followed Up' && 
              item.lastUpdated >= thisWeekStart && 
              item.lastUpdated <= thisWeekEnd
            ).length,
            callsBooked: allPipelineItems.filter(item => 
              item.status === 'Call Booked' && 
              item.lastUpdated >= thisWeekStart && 
              item.lastUpdated <= thisWeekEnd
            ).length,
            proposalsSent: allPipelineItems.filter(item => 
              ['Proposal - Profile', 'Proposal - Media Sales'].includes(item.status) && 
              item.lastUpdated >= thisWeekStart && 
              item.lastUpdated <= thisWeekEnd
            ).length,
            agreements: allPipelineItems.filter(item => 
              item.status === 'Agreement - Profile' && 
              item.lastUpdated >= thisWeekStart && 
              item.lastUpdated <= thisWeekEnd
            ).length,
            sold: financeEntries.filter(entry => 
              entry.createdAt >= thisWeekStart && 
              entry.createdAt <= thisWeekEnd
            ).length, // Use finance entries for sales count
          }
        ],
        activityHeatmap: [] // Placeholder for future implementation
      },

      insights: {
        topOpportunities: [
          bdrPerformance.length > 0 && bdrPerformance[0].forecast.upcomingCalls > 5 ? 
            `${bdrPerformance[0].bdr} has ${bdrPerformance[0].forecast.upcomingCalls} upcoming calls` : '',
          pendingAgreementsData.total > 10 ? 
            `${pendingAgreementsData.total} pending agreements worth $${Math.round(pendingAgreementsData.totalValue).toLocaleString()}` : '',
          upcomingCallsData.next30Days > 20 ? 
            `${upcomingCallsData.next30Days} calls scheduled for next 30 days` : ''
        ].filter(Boolean),
        criticalAlerts: [
          teamAverages.activityScore < 30 ? 'Low team activity detected' : '',
          overallConversionRate < 10 ? 'Very low conversion rate needs attention' : '',
          upcomingCallsData.tomorrow === 0 ? 'No calls scheduled for tomorrow' : ''
        ].filter(Boolean),
        recommendations: [
          biggestDropoff.rate > 40 ? `Focus on improving ${biggestDropoff.stage} conversion` : '',
          teamAverages.activityScore < 50 ? 'Increase team activity and engagement' : '',
          bdrPerformance.some(bdr => bdr.forecast.upcomingCalls === 0) ? 'Some BDRs have no upcoming calls scheduled' : ''
        ].filter(Boolean)
      }
    };

    return NextResponse.json({
      ...enhancedUnifiedData,
      generatedAt: now.toISOString(),
      dataSource: 'enhanced_unified_reporting_v2'
    });

  } catch (error) {
    console.error('Error fetching enhanced unified reporting data:', error);
    return NextResponse.json({ 
      error: (error as Error).message,
    }, { status: 500 });
  }
} 