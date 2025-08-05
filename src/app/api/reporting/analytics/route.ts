import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, subWeeks, subMonths, addWeeks, addMonths } from 'date-fns';

interface BDRAnalytics {
  bdr: string;
  totalItems: number;
  
  // Funnel Metrics
  callsScheduled: number;
  callsConducted: number;
  proposalsSent: number;
  agreementsSigned: number;
  
  // Conversion Rates
  callToProposalRate: number;
  proposalToAgreementRate: number;
  overallConversionRate: number;
  
  // Time-based Performance
  thisWeek: {
    calls: number;
    proposals: number;
    agreements: number;
  };
  thisMonth: {
    calls: number;
    proposals: number;
    agreements: number;
  };
  
  // Forward-looking Pipeline
  upcomingCalls: number;
  pendingProposals: number;
  activeListsOut: number;
  
  // Category Breakdown
  categoryDistribution: Array<{
    category: string;
    count: number;
    percentage: number;
  }>;
  
  // Performance Trends
  weeklyTrend: Array<{
    week: string;
    calls: number;
    proposals: number;
    agreements: number;
  }>;
}

export async function GET() {
  try {
    const now = new Date();
    
    // Date ranges
    const thisWeekStart = startOfWeek(now, { weekStartsOn: 1 });
    const thisWeekEnd = endOfWeek(now, { weekStartsOn: 1 });
    const thisMonthStart = startOfMonth(now);
    const thisMonthEnd = endOfMonth(now);
    const nextWeekEnd = endOfWeek(addWeeks(now, 1), { weekStartsOn: 1 });
    
    // Get all pipeline items with detailed information
    const pipelineItems = await prisma.pipelineItem.findMany({
      select: {
        id: true,
        bdr: true,
        category: true,
        status: true,
        callDate: true,
        lastUpdated: true,
        addedDate: true,
      },
    });

    // Get activity logs for more detailed tracking
    const activityLogs = await prisma.activityLog.findMany({
      select: {
        id: true,
        bdr: true,
        activityType: true,
        timestamp: true,
        pipelineItemId: true,
      },
    });

    // Group data by BDR
    const bdrData: { [key: string]: any[] } = {};
    const bdrActivities: { [key: string]: any[] } = {};
    
    pipelineItems.forEach(item => {
      if (item.bdr) {
        if (!bdrData[item.bdr]) bdrData[item.bdr] = [];
        bdrData[item.bdr].push(item);
      }
    });

    activityLogs.forEach(log => {
      if (log.bdr) {
        if (!bdrActivities[log.bdr]) bdrActivities[log.bdr] = [];
        bdrActivities[log.bdr].push(log);
      }
    });

    // Calculate analytics for each BDR
    const bdrAnalytics: BDRAnalytics[] = [];

    for (const [bdrName, items] of Object.entries(bdrData)) {
      const activities = bdrActivities[bdrName] || [];
      
      // Basic counts
      const totalItems = items.length;
      
      // Funnel analysis
      const callsItems = items.filter(item => item.category === 'Calls');
      const proposalItems = items.filter(item => 
        item.status && (item.status.includes('Proposal') || item.status.includes('proposal'))
      );
      const agreementItems = items.filter(item => 
        item.status && (item.status.includes('Agreement') || item.status.includes('agreement'))
      );
      
      const callsScheduled = callsItems.length;
      const callsConducted = callsItems.filter(item => 
        item.callDate && item.callDate <= now
      ).length;
      const proposalsSent = proposalItems.length;
      const agreementsSigned = agreementItems.length;
      
      // Conversion rates
      const callToProposalRate = callsConducted > 0 ? (proposalsSent / callsConducted) * 100 : 0;
      const proposalToAgreementRate = proposalsSent > 0 ? (agreementsSigned / proposalsSent) * 100 : 0;
      const overallConversionRate = callsConducted > 0 ? (agreementsSigned / callsConducted) * 100 : 0;
      
      // Time-based metrics
      const thisWeekCalls = callsItems.filter(item => 
        item.callDate && item.callDate >= thisWeekStart && item.callDate <= thisWeekEnd
      ).length;
      
      const thisWeekProposals = proposalItems.filter(item => 
        item.lastUpdated >= thisWeekStart && item.lastUpdated <= thisWeekEnd
      ).length;
      
      const thisWeekAgreements = agreementItems.filter(item => 
        item.lastUpdated >= thisWeekStart && item.lastUpdated <= thisWeekEnd
      ).length;
      
      const thisMonthCalls = callsItems.filter(item => 
        item.callDate && item.callDate >= thisMonthStart && item.callDate <= thisMonthEnd
      ).length;
      
      const thisMonthProposals = proposalItems.filter(item => 
        item.lastUpdated >= thisMonthStart && item.lastUpdated <= thisMonthEnd
      ).length;
      
      const thisMonthAgreements = agreementItems.filter(item => 
        item.lastUpdated >= thisMonthStart && item.lastUpdated <= thisMonthEnd
      ).length;
      
      // Forward-looking pipeline
      const upcomingCalls = callsItems.filter(item => 
        item.callDate && item.callDate > now
      ).length;
      
      const pendingProposals = proposalItems.filter(item => 
        !item.status.includes('Agreement') && !item.status.includes('Declined')
      ).length;
      
      const activeListsOut = items.filter(item => 
        item.category === 'Lists_Media_QA'
      ).length;
      
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
        percentage: totalItems > 0 ? (count / totalItems) * 100 : 0
      }));
      
      // Weekly trend (last 4 weeks)
      const weeklyTrend = [];
      for (let i = 3; i >= 0; i--) {
        const weekStart = startOfWeek(subWeeks(now, i), { weekStartsOn: 1 });
        const weekEnd = endOfWeek(subWeeks(now, i), { weekStartsOn: 1 });
        
        const weekCalls = callsItems.filter(item => 
          item.callDate && item.callDate >= weekStart && item.callDate <= weekEnd
        ).length;
        
        const weekProposals = proposalItems.filter(item => 
          item.lastUpdated >= weekStart && item.lastUpdated <= weekEnd
        ).length;
        
        const weekAgreements = agreementItems.filter(item => 
          item.lastUpdated >= weekStart && item.lastUpdated <= weekEnd
        ).length;
        
        weeklyTrend.push({
          week: `Week ${4 - i}`,
          calls: weekCalls,
          proposals: weekProposals,
          agreements: weekAgreements
        });
      }
      
      bdrAnalytics.push({
        bdr: bdrName,
        totalItems,
        callsScheduled,
        callsConducted,
        proposalsSent,
        agreementsSigned,
        callToProposalRate: Math.round(callToProposalRate * 100) / 100,
        proposalToAgreementRate: Math.round(proposalToAgreementRate * 100) / 100,
        overallConversionRate: Math.round(overallConversionRate * 100) / 100,
        thisWeek: {
          calls: thisWeekCalls,
          proposals: thisWeekProposals,
          agreements: thisWeekAgreements
        },
        thisMonth: {
          calls: thisMonthCalls,
          proposals: thisMonthProposals,
          agreements: thisMonthAgreements
        },
        upcomingCalls,
        pendingProposals,
        activeListsOut,
        categoryDistribution,
        weeklyTrend
      });
    }
    
    // Sort by overall performance
    bdrAnalytics.sort((a, b) => b.overallConversionRate - a.overallConversionRate);
    
    // Calculate team averages
    const teamAverages = {
      avgConversionRate: bdrAnalytics.reduce((sum, bdr) => sum + bdr.overallConversionRate, 0) / bdrAnalytics.length,
      avgCallToProposalRate: bdrAnalytics.reduce((sum, bdr) => sum + bdr.callToProposalRate, 0) / bdrAnalytics.length,
      avgProposalToAgreementRate: bdrAnalytics.reduce((sum, bdr) => sum + bdr.proposalToAgreementRate, 0) / bdrAnalytics.length,
      totalUpcomingCalls: bdrAnalytics.reduce((sum, bdr) => sum + bdr.upcomingCalls, 0),
      totalPendingProposals: bdrAnalytics.reduce((sum, bdr) => sum + bdr.pendingProposals, 0),
      totalActiveListsOut: bdrAnalytics.reduce((sum, bdr) => sum + bdr.activeListsOut, 0)
    };

    return NextResponse.json({
      bdrAnalytics,
      teamAverages,
      generatedAt: now.toISOString()
    });
    
  } catch (error) {
    console.error('Error fetching analytics:', error);
    return NextResponse.json({ 
      error: (error as Error).message,
      bdrAnalytics: [],
      teamAverages: {}
    }, { status: 500 });
  }
} 