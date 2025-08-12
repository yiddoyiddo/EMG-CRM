import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { startOfDay, endOfDay, subDays, format } from 'date-fns';

export async function GET() {
  try {
    const now = new Date();
    
    // Get detailed performance data for the last 30 days
    const thirtyDaysAgo = subDays(now, 30);
    
    // Get all pipeline items and activity logs for detailed analysis
    const pipelineItems = await prisma.pipelineItem.findMany({
      where: {
        addedDate: {
          gte: thirtyDaysAgo,
        },
      },
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

    // Get finance entries for sales data
    const financeEntries = await prisma.financeEntry.findMany({
      where: {
        createdAt: {
          gte: thirtyDaysAgo,
        },
      },
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
    });

    const activityLogs = await prisma.activityLog.findMany({
      where: {
        timestamp: {
          gte: thirtyDaysAgo,
        },
      },
      select: {
        id: true,
        bdr: true,
        activityType: true,
        timestamp: true,
        pipelineItemId: true,
      },
    });

    // Calculate daily performance metrics
    const dailyMetrics = [];
    for (let i = 29; i >= 0; i--) {
      const date = subDays(now, i);
      const dayStart = startOfDay(date);
      const dayEnd = endOfDay(date);
      
      const dayItems = pipelineItems.filter(item => 
        item.addedDate >= dayStart && item.addedDate <= dayEnd
      );
      
      const dayActivities = activityLogs.filter(log => 
        log.timestamp >= dayStart && log.timestamp <= dayEnd
      );

      const daySales = financeEntries.filter(entry => 
        entry.invoiceDate && 
        entry.invoiceDate >= dayStart && entry.invoiceDate <= dayEnd
      );
      
      const callsScheduled = dayItems.filter(item => item.category === 'Calls').length;
      const proposalsSent = dayItems.filter(item => 
        item.status && item.status.includes('Proposal')
      ).length;
      const agreementsSigned = dayItems.filter(item => 
        item.status && item.status.includes('Agreement')
      ).length;
      
      const totalActivities = dayActivities.length;
      // Count all sales generated on this day
      const salesCount = daySales.length;
      const salesAmount = daySales.reduce((sum, entry) => sum + (entry.gbpAmount || 0), 0);
      
      dailyMetrics.push({
        date: format(date, 'MMM dd'),
        fullDate: date.toISOString(),
        callsScheduled,
        proposalsSent,
        agreementsSigned,
        totalActivities,
        itemsAdded: dayItems.length,
        salesCount,
        salesAmount,
      });
    }

    // BDR activity analysis
    const bdrActivityAnalysis: Record<string, {
      totalActivities: number;
      activityTypes: Record<string, number>;
      recentActivity: Date | null;
      dailyAverage: number;
    }> = {};
    
    // Group activities by BDR
    activityLogs.forEach(log => {
      if (!bdrActivityAnalysis[log.bdr]) {
        bdrActivityAnalysis[log.bdr] = {
          totalActivities: 0,
          activityTypes: {},
          recentActivity: null,
          dailyAverage: 0,
        };
      }
      
      bdrActivityAnalysis[log.bdr].totalActivities++;
      
      if (!bdrActivityAnalysis[log.bdr].activityTypes[log.activityType]) {
        bdrActivityAnalysis[log.bdr].activityTypes[log.activityType] = 0;
      }
      bdrActivityAnalysis[log.bdr].activityTypes[log.activityType]++;
      
      if (!bdrActivityAnalysis[log.bdr].recentActivity || 
          (bdrActivityAnalysis[log.bdr].recentActivity! && log.timestamp > bdrActivityAnalysis[log.bdr].recentActivity!)) {
        bdrActivityAnalysis[log.bdr].recentActivity = log.timestamp;
      }
    });

    // Calculate daily averages
    Object.keys(bdrActivityAnalysis).forEach(bdr => {
      bdrActivityAnalysis[bdr].dailyAverage = 
        bdrActivityAnalysis[bdr].totalActivities / 30;
    });

    // Pipeline velocity analysis
    const pipelineVelocity: Record<string, {
      averageTimeToProposal: number;
      averageTimeToAgreement: number;
      itemsInProgress: number;
      completedItems: number;
    }> = {};
    
    pipelineItems.forEach(item => {
      if (!pipelineVelocity[item.bdr]) {
        pipelineVelocity[item.bdr] = {
          averageTimeToProposal: 0,
          averageTimeToAgreement: 0,
          itemsInProgress: 0,
          completedItems: 0,
        };
      }
      
      if (item.status && item.status.includes('Agreement')) {
        pipelineVelocity[item.bdr].completedItems++;
        
        // Calculate time from addition to agreement
        const timeToAgreement = (item.lastUpdated.getTime() - item.addedDate.getTime()) / (1000 * 60 * 60 * 24);
        pipelineVelocity[item.bdr].averageTimeToAgreement += timeToAgreement;
      } else {
        pipelineVelocity[item.bdr].itemsInProgress++;
      }
    });

    // Calculate averages
    Object.keys(pipelineVelocity).forEach(bdr => {
      if (pipelineVelocity[bdr].completedItems > 0) {
        pipelineVelocity[bdr].averageTimeToAgreement = 
          pipelineVelocity[bdr].averageTimeToAgreement / pipelineVelocity[bdr].completedItems;
      }
    });

    // Status distribution analysis
    const statusDistribution: Record<string, number> = {};
    pipelineItems.forEach(item => {
      if (!statusDistribution[item.status]) {
        statusDistribution[item.status] = 0;
      }
      statusDistribution[item.status]++;
    });

    // Category performance analysis
    const categoryPerformance: Record<string, {
      total: number;
      agreements: number;
      conversionRate: number;
    }> = {};
    pipelineItems.forEach(item => {
      if (!categoryPerformance[item.category]) {
        categoryPerformance[item.category] = {
          total: 0,
          agreements: 0,
          conversionRate: 0,
        };
      }
      
      categoryPerformance[item.category].total++;
      
      if (item.status && item.status.includes('Agreement')) {
        categoryPerformance[item.category].agreements++;
      }
    });

    // Calculate conversion rates for categories
    Object.keys(categoryPerformance).forEach(category => {
      categoryPerformance[category].conversionRate = 
        (categoryPerformance[category].agreements / categoryPerformance[category].total) * 100;
    });

    // Sales analysis from finance entries
    const salesAnalysis: Record<string, {
      totalSales: number;
      totalRevenue: number;
      averageDealSize: number;
      salesThisMonth: number;
      revenueThisMonth: number;
    }> = {};

    // Use all finance entries for sales analysis
    financeEntries.forEach(entry => {
      if (!salesAnalysis[entry.bdr]) {
        salesAnalysis[entry.bdr] = {
          totalSales: 0,
          totalRevenue: 0,
          averageDealSize: 0,
          salesThisMonth: 0,
          revenueThisMonth: 0,
        };
      }
      
      salesAnalysis[entry.bdr].totalSales++;
      salesAnalysis[entry.bdr].totalRevenue += entry.gbpAmount || 0;
      
      // Check if this month
      const currentMonth = new Date().toISOString().slice(0, 7);
      if (entry.month === currentMonth) {
        salesAnalysis[entry.bdr].salesThisMonth++;
        salesAnalysis[entry.bdr].revenueThisMonth += entry.gbpAmount || 0;
      }
    });

    // Calculate average deal sizes
    Object.keys(salesAnalysis).forEach(bdr => {
      if (salesAnalysis[bdr].totalSales > 0) {
        salesAnalysis[bdr].averageDealSize = salesAnalysis[bdr].totalRevenue / salesAnalysis[bdr].totalSales;
      }
    });

    // Team performance benchmarks
    const teamBenchmarks = {
      totalItems: pipelineItems.length,
      totalActivities: activityLogs.length,
      totalSales: financeEntries.length,
      totalRevenue: financeEntries.reduce((sum, entry) => sum + (entry.gbpAmount || 0), 0),
      averageItemsPerBDR: 0,
      averageActivitiesPerBDR: 0,
      averageSalesPerBDR: 0,
      topPerformer: null as string | null,
      mostActiveUser: null as string | null,
      topSalesPerformer: null as string | null,
    };

    const bdrItemCounts: Record<string, number> = {};
    const bdrActivityCounts: Record<string, number> = {};
    const bdrSalesCounts: Record<string, number> = {};

    pipelineItems.forEach(item => {
      bdrItemCounts[item.bdr] = (bdrItemCounts[item.bdr] || 0) + 1;
    });

    activityLogs.forEach(log => {
      bdrActivityCounts[log.bdr] = (bdrActivityCounts[log.bdr] || 0) + 1;
    });

    financeEntries.forEach(entry => {
      bdrSalesCounts[entry.bdr] = (bdrSalesCounts[entry.bdr] || 0) + 1;
    });

    const bdrCount = Object.keys(bdrItemCounts).length;
    if (bdrCount > 0) {
      teamBenchmarks.averageItemsPerBDR = teamBenchmarks.totalItems / bdrCount;
      teamBenchmarks.averageActivitiesPerBDR = teamBenchmarks.totalActivities / bdrCount;
      teamBenchmarks.averageSalesPerBDR = teamBenchmarks.totalSales / bdrCount;
      
      teamBenchmarks.topPerformer = Object.entries(bdrItemCounts)
        .sort(([,a], [,b]) => b - a)[0]?.[0] || null;
        
      teamBenchmarks.mostActiveUser = Object.entries(bdrActivityCounts)
        .sort(([,a], [,b]) => b - a)[0]?.[0] || null;

      teamBenchmarks.topSalesPerformer = Object.entries(bdrSalesCounts)
        .sort(([,a], [,b]) => b - a)[0]?.[0] || null;
    }

    return NextResponse.json({
      dailyMetrics,
      bdrActivityAnalysis,
      pipelineVelocity,
      statusDistribution,
      categoryPerformance,
      salesAnalysis,
      teamBenchmarks,
      generatedAt: now.toISOString(),
    });
    
  } catch (error) {
    console.error('Error fetching performance metrics:', error);
    return NextResponse.json({ 
      error: (error as Error).message,
      dailyMetrics: [],
      bdrActivityAnalysis: {},
      pipelineVelocity: {},
      statusDistribution: {},
      categoryPerformance: {},
      salesAnalysis: {},
      teamBenchmarks: {},
    }, { status: 500 });
  }
} 