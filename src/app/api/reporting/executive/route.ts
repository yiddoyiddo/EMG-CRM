import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { 
  startOfWeek, endOfWeek, startOfMonth, endOfMonth, 
  subWeeks, subMonths, addMonths, format, differenceInDays 
} from 'date-fns';

interface ExecutiveSummary {
  // High-level KPIs
  kpis: {
    totalAgreements: number;
    monthlyGrowthRate: number;
    averageConversionRate: number;
    pipelineHealth: 'Excellent' | 'Good' | 'Fair' | 'Poor';
    forecastAccuracy: number;
  };

  // Trends and Forecasts
  trends: {
    activityProjection: Array<{
      month: string;
      projected: number;
      actual: number;
    }>;
    activityTrends: Array<{
      week: string;
      calls: number;
      proposals: number;
      agreements: number;
      trend: 'up' | 'down' | 'stable';
    }>;
  };

  // Team Performance
  teamInsights: {
    topPerformer: {
      name: string;
      conversionRate: number;
      agreements: number;
    };
    underPerformer: {
      name: string;
      conversionRate: number;
      recommendations: string[];
    };
    teamAverage: {
      callsPerWeek: number;
      proposalsPerWeek: number;
      agreementsPerWeek: number;
      conversionRate: number;
    };
  };

  // Risk Analysis
  riskFactors: Array<{
    type: 'High' | 'Medium' | 'Low';
    description: string;
    impact: string;
    recommendation: string;
  }>;

  // Opportunities
  opportunities: Array<{
    category: string;
    description: string;
    potentialValue: number;
    timeline: string;
  }>;

  // Action Items
  actionItems: Array<{
    priority: 'High' | 'Medium' | 'Low';
    item: string;
    owner: string;
    deadline: string;
  }>;
}

export async function GET() {
  try {
    const now = new Date();
    const thisMonthStart = startOfMonth(now);
    const thisMonthEnd = endOfMonth(now);
    const lastMonthStart = startOfMonth(subMonths(now, 1));
    const lastMonthEnd = endOfMonth(subMonths(now, 1));
    const thisWeekStart = startOfWeek(now, { weekStartsOn: 1 });
    const thisWeekEnd = endOfWeek(now, { weekStartsOn: 1 });

    // Get all data
    const allPipelineItems = await prisma.pipelineItem.findMany({
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

    // Agreement calculations
    const thisMonthAgreements = allPipelineItems.filter(item => 
      item.status?.includes('Agreement') && 
      item.lastUpdated >= thisMonthStart && 
      item.lastUpdated <= thisMonthEnd
    ).length;

    const lastMonthAgreements = allPipelineItems.filter(item => 
      item.status?.includes('Agreement') && 
      item.lastUpdated >= lastMonthStart && 
      item.lastUpdated <= lastMonthEnd
    ).length;

    const monthlyGrowthRate = lastMonthAgreements > 0 
      ? ((thisMonthAgreements - lastMonthAgreements) / lastMonthAgreements) * 100 
      : 0;

    // Conversion rate calculations
    const totalCalls = allPipelineItems.filter(item => item.category === 'Calls').length;
    const totalAgreements = allPipelineItems.filter(item => item.status?.includes('Agreement')).length;
    const averageConversionRate = totalCalls > 0 ? (totalAgreements / totalCalls) * 100 : 0;

    // Pipeline health assessment
    const activePipeline = allPipelineItems.filter(item => 
      !item.status?.includes('Agreement') && !item.status?.includes('Declined')
    ).length;

    let pipelineHealth: 'Excellent' | 'Good' | 'Fair' | 'Poor' = 'Poor';
    if (activePipeline > 50) pipelineHealth = 'Excellent';
    else if (activePipeline > 25) pipelineHealth = 'Good';
    else if (activePipeline > 10) pipelineHealth = 'Fair';

    // Team performance analysis
    const bdrPerformance: { [key: string]: any } = {};
    
    allPipelineItems.forEach(item => {
      if (!item.bdr) return;
      
      if (!bdrPerformance[item.bdr]) {
        bdrPerformance[item.bdr] = {
          calls: 0,
          proposals: 0,
          agreements: 0,
        };
      }
      
      if (item.category === 'Calls') bdrPerformance[item.bdr].calls++;
      if (item.status?.includes('Proposal')) bdrPerformance[item.bdr].proposals++;
      if (item.status?.includes('Agreement')) {
        bdrPerformance[item.bdr].agreements++;
      }
    });

    // Calculate conversion rates for each BDR
    Object.keys(bdrPerformance).forEach(bdr => {
      const perf = bdrPerformance[bdr];
      perf.conversionRate = perf.calls > 0 ? (perf.agreements / perf.calls) * 100 : 0;
    });

    // Find top and underperformer
    const bdrList = Object.entries(bdrPerformance).map(([name, data]: [string, any]) => ({
      name,
      ...data,
    }));

    const topPerformer = bdrList.reduce((best, current) => 
      current.conversionRate > best.conversionRate ? current : best
    );

    const underPerformer = bdrList.reduce((worst, current) => 
      current.conversionRate < worst.conversionRate ? current : worst
    );

    // Team averages
    const teamAverage = {
      callsPerWeek: Math.round(totalCalls / Object.keys(bdrPerformance).length / 4), // Assuming 4 weeks
      proposalsPerWeek: Math.round(bdrList.reduce((sum, bdr) => sum + bdr.proposals, 0) / Object.keys(bdrPerformance).length / 4),
      agreementsPerWeek: Math.round(totalAgreements / Object.keys(bdrPerformance).length / 4),
      conversionRate: averageConversionRate,
    };

    // Risk analysis
    const riskFactors = [];
    
    if (averageConversionRate < 10) {
      riskFactors.push({
        type: 'High' as const,
        description: 'Low overall conversion rate',
        impact: 'Reduced agreements and missed targets',
        recommendation: 'Implement sales training and review call scripts',
      });
    }

    if (activePipeline < 10) {
      riskFactors.push({
        type: 'High' as const,
        description: 'Low pipeline activity',
        impact: 'Future agreement shortfall',
        recommendation: 'Increase prospecting activities and lead generation',
      });
    }

    if (monthlyGrowthRate < 0) {
      riskFactors.push({
        type: 'Medium' as const,
        description: 'Negative month-over-month growth',
        impact: 'Agreement decline trend',
        recommendation: 'Analyze lost deals and improve conversion processes',
      });
    }

    // Opportunities
    const opportunities = [];
    
    if (topPerformer.conversionRate > averageConversionRate * 1.5) {
      opportunities.push({
        category: 'Training',
        description: `Replicate ${topPerformer.name}'s successful strategies across the team`,
        potentialValue: (topPerformer.conversionRate - averageConversionRate) * totalCalls * 100, // Estimated value
        timeline: '2-4 weeks',
      });
    }

    const upcomingCalls = allPipelineItems.filter(item => 
      item.category === 'Calls' && item.callDate && item.callDate > now
    ).length;

    if (upcomingCalls > 20) {
      opportunities.push({
        category: 'Agreements',
        description: 'High volume of upcoming calls presents conversion opportunities',
        potentialValue: upcomingCalls * averageConversionRate * 50, // Estimated deal size
        timeline: '1-2 weeks',
      });
    }

    // Action items
    const actionItems = [];
    
    if (underPerformer.conversionRate < averageConversionRate * 0.5) {
      actionItems.push({
        priority: 'High' as const,
        item: `Provide additional coaching to ${underPerformer.name}`,
        owner: 'Sales Manager',
        deadline: format(addMonths(now, 0), 'MMM dd'),
      });
    }

    if (pipelineHealth === 'Poor') {
      actionItems.push({
        priority: 'High' as const,
        item: 'Increase lead generation activities',
        owner: 'Marketing Team',
        deadline: format(addMonths(now, 0), 'MMM dd'),
      });
    }

    actionItems.push({
      priority: 'Medium' as const,
      item: 'Review and optimize call scripts',
      owner: 'Sales Team',
      deadline: format(addMonths(now, 1), 'MMM dd'),
    });

    // Generate trends data (simplified)
    const activityProjection = [];
    for (let i = -2; i <= 3; i++) {
      const month = addMonths(now, i);
      const monthAgreements = i <= 0 ? 
        allPipelineItems
          .filter(item => 
            item.status?.includes('Agreement') && 
            item.lastUpdated >= startOfMonth(month) && 
            item.lastUpdated <= endOfMonth(month)
          ).length :
        thisMonthAgreements * (1 + (monthlyGrowthRate / 100)) ** i; // Projected
      
      activityProjection.push({
        month: format(month, 'MMM yyyy'),
        projected: i > 0 ? monthAgreements : 0,
        actual: i <= 0 ? monthAgreements : 0,
      });
    }

    // Activity trends (last 4 weeks)
    const activityTrends = [];
    for (let i = 3; i >= 0; i--) {
      const weekStart = startOfWeek(subWeeks(now, i), { weekStartsOn: 1 });
      const weekEnd = endOfWeek(subWeeks(now, i), { weekStartsOn: 1 });
      
      const weekCalls = allPipelineItems.filter(item => 
        item.category === 'Calls' && 
        item.callDate && item.callDate >= weekStart && item.callDate <= weekEnd
      ).length;
      
      const weekProposals = allPipelineItems.filter(item => 
        item.status?.includes('Proposal') && 
        item.lastUpdated >= weekStart && item.lastUpdated <= weekEnd
      ).length;
      
      const weekAgreements = allPipelineItems.filter(item => 
        item.status?.includes('Agreement') && 
        item.lastUpdated >= weekStart && item.lastUpdated <= weekEnd
      ).length;
      
      activityTrends.push({
        week: `Week ${4 - i}`,
        calls: weekCalls,
        proposals: weekProposals,
        agreements: weekAgreements,
        trend: 'stable' as const, // Simplified
      });
    }

    const executiveSummary: ExecutiveSummary = {
      kpis: {
        totalAgreements: thisMonthAgreements,
        monthlyGrowthRate: Math.round(monthlyGrowthRate * 100) / 100,
        averageConversionRate: Math.round(averageConversionRate * 100) / 100,
        pipelineHealth,
        forecastAccuracy: 85, // Placeholder
      },
      trends: {
        activityProjection,
        activityTrends,
      },
      teamInsights: {
        topPerformer: {
          name: topPerformer.name,
          conversionRate: Math.round(topPerformer.conversionRate * 100) / 100,
          agreements: topPerformer.agreements,
        },
        underPerformer: {
          name: underPerformer.name,
          conversionRate: Math.round(underPerformer.conversionRate * 100) / 100,
          recommendations: [
            'Schedule 1-on-1 coaching sessions',
            'Shadow top performers on calls',
            'Review and practice objection handling',
          ],
        },
        teamAverage,
      },
      riskFactors,
      opportunities,
      actionItems,
    };

    return NextResponse.json({
      summary: executiveSummary,
      generatedAt: now.toISOString(),
    });

  } catch (error) {
    console.error('Error generating executive summary:', error);
    return NextResponse.json({ 
      error: (error as Error).message,
      summary: null,
    }, { status: 500 });
  }
} 