import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, subWeeks, subMonths, format, addDays, subDays, differenceInDays } from 'date-fns';

interface PartnerListAnalytics {
  bdr: string;
  
  // List Volume Metrics
  totalListsSent: number;
  listsThisWeek: number;
  listsThisMonth: number;
  activeListsOut: number;           // Lists currently in market
  
  // List Size Distribution
  smallLists: number;               // 3-8 partners
  mediumLists: number;              // 9-15 partners  
  largeLists: number;               // 16+ partners
  averageListSize: number;
  largestList: number;
  smallestList: number;
  
  // Conversion Performance by List Size
  smallListConversionRate: number;  // Conversion rate for small lists
  mediumListConversionRate: number; // Conversion rate for medium lists
  largeListConversionRate: number;  // Conversion rate for large lists
  overallListConversionRate: number;
  
  // Revenue & Value Analysis
  totalRevenueFromLists: number;
  averageRevenuePerList: number;
  averageRevenuePerPartner: number;
  revenueByListSize: {
    small: number;
    medium: number;
    large: number;
  };
  
  // Response & Engagement Metrics
  partnerResponseRate: number;      // % of partners who respond
  partnerInterestRate: number;      // % of partners showing interest
  timeToFirstResponse: number;      // Average days to first partner response
  timeToFirstSale: number;          // Average days to first sale from list
  
  // Current Active Lists
  activePartnerLists: Array<{
    id: number;
    mainLeadName: string;
    company: string;
    listSentDate: string;
    partnerCount: number;
    responsesReceived: number;
    salesCount: number;
    status: string;
    daysActive: number;
  }>;
  
  // Recent Performance
  recentListPerformance: Array<{
    id: number;
    mainLeadName: string;
    company: string;
    listSentDate: string;
    partnerCount: number;
    salesCount: number;
    totalRevenue: number;
    conversionRate: number;
    status: string;
  }>;
  
  // Trend Analysis
  weeklyListTrend: Array<{
    weekStart: string;
    listsSent: number;
    averageListSize: number;
    conversions: number;
    revenue: number;
  }>;
  
  // Optimization Insights
  optimalListSize: number;          // Size that performs best
  bestPerformingListSize: string;   // Category description
  underperformingLists: number;     // Lists with no responses after 2+ weeks
  listSizeRecommendation: string;   // AI-driven recommendation
}

interface TeamPartnerListSummary {
  totalActiveListsOut: number;
  totalListsSentThisMonth: number;
  teamAverageListSize: number;
  teamOverallConversionRate: number;
  teamTotalRevenue: number;
  bestPerformingBDR: string;
  listSizeTrend: 'increasing' | 'stable' | 'decreasing';
  conversionTrend: 'improving' | 'stable' | 'declining';
  
  // Key Insights
  insights: Array<{
    type: 'opportunity' | 'concern' | 'recommendation';
    message: string;
    bdr?: string;
    metric?: number;
  }>;
  
  // Performance by List Size (team-wide)
  teamPerformanceBySize: {
    small: { count: number; conversionRate: number; avgRevenue: number; };
    medium: { count: number; conversionRate: number; avgRevenue: number; };
    large: { count: number; conversionRate: number; avgRevenue: number; };
  };
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const bdrFilter = searchParams.get('bdr');
    const minListSize = searchParams.get('minListSize') ? parseInt(searchParams.get('minListSize')!) : 0;
    const maxListSize = searchParams.get('maxListSize') ? parseInt(searchParams.get('maxListSize')!) : 999;
    const includeConversionRates = searchParams.get('includeConversionRates') !== 'false';
    const groupBySize = searchParams.get('groupBySize') === 'true';
    
    const now = new Date();
    
    // Date ranges
    const thisWeekStart = startOfWeek(now, { weekStartsOn: 1 });
    const thisWeekEnd = endOfWeek(now, { weekStartsOn: 1 });
    const thisMonthStart = startOfMonth(now);
    const thisMonthEnd = endOfMonth(now);
    
    // Get main pipeline items (parent lists)
    const mainListItems = await prisma.pipelineItem.findMany({
      where: {
        ...(bdrFilter ? { bdr: bdrFilter } : {}),
        category: 'Lists_Media_QA',
        isSublist: true, // This indicates it's a parent list container
        partnerListSize: {
          gte: minListSize,
          lte: maxListSize
        }
      },
      select: {
        id: true,
        name: true,
        company: true,
        bdr: true,
        status: true,
        lastUpdated: true,
        addedDate: true,
        partnerListSentDate: true,
        partnerListSize: true,
        firstSaleDate: true,
        totalSalesFromList: true,
        value: true,
        notes: true,
        sublistName: true,
      },
    });

    // Get individual partner contacts within sublists
    const partnerContacts = await prisma.pipelineItem.findMany({
      where: {
        category: 'Partner_Contacts',
        parentId: { in: mainListItems.map(item => item.id) }
      },
      select: {
        id: true,
        name: true,
        company: true,
        bdr: true,
        status: true,
        lastUpdated: true,
        addedDate: true,
        value: true,
        parentId: true,
      },
    });

    // Get activity logs for partner list tracking
    const activityLogs = await prisma.activityLog.findMany({
      where: {
        ...(bdrFilter ? { bdr: bdrFilter } : {}),
        activityType: {
          in: ['Partner_List_Sent', 'Partner_Added', 'Sale_Recorded', 'Status_Change']
        },
        pipelineItemId: { 
          in: [...mainListItems.map(item => item.id), ...partnerContacts.map(contact => contact.id)]
        }
      },
      select: {
        id: true,
        bdr: true,
        activityType: true,
        timestamp: true,
        pipelineItemId: true,
        description: true,
        newStatus: true,
      },
      orderBy: {
        timestamp: 'desc'
      }
    });

    // Group data by BDR
    const bdrData: { [key: string]: any[] } = {};
    const bdrPartnerContacts: { [key: string]: any[] } = {};
    const bdrActivities: { [key: string]: any[] } = {};
    
    mainListItems.forEach(item => {
      if (item.bdr) {
        if (!bdrData[item.bdr]) bdrData[item.bdr] = [];
        bdrData[item.bdr].push(item);
      }
    });

    partnerContacts.forEach(contact => {
      if (contact.bdr) {
        if (!bdrPartnerContacts[contact.bdr]) bdrPartnerContacts[contact.bdr] = [];
        bdrPartnerContacts[contact.bdr].push(contact);
      }
    });

    activityLogs.forEach(log => {
      if (log.bdr) {
        if (!bdrActivities[log.bdr]) bdrActivities[log.bdr] = [];
        bdrActivities[log.bdr].push(log);
      }
    });

    // Calculate partner list analytics for each BDR
    const bdrPartnerListAnalytics: PartnerListAnalytics[] = [];

    for (const [bdrName, lists] of Object.entries(bdrData)) {
      const partnerContactsForBdr = bdrPartnerContacts[bdrName] || [];
      const activities = bdrActivities[bdrName] || [];
      
      // Basic list metrics
      const totalListsSent = lists.filter(list => list.partnerListSentDate).length;
      const listsThisWeek = lists.filter(list => 
        list.partnerListSentDate && 
        list.partnerListSentDate >= thisWeekStart && 
        list.partnerListSentDate <= thisWeekEnd
      ).length;
      const listsThisMonth = lists.filter(list => 
        list.partnerListSentDate && 
        list.partnerListSentDate >= thisMonthStart && 
        list.partnerListSentDate <= thisMonthEnd
      ).length;
      
      const activeListsOut = lists.filter(list => 
        list.partnerListSentDate && 
        !['Sold', 'List Out - Not Sold', 'Free Q&A Offered'].includes(list.status)
      ).length;
      
      // List size analysis
      const listsWithSizes = lists.filter(list => list.partnerListSize && list.partnerListSize > 0);
      const smallLists = listsWithSizes.filter(list => list.partnerListSize! >= 3 && list.partnerListSize! <= 8).length;
      const mediumLists = listsWithSizes.filter(list => list.partnerListSize! >= 9 && list.partnerListSize! <= 15).length;
      const largeLists = listsWithSizes.filter(list => list.partnerListSize! >= 16).length;
      
      const averageListSize = listsWithSizes.length > 0 ? 
        listsWithSizes.reduce((sum, list) => sum + (list.partnerListSize || 0), 0) / listsWithSizes.length : 0;
      const largestList = listsWithSizes.length > 0 ? 
        Math.max(...listsWithSizes.map(list => list.partnerListSize || 0)) : 0;
      const smallestList = listsWithSizes.length > 0 ? 
        Math.min(...listsWithSizes.map(list => list.partnerListSize || 0)) : 0;
      
      // Conversion rates by list size
      const smallListConversionRate = calculateConversionRateBySize(lists, 3, 8);
      const mediumListConversionRate = calculateConversionRateBySize(lists, 9, 15);
      const largeListConversionRate = calculateConversionRateBySize(lists, 16, 999);
      const overallListConversionRate = calculateOverallConversionRate(lists);
      
      // Revenue analysis
      const { totalRevenue, averageRevenuePerList, averageRevenuePerPartner, revenueBySize } = 
        calculateRevenueMetrics(lists, partnerContactsForBdr);
      
      // Response and engagement metrics
      const { partnerResponseRate, partnerInterestRate, timeToFirstResponse, timeToFirstSale } = 
        calculateEngagementMetrics(lists, partnerContactsForBdr, activities);
      
      // Active partner lists
      const activePartnerLists = lists
        .filter(list => 
          list.partnerListSentDate && 
          !['Sold', 'List Out - Not Sold', 'Free Q&A Offered'].includes(list.status)
        )
        .map(list => {
          const partnersForList = partnerContactsForBdr.filter(contact => contact.parentId === list.id);
          const responsesReceived = partnersForList.filter(contact => 
            contact.status && !['Contacted', 'Not Responsive'].includes(contact.status)
          ).length;
          const salesCount = partnersForList.filter(contact => contact.status === 'Sold').length;
          
          return {
            id: list.id,
            mainLeadName: list.name,
            company: list.company || '',
            listSentDate: format(list.partnerListSentDate!, 'dd/MM/yy'),
            partnerCount: list.partnerListSize || 0,
            responsesReceived,
            salesCount,
            status: list.status,
            daysActive: differenceInDays(now, list.partnerListSentDate!)
          };
        })
        .sort((a, b) => b.daysActive - a.daysActive);
      
      // Recent performance (last 60 days)
      const sixtyDaysAgo = subDays(now, 60);
      const recentListPerformance = lists
        .filter(list => 
          list.partnerListSentDate && 
          list.partnerListSentDate >= sixtyDaysAgo
        )
        .map(list => {
          const partnersForList = partnerContactsForBdr.filter(contact => contact.parentId === list.id);
          const salesCount = partnersForList.filter(contact => contact.status === 'Sold').length;
          const totalRevenue = partnersForList.reduce((sum, contact) => sum + (contact.value || 0), 0);
          const conversionRate = list.partnerListSize! > 0 ? (salesCount / list.partnerListSize!) * 100 : 0;
          
          return {
            id: list.id,
            mainLeadName: list.name,
            company: list.company || '',
            listSentDate: format(list.partnerListSentDate!, 'dd/MM/yy'),
            partnerCount: list.partnerListSize || 0,
            salesCount,
            totalRevenue,
            conversionRate: Math.round(conversionRate * 100) / 100,
            status: list.status
          };
        })
        .sort((a, b) => new Date(b.listSentDate).getTime() - new Date(a.listSentDate).getTime());
      
      // Weekly trend analysis
      const weeklyListTrend = [];
      for (let i = 3; i >= 0; i--) {
        const weekStart = startOfWeek(subWeeks(now, i), { weekStartsOn: 1 });
        const weekEnd = endOfWeek(subWeeks(now, i), { weekStartsOn: 1 });
        
        const weekLists = lists.filter(list => 
          list.partnerListSentDate && 
          list.partnerListSentDate >= weekStart && 
          list.partnerListSentDate <= weekEnd
        );
        
        const weekListsSent = weekLists.length;
        const weekAverageListSize = weekLists.length > 0 ? 
          weekLists.reduce((sum, list) => sum + (list.partnerListSize || 0), 0) / weekLists.length : 0;
        
        const weekConversions = weekLists.filter(list => 
          list.firstSaleDate && list.firstSaleDate >= weekStart && list.firstSaleDate <= weekEnd
        ).length;
        
        const weekRevenue = weekLists.reduce((sum, list) => sum + (list.totalSalesFromList || 0), 0);
        
        weeklyListTrend.push({
          weekStart: format(weekStart, 'MMM dd'),
          listsSent: weekListsSent,
          averageListSize: Math.round(weekAverageListSize * 10) / 10,
          conversions: weekConversions,
          revenue: weekRevenue
        });
      }
      
      // Optimization insights
      const optimalListSize = calculateOptimalListSize(lists);
      const bestPerformingListSize = determineBestPerformingSize(smallListConversionRate, mediumListConversionRate, largeListConversionRate);
      const underperformingLists = calculateUnderperformingLists(lists, now);
      const listSizeRecommendation = generateListSizeRecommendation(
        averageListSize, 
        smallListConversionRate, 
        mediumListConversionRate, 
        largeListConversionRate
      );
      
      bdrPartnerListAnalytics.push({
        bdr: bdrName,
        totalListsSent,
        listsThisWeek,
        listsThisMonth,
        activeListsOut,
        smallLists,
        mediumLists,
        largeLists,
        averageListSize: Math.round(averageListSize * 10) / 10,
        largestList,
        smallestList,
        smallListConversionRate: Math.round(smallListConversionRate * 100) / 100,
        mediumListConversionRate: Math.round(mediumListConversionRate * 100) / 100,
        largeListConversionRate: Math.round(largeListConversionRate * 100) / 100,
        overallListConversionRate: Math.round(overallListConversionRate * 100) / 100,
        totalRevenueFromLists: totalRevenue,
        averageRevenuePerList: Math.round(averageRevenuePerList),
        averageRevenuePerPartner: Math.round(averageRevenuePerPartner),
        revenueByListSize: revenueBySize,
        partnerResponseRate: Math.round(partnerResponseRate * 100) / 100,
        partnerInterestRate: Math.round(partnerInterestRate * 100) / 100,
        timeToFirstResponse: Math.round(timeToFirstResponse * 10) / 10,
        timeToFirstSale: Math.round(timeToFirstSale * 10) / 10,
        activePartnerLists,
        recentListPerformance,
        weeklyListTrend,
        optimalListSize,
        bestPerformingListSize,
        underperformingLists,
        listSizeRecommendation
      });
    }
    
    // Sort by overall performance
    bdrPartnerListAnalytics.sort((a, b) => {
      const aScore = a.overallListConversionRate * a.totalListsSent + a.totalRevenueFromLists / 1000;
      const bScore = b.overallListConversionRate * b.totalListsSent + b.totalRevenueFromLists / 1000;
      return bScore - aScore;
    });
    
    // Calculate team summary
    const teamSummary: TeamPartnerListSummary = {
      totalActiveListsOut: bdrPartnerListAnalytics.reduce((sum, bdr) => sum + bdr.activeListsOut, 0),
      totalListsSentThisMonth: bdrPartnerListAnalytics.reduce((sum, bdr) => sum + bdr.listsThisMonth, 0),
      teamAverageListSize: bdrPartnerListAnalytics.reduce((sum, bdr) => sum + bdr.averageListSize, 0) / bdrPartnerListAnalytics.length,
      teamOverallConversionRate: bdrPartnerListAnalytics.reduce((sum, bdr) => sum + bdr.overallListConversionRate, 0) / bdrPartnerListAnalytics.length,
      teamTotalRevenue: bdrPartnerListAnalytics.reduce((sum, bdr) => sum + bdr.totalRevenueFromLists, 0),
      bestPerformingBDR: bdrPartnerListAnalytics[0]?.bdr || '',
      listSizeTrend: assessListSizeTrend(bdrPartnerListAnalytics),
      conversionTrend: assessConversionTrend(bdrPartnerListAnalytics),
      insights: generateTeamInsights(bdrPartnerListAnalytics),
      teamPerformanceBySize: calculateTeamPerformanceBySize(bdrPartnerListAnalytics)
    };

    return NextResponse.json({
      bdrPartnerListAnalytics,
      teamSummary,
      generatedAt: now.toISOString(),
      filters: {
        bdrFilter,
        minListSize,
        maxListSize,
        includeConversionRates,
        groupBySize
      }
    });
    
  } catch (error) {
    console.error('Error fetching partner list analytics:', error);
    return NextResponse.json({ 
      error: (error as Error).message,
      bdrPartnerListAnalytics: [],
      teamSummary: null
    }, { status: 500 });
  }
}

// Helper functions
function calculateConversionRateBySize(lists: any[], minSize: number, maxSize: number): number {
  const filteredLists = lists.filter(list => 
    list.partnerListSize && 
    list.partnerListSize >= minSize && 
    list.partnerListSize <= maxSize &&
    list.partnerListSentDate
  );
  
  if (filteredLists.length === 0) return 0;
  
  const soldLists = filteredLists.filter(list => 
    list.firstSaleDate || list.status === 'Sold'
  );
  
  return (soldLists.length / filteredLists.length) * 100;
}

function calculateOverallConversionRate(lists: any[]): number {
  const sentLists = lists.filter(list => list.partnerListSentDate);
  if (sentLists.length === 0) return 0;
  
  const soldLists = sentLists.filter(list => 
    list.firstSaleDate || list.status === 'Sold'
  );
  
  return (soldLists.length / sentLists.length) * 100;
}

function calculateRevenueMetrics(lists: any[], partnerContacts: any[]) {
  const totalRevenue = partnerContacts.reduce((sum, contact) => 
    sum + (contact.status === 'Sold' ? (contact.value || 0) : 0), 0
  );
  
  const listsWithRevenue = lists.filter(list => list.partnerListSentDate);
  const averageRevenuePerList = listsWithRevenue.length > 0 ? totalRevenue / listsWithRevenue.length : 0;
  
  const totalPartners = partnerContacts.length;
  const averageRevenuePerPartner = totalPartners > 0 ? totalRevenue / totalPartners : 0;
  
  // Revenue by list size
  const revenueBySize = {
    small: 0,
    medium: 0,
    large: 0
  };
  
  lists.forEach(list => {
    if (!list.partnerListSize || !list.partnerListSentDate) return;
    
    const listRevenue = partnerContacts
      .filter(contact => contact.parentId === list.id && contact.status === 'Sold')
      .reduce((sum, contact) => sum + (contact.value || 0), 0);
    
    if (list.partnerListSize >= 3 && list.partnerListSize <= 8) {
      revenueBySize.small += listRevenue;
    } else if (list.partnerListSize >= 9 && list.partnerListSize <= 15) {
      revenueBySize.medium += listRevenue;
    } else if (list.partnerListSize >= 16) {
      revenueBySize.large += listRevenue;
    }
  });
  
  return {
    totalRevenue,
    averageRevenuePerList,
    averageRevenuePerPartner,
    revenueBySize
  };
}

function calculateEngagementMetrics(lists: any[], partnerContacts: any[], activities: any[]) {
  const totalPartners = partnerContacts.length;
  
  if (totalPartners === 0) {
    return {
      partnerResponseRate: 0,
      partnerInterestRate: 0,
      timeToFirstResponse: 0,
      timeToFirstSale: 0
    };
  }
  
  const respondedPartners = partnerContacts.filter(contact => 
    contact.status && !['Contacted', 'Not Responsive'].includes(contact.status)
  );
  
  const interestedPartners = partnerContacts.filter(contact => 
    contact.status && ['Interested', 'Sold'].includes(contact.status)
  );
  
  const partnerResponseRate = (respondedPartners.length / totalPartners) * 100;
  const partnerInterestRate = (interestedPartners.length / totalPartners) * 100;
  
  // Calculate average time to first response
  let totalResponseTime = 0;
  let responseCount = 0;
  
  respondedPartners.forEach(contact => {
    if (contact.addedDate && contact.lastUpdated && contact.lastUpdated > contact.addedDate) {
      totalResponseTime += differenceInDays(contact.lastUpdated, contact.addedDate);
      responseCount++;
    }
  });
  
  const timeToFirstResponse = responseCount > 0 ? totalResponseTime / responseCount : 0;
  
  // Calculate average time to first sale
  const soldPartners = partnerContacts.filter(contact => contact.status === 'Sold');
  let totalSaleTime = 0;
  let saleCount = 0;
  
  soldPartners.forEach(contact => {
    if (contact.addedDate && contact.lastUpdated) {
      totalSaleTime += differenceInDays(contact.lastUpdated, contact.addedDate);
      saleCount++;
    }
  });
  
  const timeToFirstSale = saleCount > 0 ? totalSaleTime / saleCount : 0;
  
  return {
    partnerResponseRate,
    partnerInterestRate,
    timeToFirstResponse,
    timeToFirstSale
  };
}

function calculateOptimalListSize(lists: any[]): number {
  // Analyze which list size performs best
  const sizeGroups = {
    small: { count: 0, sales: 0 },
    medium: { count: 0, sales: 0 },
    large: { count: 0, sales: 0 }
  };
  
  lists.forEach(list => {
    if (!list.partnerListSize || !list.partnerListSentDate) return;
    
    const hasSale = list.firstSaleDate || list.status === 'Sold';
    
    if (list.partnerListSize >= 3 && list.partnerListSize <= 8) {
      sizeGroups.small.count++;
      if (hasSale) sizeGroups.small.sales++;
    } else if (list.partnerListSize >= 9 && list.partnerListSize <= 15) {
      sizeGroups.medium.count++;
      if (hasSale) sizeGroups.medium.sales++;
    } else if (list.partnerListSize >= 16) {
      sizeGroups.large.count++;
      if (hasSale) sizeGroups.large.sales++;
    }
  });
  
  let bestConversion = 0;
  let optimalSize = 10; // Default
  
  Object.entries(sizeGroups).forEach(([size, data]) => {
    const conversion = data.count > 0 ? data.sales / data.count : 0;
    if (conversion > bestConversion) {
      bestConversion = conversion;
      optimalSize = size === 'small' ? 6 : size === 'medium' ? 12 : 18;
    }
  });
  
  return optimalSize;
}

function determineBestPerformingSize(smallRate: number, mediumRate: number, largeRate: number): string {
  const rates = { small: smallRate, medium: mediumRate, large: largeRate };
  const best = Object.entries(rates).reduce((a, b) => rates[a[0]] > rates[b[0]] ? a : b);
  
  const sizeDescriptions = {
    small: 'Small Lists (3-8 partners)',
    medium: 'Medium Lists (9-15 partners)',
    large: 'Large Lists (16+ partners)'
  };
  
  return sizeDescriptions[best[0] as keyof typeof sizeDescriptions];
}

function calculateUnderperformingLists(lists: any[], currentDate: Date): number {
  const twoWeeksAgo = subDays(currentDate, 14);
  
  return lists.filter(list => 
    list.partnerListSentDate && 
    list.partnerListSentDate <= twoWeeksAgo && 
    !list.firstSaleDate &&
    list.status !== 'Sold' &&
    !list.status.includes('Not Sold')
  ).length;
}

function generateListSizeRecommendation(
  averageSize: number, 
  smallRate: number, 
  mediumRate: number, 
  largeRate: number
): string {
  const bestRate = Math.max(smallRate, mediumRate, largeRate);
  
  if (bestRate === largeRate && averageSize < 12) {
    return 'Consider increasing list sizes to 16+ partners for better conversion rates';
  } else if (bestRate === smallRate && averageSize > 10) {
    return 'Focus on smaller, more targeted lists (6-8 partners) for better results';
  } else if (bestRate === mediumRate) {
    return 'Maintain medium-sized lists (10-12 partners) for optimal balance';
  } else {
    return 'Current list sizing strategy appears optimal';
  }
}

function assessListSizeTrend(analytics: PartnerListAnalytics[]): 'increasing' | 'stable' | 'decreasing' {
  const recentAverageSizes = analytics.map(bdr => {
    const recentTrend = bdr.weeklyListTrend.slice(-2);
    return recentTrend.reduce((sum, week) => sum + week.averageListSize, 0) / recentTrend.length;
  });
  
  const olderAverageSizes = analytics.map(bdr => {
    const olderTrend = bdr.weeklyListTrend.slice(0, 2);
    return olderTrend.reduce((sum, week) => sum + week.averageListSize, 0) / olderTrend.length;
  });
  
  const recentAvg = recentAverageSizes.reduce((sum, size) => sum + size, 0) / recentAverageSizes.length;
  const olderAvg = olderAverageSizes.reduce((sum, size) => sum + size, 0) / olderAverageSizes.length;
  
  const percentChange = olderAvg > 0 ? ((recentAvg - olderAvg) / olderAvg) * 100 : 0;
  
  if (percentChange > 10) return 'increasing';
  if (percentChange < -10) return 'decreasing';
  return 'stable';
}

function assessConversionTrend(analytics: PartnerListAnalytics[]): 'improving' | 'stable' | 'declining' {
  const avgConversionRate = analytics.reduce((sum, bdr) => sum + bdr.overallListConversionRate, 0) / analytics.length;
  
  if (avgConversionRate > 25) return 'improving';
  if (avgConversionRate < 15) return 'declining';
  return 'stable';
}

function generateTeamInsights(analytics: PartnerListAnalytics[]): Array<{
  type: 'opportunity' | 'concern' | 'recommendation';
  message: string;
  bdr?: string;
  metric?: number;
}> {
  const insights = [];
  
  // Find opportunities
  const topPerformer = analytics[0];
  if (topPerformer && topPerformer.overallListConversionRate > 30) {
    insights.push({
      type: 'opportunity' as const,
      message: `${topPerformer.bdr} has exceptional conversion rate of ${topPerformer.overallListConversionRate}% - study their approach`,
      bdr: topPerformer.bdr,
      metric: topPerformer.overallListConversionRate
    });
  }
  
  // Identify concerns
  analytics.forEach(bdr => {
    if (bdr.underperformingLists > 5) {
      insights.push({
        type: 'concern' as const,
        message: `${bdr.bdr} has ${bdr.underperformingLists} underperforming lists requiring attention`,
        bdr: bdr.bdr,
        metric: bdr.underperformingLists
      });
    }
    
    if (bdr.overallListConversionRate < 10 && bdr.totalListsSent > 5) {
      insights.push({
        type: 'concern' as const,
        message: `${bdr.bdr} has low conversion rate of ${bdr.overallListConversionRate}% despite sending ${bdr.totalListsSent} lists`,
        bdr: bdr.bdr,
        metric: bdr.overallListConversionRate
      });
    }
  });
  
  // Generate recommendations
  const teamAvgSize = analytics.reduce((sum, bdr) => sum + bdr.averageListSize, 0) / analytics.length;
  if (teamAvgSize < 8) {
    insights.push({
      type: 'recommendation' as const,
      message: `Team average list size is ${Math.round(teamAvgSize)} - consider larger lists for better reach`,
      metric: teamAvgSize
    });
  }
  
  return insights.slice(0, 5); // Limit to top 5 insights
}

function calculateTeamPerformanceBySize(analytics: PartnerListAnalytics[]) {
  return {
    small: {
      count: analytics.reduce((sum, bdr) => sum + bdr.smallLists, 0),
      conversionRate: analytics.reduce((sum, bdr) => sum + bdr.smallListConversionRate, 0) / analytics.length,
      avgRevenue: analytics.reduce((sum, bdr) => sum + bdr.revenueByListSize.small, 0) / analytics.length
    },
    medium: {
      count: analytics.reduce((sum, bdr) => sum + bdr.mediumLists, 0),
      conversionRate: analytics.reduce((sum, bdr) => sum + bdr.mediumListConversionRate, 0) / analytics.length,
      avgRevenue: analytics.reduce((sum, bdr) => sum + bdr.revenueByListSize.medium, 0) / analytics.length
    },
    large: {
      count: analytics.reduce((sum, bdr) => sum + bdr.largeLists, 0),
      conversionRate: analytics.reduce((sum, bdr) => sum + bdr.largeListConversionRate, 0) / analytics.length,
      avgRevenue: analytics.reduce((sum, bdr) => sum + bdr.revenueByListSize.large, 0) / analytics.length
    }
  };
} 