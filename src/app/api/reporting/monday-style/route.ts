import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { 
  startOfWeek, endOfWeek, startOfMonth, endOfMonth, 
  subWeeks, subMonths, format, startOfDay, endOfDay, subDays 
} from 'date-fns';

interface MondayStyleMetrics {
  // Core Call Metrics
  callsLastWeek: number;
  callsThisWeek: number;
  callsNextWeek: number;
  totalFutureCalls: number;
  mtdCalls: number;

  // Proposal Metrics
  outstandingProfileProposals: number;
  outstandingMediaProposals: number;
  totalProposalsLastWeek: number;
  totalProposalsThisWeek: number;

  // Agreement Metrics
  outstandingProfileAgreements: number;
  outstandingMediaAgreements: number;
  totalAgreementsLastWeek: number;
  totalAgreementsThisWeek: number;

  // Lists Metrics
  totalListsOutLastWeek: number;
  totalListsOutThisWeek: number;
  totalListsSoldLastWeek: number;
  totalListsSoldThisWeek: number;
  outstandingLists: number;

  // Battery/Progress Tracking
  batteryPercentage: number;
  progressBreakdown: {
    calls: number;
    proposals: number;
    agreements: number;
    lists: number;
  };

  // Individual BDR Breakdown
  bdrBreakdown: Array<{
    bdr: string;
    callsLastWeek: number;
    callsThisWeek: number;
    callsNextWeek: number;
    proposalsOutstanding: number;
    agreementsOutstanding: number;
    listsOut: number;
    batteryScore: number;
    weeklyTarget: number;
    weeklyProgress: number;
  }>;

  // Advanced Metrics (Beyond Monday)
  callOutcomes: {
    scheduled: number;
    completed: number;
    noShow: number;
    rescheduled: number;
  };
  
  proposalStatus: {
    sent: number;
    underReview: number;
    approved: number;
    declined: number;
  };

  agreementStatus: {
    pending: number;
    signed: number;
    cancelled: number;
  };

  // Time-based Performance
  dailyMetrics: Array<{
    date: string;
    calls: number;
    proposals: number;
    agreements: number;
    lists: number;
  }>;
}

export async function GET() {
  try {
    const now = new Date();
    
    // Date calculations
    const thisWeekStart = startOfWeek(now, { weekStartsOn: 1 });
    const thisWeekEnd = endOfWeek(now, { weekStartsOn: 1 });
    const lastWeekStart = startOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });
    const lastWeekEnd = endOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });
    const nextWeekStart = startOfWeek(subWeeks(now, -1), { weekStartsOn: 1 });
    const nextWeekEnd = endOfWeek(subWeeks(now, -1), { weekStartsOn: 1 });
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);

    // Get all pipeline items
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

    // Get activity logs for detailed tracking
    const activityLogs = await prisma.activityLog.findMany({
      where: {
        timestamp: {
          gte: subDays(now, 30), // Last 30 days
        },
      },
      select: {
        id: true,
        bdr: true,
        activityType: true,
        timestamp: true,
        description: true,
        pipelineItemId: true,
      },
    });

    // Core Call Metrics
    const callItems = allPipelineItems.filter(item => item.category === 'Calls');
    
    const callsLastWeek = callItems.filter(item => 
      item.callDate && item.callDate >= lastWeekStart && item.callDate <= lastWeekEnd
    ).length;
    
    const callsThisWeek = callItems.filter(item => 
      item.callDate && item.callDate >= thisWeekStart && item.callDate <= thisWeekEnd
    ).length;
    
    const callsNextWeek = callItems.filter(item => 
      item.callDate && item.callDate >= nextWeekStart && item.callDate <= nextWeekEnd
    ).length;
    
    const totalFutureCalls = callItems.filter(item => 
      item.callDate && item.callDate > now
    ).length;
    
    const mtdCalls = callItems.filter(item => 
      item.callDate && item.callDate >= monthStart && item.callDate <= monthEnd
    ).length;

    // Proposal Metrics
    const proposalItems = allPipelineItems.filter(item => 
      item.status && (item.status.includes('Proposal') || item.status.includes('proposal'))
    );
    
    const outstandingProfileProposals = proposalItems.filter(item => 
      item.status.includes('Profile') && !item.status.includes('Agreement')
    ).length;
    
    const outstandingMediaProposals = proposalItems.filter(item => 
      item.status.includes('Media') && !item.status.includes('Agreement')
    ).length;
    
    const totalProposalsLastWeek = proposalItems.filter(item => 
      item.lastUpdated >= lastWeekStart && item.lastUpdated <= lastWeekEnd
    ).length;
    
    const totalProposalsThisWeek = proposalItems.filter(item => 
      item.lastUpdated >= thisWeekStart && item.lastUpdated <= thisWeekEnd
    ).length;

    // Agreement Metrics
    const agreementItems = allPipelineItems.filter(item => 
      item.status && (item.status.includes('Agreement') || item.status.includes('agreement'))
    );
    
    const outstandingProfileAgreements = agreementItems.filter(item => 
      item.status.includes('Profile')
    ).length;
    
    const outstandingMediaAgreements = agreementItems.filter(item => 
      item.status.includes('Media')
    ).length;
    
    const totalAgreementsLastWeek = agreementItems.filter(item => 
      item.lastUpdated >= lastWeekStart && item.lastUpdated <= lastWeekEnd
    ).length;
    
    const totalAgreementsThisWeek = agreementItems.filter(item => 
      item.lastUpdated >= thisWeekStart && item.lastUpdated <= thisWeekEnd
    ).length;

    // Lists Metrics
    const listItems = allPipelineItems.filter(item => 
      item.category === 'Lists_Media_QA' || item.category === 'Lists'
    );
    
    const totalListsOutLastWeek = listItems.filter(item => 
      item.addedDate >= lastWeekStart && item.addedDate <= lastWeekEnd
    ).length;
    
    const totalListsOutThisWeek = listItems.filter(item => 
      item.addedDate >= thisWeekStart && item.addedDate <= thisWeekEnd
    ).length;
    
    const totalListsSoldLastWeek = listItems.filter(item => 
      item.status && item.status.includes('Agreement') &&
      item.lastUpdated >= lastWeekStart && item.lastUpdated <= lastWeekEnd
    ).length;
    
    const totalListsSoldThisWeek = listItems.filter(item => 
      item.status && item.status.includes('Agreement') &&
      item.lastUpdated >= thisWeekStart && item.lastUpdated <= thisWeekEnd
    ).length;
    
    const outstandingLists = listItems.filter(item => 
      !item.status || !item.status.includes('Agreement')
    ).length;

    // Battery/Progress Calculation
    const totalActivity = allPipelineItems.length;
    const completedActivity = agreementItems.length;
    const batteryPercentage = totalActivity > 0 ? (completedActivity / totalActivity) * 100 : 0;

    const progressBreakdown = {
      calls: callItems.length,
      proposals: proposalItems.length,
      agreements: agreementItems.length,
      lists: listItems.length,
    };

    // BDR Breakdown
    const bdrData: { [key: string]: any[] } = {};
    allPipelineItems.forEach(item => {
      if (item.bdr) {
        if (!bdrData[item.bdr]) bdrData[item.bdr] = [];
        bdrData[item.bdr].push(item);
      }
    });

    // Get KPI targets for individual BDRs (fetch once outside the loop)
    const kpiTargetsRaw = await prisma.kpiTarget.findMany();
    const kpiTargets = kpiTargetsRaw.reduce((acc: { [key: string]: number }, target: { name: string, value: number }) => {
      acc[target.name] = target.value;
      return acc;
    }, {});
    
    const bdrBreakdown = Object.entries(bdrData).map(([bdr, items]) => {
      const bdrCalls = items.filter(item => item.category === 'Calls');
      const bdrProposals = items.filter(item => 
        item.status && item.status.includes('Proposal')
      );
      const bdrAgreements = items.filter(item => 
        item.status && item.status.includes('Agreement')
      );
      const bdrLists = items.filter(item => 
        item.category === 'Lists_Media_QA' || item.category === 'Lists'
      );

      const weeklyTarget = kpiTargets.weeklyAgreements || 3; // Agreements per week
      const weeklyProgress = (bdrAgreements.length / weeklyTarget) * 100;
      const batteryScore = items.length > 0 ? (bdrAgreements.length / items.length) * 100 : 0;

      return {
        bdr,
        callsLastWeek: bdrCalls.filter(item => 
          item.callDate && item.callDate >= lastWeekStart && item.callDate <= lastWeekEnd
        ).length,
        callsThisWeek: bdrCalls.filter(item => 
          item.callDate && item.callDate >= thisWeekStart && item.callDate <= thisWeekEnd
        ).length,
        callsNextWeek: bdrCalls.filter(item => 
          item.callDate && item.callDate >= nextWeekStart && item.callDate <= nextWeekEnd
        ).length,
        proposalsOutstanding: bdrProposals.filter(item => 
          !item.status.includes('Agreement')
        ).length,
        agreementsOutstanding: bdrAgreements.length,
        listsOut: bdrLists.filter(item => 
          !item.status || !item.status.includes('Agreement')
        ).length,
        batteryScore: Math.round(batteryScore * 100) / 100,
        weeklyTarget,
        weeklyProgress: Math.round(weeklyProgress * 100) / 100,
      };
    });

    // Advanced Call Outcomes
    const callOutcomes = {
      scheduled: callItems.filter(item => item.callDate && item.callDate > now).length,
      completed: callItems.filter(item => item.callDate && item.callDate <= now).length,
      noShow: activityLogs.filter(log => 
        log.activityType === 'No_Show' || log.description?.includes('no show')
      ).length,
      rescheduled: activityLogs.filter(log => 
        log.activityType === 'Rescheduled' || log.description?.includes('reschedule')
      ).length,
    };

    // Proposal Status
    const proposalStatus = {
      sent: proposalItems.length,
      underReview: proposalItems.filter(item => 
        item.status.includes('Proposal') && !item.status.includes('Agreement')
      ).length,
      approved: proposalItems.filter(item => 
        item.status.includes('Agreement')
      ).length,
      declined: proposalItems.filter(item => 
        item.status.includes('Declined')
      ).length,
    };

    // Agreement Status
    const agreementStatus = {
      pending: agreementItems.filter(item => 
        !item.status.includes('Signed')
      ).length,
      signed: agreementItems.filter(item => 
        item.status.includes('Signed')
      ).length,
      cancelled: agreementItems.filter(item => 
        item.status.includes('Cancelled')
      ).length,
    };

    // Daily Metrics (last 7 days)
    const dailyMetrics = [];
    for (let i = 6; i >= 0; i--) {
      const date = subDays(now, i);
      const dayStart = startOfDay(date);
      const dayEnd = endOfDay(date);
      
      const dayItems = allPipelineItems.filter(item => 
        item.addedDate >= dayStart && item.addedDate <= dayEnd
      );
      
      dailyMetrics.push({
        date: format(date, 'MMM dd'),
        calls: dayItems.filter(item => item.category === 'Calls').length,
        proposals: dayItems.filter(item => 
          item.status && item.status.includes('Proposal')
        ).length,
        agreements: dayItems.filter(item => 
          item.status && item.status.includes('Agreement')
        ).length,
        lists: dayItems.filter(item => 
          item.category === 'Lists_Media_QA' || item.category === 'Lists'
        ).length,
      });
    }

    const metrics: MondayStyleMetrics = {
      // Core Metrics
      callsLastWeek,
      callsThisWeek,
      callsNextWeek,
      totalFutureCalls,
      mtdCalls,
      
      // Proposals
      outstandingProfileProposals,
      outstandingMediaProposals,
      totalProposalsLastWeek,
      totalProposalsThisWeek,
      
      // Agreements
      outstandingProfileAgreements,
      outstandingMediaAgreements,
      totalAgreementsLastWeek,
      totalAgreementsThisWeek,
      
      // Lists
      totalListsOutLastWeek,
      totalListsOutThisWeek,
      totalListsSoldLastWeek,
      totalListsSoldThisWeek,
      outstandingLists,
      
      // Battery
      batteryPercentage: Math.round(batteryPercentage * 100) / 100,
      progressBreakdown,
      
      // BDR Data
      bdrBreakdown,
      
      // Advanced Metrics
      callOutcomes,
      proposalStatus,
      agreementStatus,
      dailyMetrics,
    };

    return NextResponse.json({
      metrics,
      generatedAt: now.toISOString(),
      timeZone: 'UTC',
    });

  } catch (error) {
    console.error('Error fetching Monday-style metrics:', error);
    return NextResponse.json({ 
      error: (error as Error).message,
      metrics: null,
    }, { status: 500 });
  }
} 