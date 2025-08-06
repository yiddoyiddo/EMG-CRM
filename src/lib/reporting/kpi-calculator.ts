import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, subWeeks, subMonths, subDays } from 'date-fns';
import { getAllCallCompletions } from './call-analytics';

/**
 * KPI Calculator Module
 * Handles all KPI calculations and target tracking
 */

// Type definitions for KPI calculations
export interface KPIMetric {
  current: number;
  target: number;
  status: 'excellent' | 'good' | 'needs_attention' | 'critical';
}

export interface ConversionMetric {
  current: number; // percentage
  target: number; // percentage
  status: 'excellent' | 'good' | 'needs_attention' | 'critical';
}

export interface PeriodKPIs {
  callVolume: KPIMetric;
  agreements: KPIMetric;
  listsOut: KPIMetric;
  sales?: KPIMetric;
  conversionRate?: ConversionMetric;
}

export interface KPITargets {
  weeklyCalls?: number;
  weeklyAgreements?: number;
  weeklyListsOut?: number;
  weeklySales?: number;
  monthlyCalls?: number;
  monthlyAgreements?: number;
  monthlyListsOut?: number;
  monthlySales?: number;
}

export interface TeamTargets {
  calls: number;
  agreements: number;
  listsOut: number;
  sales: number;
}

/**
 * Calculates team targets based on active BDRs and individual targets
 */
export function calculateTeamTargets(
  pipelineItems: any[], 
  activityLogs: any[], 
  kpiTargets: KPITargets
): { weekly: TeamTargets; monthly: TeamTargets; activeBdrs: string[] } {
  // Get unique BDRs for team calculation
  const bdrSet = new Set<string>();
  pipelineItems.forEach(item => item.bdr && bdrSet.add(item.bdr));
  activityLogs.forEach(log => log.bdr && bdrSet.add(log.bdr));
  const allBDRs = Array.from(bdrSet);
  
  // Filter for active BDRs (those with activity in the last 7 days)
  const activeBDRs = allBDRs.filter(bdr => {
    const recentActivity = activityLogs.filter(log => 
      log.bdr === bdr && 
      log.timestamp >= subDays(new Date(), 7)
    );
    return recentActivity.length > 0;
  });
  
  // Calculate team targets based on number of active BDRs
  const teamWeeklyTargets: TeamTargets = {
    calls: activeBDRs.length * (kpiTargets.weeklyCalls || 10),
    agreements: activeBDRs.length * (kpiTargets.weeklyAgreements || 3),
    listsOut: activeBDRs.length * (kpiTargets.weeklyListsOut || 1),
    sales: activeBDRs.length * (kpiTargets.weeklySales || 0.5)
  };
  
  const teamMonthlyTargets: TeamTargets = {
    calls: activeBDRs.length * (kpiTargets.monthlyCalls || 40),
    agreements: activeBDRs.length * (kpiTargets.monthlyAgreements || 12),
    listsOut: activeBDRs.length * (kpiTargets.monthlyListsOut || 4),
    sales: activeBDRs.length * (kpiTargets.monthlySales || 2)
  };

  return {
    weekly: teamWeeklyTargets,
    monthly: teamMonthlyTargets,
    activeBdrs: activeBDRs,
  };
}

/**
 * Detects sales indicators in text
 */
export function detectSalesIndicators(text: string): boolean {
  if (!text) return false;
  const lowerText = text.toLowerCase();
  
  // Check for sales indicators
  const salesKeywords = ['sold', 'deal', 'purchase', 'bought', 'payment', 'invoice', 'revenue'];
  const currencySymbols = ['£', '$', '€'];
  
  // Check for sales keywords
  const hasSalesKeywords = salesKeywords.some(keyword => lowerText.includes(keyword));
  
  // Check for currency symbols
  const hasCurrencySymbols = currencySymbols.some(symbol => text.includes(symbol));
  
  return hasSalesKeywords || hasCurrencySymbols;
}

/**
 * Calculates KPI for a specific period and activity type
 */
export function calculateKPIForPeriod(
  activityType: string,
  startDate: Date,
  endDate: Date,
  target: number,
  pipelineItems: any[],
  activityLogs: any[]
): KPIMetric {
  let count: number;
  
  if (activityType === 'Call_Completed') {
    // Use enhanced call completion logic
    const callCompletions = getAllCallCompletions(pipelineItems, activityLogs, startDate, endDate);
    count = callCompletions.length;
  } else {
    // Use existing logic for other activity types
    count = activityLogs.filter(log => 
      log.activityType === activityType && 
      log.timestamp >= startDate && log.timestamp <= endDate
    ).length;
  }
  
  const status = count >= target * 1.25 ? 'excellent' : 
                 count >= target ? 'good' : 
                 count >= target * 0.5 ? 'needs_attention' : 'critical';
  
  return {
    current: count,
    target: target,
    status: status as 'excellent' | 'good' | 'needs_attention' | 'critical'
  };
}

/**
 * Calculates conversion rate for a specific period
 */
export function calculateConversionForPeriod(
  startDate: Date,
  endDate: Date,
  pipelineItems: any[],
  activityLogs: any[]
): ConversionMetric {
  // Use enhanced call completion logic for conversion rate calculation
  const callsInPeriod = getAllCallCompletions(pipelineItems, activityLogs, startDate, endDate).length;
  
  // Track unique pipeline items that have sales indicators to avoid double-counting
  const salesPipelineItems = new Set<number>();
  
  // Check pipeline items for sales indicators in notes
  // Only count if the item was updated during the period AND has sales indicators
  pipelineItems.forEach(item => {
    if (item.notes && detectSalesIndicators(item.notes)) {
      // Only count if the item was updated during the period
      if (item.lastUpdated >= startDate && item.lastUpdated <= endDate) {
        salesPipelineItems.add(item.id);
      }
    }
  });
  
  // Check activity logs for sales indicators in notes
  // Only count if the activity log was created during the period AND has sales indicators
  activityLogs.forEach(log => {
    if (log.notes && detectSalesIndicators(log.notes)) {
      // Only count if the activity log was created during the period
      if (log.timestamp >= startDate && log.timestamp <= endDate) {
        // If this activity log is associated with a pipeline item, add it to our set
        if (log.pipelineItemId) {
          salesPipelineItems.add(log.pipelineItemId);
        }
      }
    }
  });
  
  // Also include pipeline items with 'Sold' status that were updated during the period
  pipelineItems.forEach(item => {
    if (item.status === 'Sold' && 
        item.lastUpdated >= startDate && 
        item.lastUpdated <= endDate) {
      salesPipelineItems.add(item.id);
    }
  });
  
  const salesInPeriod = salesPipelineItems.size;
  
  const conversionRate = callsInPeriod > 0 ? (salesInPeriod / callsInPeriod) * 100 : 0;
  
  const status = conversionRate >= 25 ? 'excellent' : 
                 conversionRate >= 18 ? 'good' : 
                 conversionRate >= 12 ? 'needs_attention' : 'critical';
  
  return {
    current: Math.round(conversionRate * 100) / 100,
    target: 20,
    status: status as 'excellent' | 'good' | 'needs_attention' | 'critical'
  };
}

/**
 * Calculates sales for a specific period using finance entries
 */
export function calculateSalesForPeriod(
  startDate: Date,
  endDate: Date,
  target: number,
  pipelineItems: any[],
  activityLogs: any[],
  financeEntries: any[] = []
): KPIMetric {
  // Count all sales generated in the period based on invoice date, regardless of payment status
  const salesInPeriod = financeEntries.filter(entry => 
    entry.invoiceDate && 
    entry.invoiceDate >= startDate && 
    entry.invoiceDate <= endDate
  ).length;
  
  const status = salesInPeriod >= target * 1.25 ? 'excellent' : 
                 salesInPeriod >= target ? 'good' : 
                 salesInPeriod >= target * 0.5 ? 'needs_attention' : 'critical';
  
  return {
    current: salesInPeriod,
    target: target,
    status: status as 'excellent' | 'good' | 'needs_attention' | 'critical'
  };
}

/**
 * Main KPI calculation function
 */
export function calculateKPIs(
  pipelineItems: any[],
  activityLogs: any[],
  kpiTargets: KPITargets,
  currentDate: Date,
  financeEntries: any[] = []
) {
  const now = currentDate;
  const thisWeekStart = startOfWeek(now, { weekStartsOn: 1 });
  const thisWeekEnd = endOfWeek(now, { weekStartsOn: 1 });
  const lastWeekStart = startOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });
  const lastWeekEnd = endOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });
  const thisMonthStart = startOfMonth(now);
  const thisMonthEnd = endOfMonth(now);
  const lastMonthStart = startOfMonth(subMonths(now, 1));
  const lastMonthEnd = endOfMonth(subMonths(now, 1));
  
  // Calculate team targets
  const { weekly: teamWeeklyTargets, monthly: teamMonthlyTargets } = calculateTeamTargets(
    pipelineItems,
    activityLogs,
    kpiTargets
  );

  return {
    thisWeek: {
      callVolume: calculateKPIForPeriod('Call_Completed', thisWeekStart, thisWeekEnd, teamWeeklyTargets.calls, pipelineItems, activityLogs),
      agreements: calculateKPIForPeriod('Agreement_Sent', thisWeekStart, thisWeekEnd, teamWeeklyTargets.agreements, pipelineItems, activityLogs),
      listsOut: calculateKPIForPeriod('Partner_List_Sent', thisWeekStart, thisWeekEnd, teamWeeklyTargets.listsOut, pipelineItems, activityLogs),
      sales: calculateSalesForPeriod(thisWeekStart, thisWeekEnd, teamWeeklyTargets.sales, pipelineItems, activityLogs, financeEntries)
    } as PeriodKPIs,
    lastWeek: {
      callVolume: calculateKPIForPeriod('Call_Completed', lastWeekStart, lastWeekEnd, teamWeeklyTargets.calls, pipelineItems, activityLogs),
      agreements: calculateKPIForPeriod('Agreement_Sent', lastWeekStart, lastWeekEnd, teamWeeklyTargets.agreements, pipelineItems, activityLogs),
      listsOut: calculateKPIForPeriod('Partner_List_Sent', lastWeekStart, lastWeekEnd, teamWeeklyTargets.listsOut, pipelineItems, activityLogs),
      sales: calculateSalesForPeriod(lastWeekStart, lastWeekEnd, teamWeeklyTargets.sales, pipelineItems, activityLogs, financeEntries)
    } as PeriodKPIs,
    thisMonth: {
      callVolume: calculateKPIForPeriod('Call_Completed', thisMonthStart, thisMonthEnd, teamMonthlyTargets.calls, pipelineItems, activityLogs),
      agreements: calculateKPIForPeriod('Agreement_Sent', thisMonthStart, thisMonthEnd, teamMonthlyTargets.agreements, pipelineItems, activityLogs),
      listsOut: calculateKPIForPeriod('Partner_List_Sent', thisMonthStart, thisMonthEnd, teamMonthlyTargets.listsOut, pipelineItems, activityLogs),
      conversionRate: calculateConversionForPeriod(thisMonthStart, thisMonthEnd, pipelineItems, activityLogs)
    } as PeriodKPIs,
    lastMonth: {
      callVolume: calculateKPIForPeriod('Call_Completed', lastMonthStart, lastMonthEnd, teamMonthlyTargets.calls, pipelineItems, activityLogs),
      agreements: calculateKPIForPeriod('Agreement_Sent', lastMonthStart, lastMonthEnd, teamMonthlyTargets.agreements, pipelineItems, activityLogs),
      listsOut: calculateKPIForPeriod('Partner_List_Sent', lastMonthStart, lastMonthEnd, teamMonthlyTargets.listsOut, pipelineItems, activityLogs),
      conversionRate: calculateConversionForPeriod(lastMonthStart, lastMonthEnd, pipelineItems, activityLogs)
    } as PeriodKPIs,
    teamTargets: {
      weekly: teamWeeklyTargets,
      monthly: teamMonthlyTargets,
    },
  };
}