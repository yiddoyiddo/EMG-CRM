import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, subWeeks, subMonths, format, addDays, subDays } from 'date-fns';

/**
 * Call Analytics Module
 * Handles all call-related calculations and analysis
 */

// Type definitions for call analytics
export interface CallCompletion {
  id: number;
  bdr: string;
  timestamp: Date;
  pipelineItemId?: number;
  leadId?: number;
  previousStatus?: string;
  newStatus?: string;
  description: string;
  activityType: string;
  isAutomatic?: boolean;
}

export interface CallMetrics {
  total: number;
  byBdr: { [bdr: string]: number };
  byPeriod: { [period: string]: number };
  conversionRate: number;
  averageCallsPerBdr: number;
}

/**
 * Detects automatic call completions based on status transitions
 * A call is considered automatically completed when status changes from "Call Booked" to any valid completion status
 */
export function detectAutomaticCallCompletions(
  pipelineItems: any[], 
  activityLogs: any[], 
  startDate: Date, 
  endDate: Date
): CallCompletion[] {
  const completedCalls: CallCompletion[] = [];
  
  // Get all pipeline items that had status changes during the period
  const statusChangeLogs = activityLogs.filter(log => 
    log.activityType === 'Status_Change' &&
    log.timestamp >= startDate && 
    log.timestamp <= endDate &&
    log.previousStatus === 'Call Booked' &&
    log.newStatus && 
    log.newStatus !== 'Call Booked' &&
    !['no show', 'rescheduled', 'No Show', 'Rescheduled'].includes(log.newStatus.toLowerCase())
  );
  
  // For each status change from "Call Booked" to a valid completion status
  for (const log of statusChangeLogs) {
    completedCalls.push({
      id: log.id,
      bdr: log.bdr,
      timestamp: log.timestamp,
      pipelineItemId: log.pipelineItemId,
      leadId: log.leadId,
      previousStatus: log.previousStatus,
      newStatus: log.newStatus,
      description: `Automatic call completion: ${log.previousStatus} → ${log.newStatus}`,
      activityType: 'Call_Completed',
      isAutomatic: true
    });
  }
  
  return completedCalls;
}

/**
 * Gets all call completions (both manual and automatic)
 * Combines manual call completion logs with detected automatic completions
 */
export function getAllCallCompletions(
  pipelineItems: any[], 
  activityLogs: any[], 
  startDate: Date, 
  endDate: Date
): CallCompletion[] {
  // Get manual call completions (existing logic)
  const manualCallCompletions = activityLogs.filter(log => 
    log.activityType === 'Call_Completed' && 
    log.timestamp >= startDate && log.timestamp <= endDate
  );
  
  // Get automatic call completions (new logic)
  const automaticCallCompletions = detectAutomaticCallCompletions(pipelineItems, activityLogs, startDate, endDate);
  
  // Combine both types of call completions
  const allCallCompletions = [...manualCallCompletions, ...automaticCallCompletions];
  
  // Remove duplicates based on pipelineItemId and timestamp (in case both manual and automatic exist)
  const uniqueCallCompletions = allCallCompletions.filter((completion, index, self) => 
    index === self.findIndex(c => 
      c.pipelineItemId === completion.pipelineItemId && 
      Math.abs(c.timestamp.getTime() - completion.timestamp.getTime()) < 60000 // Within 1 minute
    )
  );
  
  return uniqueCallCompletions;
}

/**
 * Calculates comprehensive call metrics
 */
export function calculateCallMetrics(
  pipelineItems: any[], 
  activityLogs: any[], 
  startDate: Date, 
  endDate: Date
): CallMetrics {
  const callCompletions = getAllCallCompletions(pipelineItems, activityLogs, startDate, endDate);
  
  // Count calls by BDR
  const callsByBdr: { [bdr: string]: number } = {};
  callCompletions.forEach(call => {
    if (call.bdr) {
      callsByBdr[call.bdr] = (callsByBdr[call.bdr] || 0) + 1;
    }
  });
  
  // Count calls by day/week/month
  const callsByPeriod: { [period: string]: number } = {};
  callCompletions.forEach(call => {
    const day = format(call.timestamp, 'yyyy-MM-dd');
    const week = format(startOfWeek(call.timestamp, { weekStartsOn: 1 }), 'yyyy-MM-dd');
    const month = format(call.timestamp, 'yyyy-MM');
    
    callsByPeriod[`day-${day}`] = (callsByPeriod[`day-${day}`] || 0) + 1;
    callsByPeriod[`week-${week}`] = (callsByPeriod[`week-${week}`] || 0) + 1;
    callsByPeriod[`month-${month}`] = (callsByPeriod[`month-${month}`] || 0) + 1;
  });
  
  // Calculate conversion rate (calls that led to agreements)
  const agreements = activityLogs.filter(log => 
    log.activityType === 'Agreement_Sent' && 
    log.timestamp >= startDate && 
    log.timestamp <= endDate
  );
  
  const conversionRate = callCompletions.length > 0 ? (agreements.length / callCompletions.length) * 100 : 0;
  
  // Calculate average calls per BDR
  const activeBdrs = Object.keys(callsByBdr).length;
  const averageCallsPerBdr = activeBdrs > 0 ? callCompletions.length / activeBdrs : 0;
  
  return {
    total: callCompletions.length,
    byBdr: callsByBdr,
    byPeriod: callsByPeriod,
    conversionRate,
    averageCallsPerBdr,
  };
}

/**
 * Calculates call volume trends over different time periods
 */
export function calculateCallVolumeTrends(
  pipelineItems: any[], 
  activityLogs: any[], 
  currentDate: Date
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
  
  // Get call completions for different periods
  const thisWeekCalls = getAllCallCompletions(pipelineItems, activityLogs, thisWeekStart, thisWeekEnd);
  const lastWeekCalls = getAllCallCompletions(pipelineItems, activityLogs, lastWeekStart, lastWeekEnd);
  const thisMonthCalls = getAllCallCompletions(pipelineItems, activityLogs, thisMonthStart, thisMonthEnd);
  const lastMonthCalls = getAllCallCompletions(pipelineItems, activityLogs, lastMonthStart, lastMonthEnd);
  
  // Calculate trends
  const weeklyTrend = lastWeekCalls.length > 0 
    ? ((thisWeekCalls.length - lastWeekCalls.length) / lastWeekCalls.length) * 100 
    : thisWeekCalls.length > 0 ? 100 : 0;
    
  const monthlyTrend = lastMonthCalls.length > 0 
    ? ((thisMonthCalls.length - lastMonthCalls.length) / lastMonthCalls.length) * 100 
    : thisMonthCalls.length > 0 ? 100 : 0;
  
  return {
    thisWeek: {
      count: thisWeekCalls.length,
      period: `${format(thisWeekStart, 'MMM d')} - ${format(thisWeekEnd, 'MMM d')}`,
    },
    lastWeek: {
      count: lastWeekCalls.length,
      period: `${format(lastWeekStart, 'MMM d')} - ${format(lastWeekEnd, 'MMM d')}`,
    },
    thisMonth: {
      count: thisMonthCalls.length,
      period: format(thisMonthStart, 'MMMM yyyy'),
    },
    lastMonth: {
      count: lastMonthCalls.length,
      period: format(lastMonthStart, 'MMMM yyyy'),
    },
    trends: {
      weekly: weeklyTrend,
      monthly: monthlyTrend,
    },
  };
}

/**
 * Identifies call-related performance issues and opportunities
 */
export function analyzeCallPerformance(
  pipelineItems: any[], 
  activityLogs: any[], 
  kpiTargets: { [key: string]: number },
  currentDate: Date
) {
  const callMetrics = calculateCallMetrics(pipelineItems, activityLogs, subDays(currentDate, 30), currentDate);
  const trends = calculateCallVolumeTrends(pipelineItems, activityLogs, currentDate);
  
  const issues: string[] = [];
  const opportunities: string[] = [];
  
  // Check if call volume is below targets
  const weeklyTarget = kpiTargets.weeklyCalls || 10;
  if (trends.thisWeek.count < weeklyTarget) {
    issues.push(`Weekly call volume (${trends.thisWeek.count}) is below target (${weeklyTarget})`);
  }
  
  // Check conversion rate
  if (callMetrics.conversionRate < 20) {
    issues.push(`Call conversion rate (${callMetrics.conversionRate.toFixed(1)}%) is below 20%`);
  } else if (callMetrics.conversionRate > 30) {
    opportunities.push(`Strong call conversion rate (${callMetrics.conversionRate.toFixed(1)}%)`);
  }
  
  // Check for declining trends
  if (trends.trends.weekly < -10) {
    issues.push(`Weekly calls declining by ${Math.abs(trends.trends.weekly).toFixed(1)}%`);
  }
  
  if (trends.trends.monthly < -10) {
    issues.push(`Monthly calls declining by ${Math.abs(trends.trends.monthly).toFixed(1)}%`);
  }
  
  // Check for improving trends
  if (trends.trends.weekly > 20) {
    opportunities.push(`Weekly calls improving by ${trends.trends.weekly.toFixed(1)}%`);
  }
  
  return {
    metrics: callMetrics,
    trends,
    issues,
    opportunities,
  };
}