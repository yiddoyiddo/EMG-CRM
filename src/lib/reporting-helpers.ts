import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, subWeeks, subMonths, format, addDays, subDays, startOfQuarter, endOfQuarter } from 'date-fns';

// New function to detect automatic call completions based on status transitions
export function detectAutomaticCallCompletions(pipelineItems: any[], activityLogs: any[], startDate: Date, endDate: Date) {
  const completedCalls: any[] = [];
  
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

// Enhanced function to get all call completions (manual + automatic)
export function getAllCallCompletions(pipelineItems: any[], activityLogs: any[], startDate: Date, endDate: Date) {
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

export function calculateKPIs(pipelineItems: any[], activityLogs: any[], kpiTargets: { [key: string]: number }, currentDate: Date) {
  const now = currentDate;
  const thisWeekStart = startOfWeek(now, { weekStartsOn: 1 });
  const thisWeekEnd = endOfWeek(now, { weekStartsOn: 1 });
  const lastWeekStart = startOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });
  const lastWeekEnd = endOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });
  const thisMonthStart = startOfMonth(now);
  const thisMonthEnd = endOfMonth(now);
  const lastMonthStart = startOfMonth(subMonths(now, 1));
  const lastMonthEnd = endOfMonth(subMonths(now, 1));
  
  // Get unique BDRs for team calculation
  const bdrSet = new Set<string>();
  pipelineItems.forEach(item => item.bdr && bdrSet.add(item.bdr));
  activityLogs.forEach(log => log.bdr && bdrSet.add(log.bdr));
  const allBDRs = Array.from(bdrSet);
  const activeBDRs = allBDRs.filter(bdr => {
    const recentActivity = activityLogs.filter(log => 
      log.bdr === bdr && 
      log.timestamp >= subDays(new Date(), 7)
    );
    return recentActivity.length > 0;
  });
  
  // Calculate team targets based on number of active BDRs
  const teamWeeklyTargets = {
    calls: activeBDRs.length * (kpiTargets.weeklyCalls || 10),
    agreements: activeBDRs.length * (kpiTargets.weeklyAgreements || 3),
    listsOut: activeBDRs.length * (kpiTargets.weeklyListsOut || 1),
    sales: activeBDRs.length * (kpiTargets.weeklySales || 0.5)
  };
  
  const teamMonthlyTargets = {
    calls: activeBDRs.length * (kpiTargets.monthlyCalls || 40),
    agreements: activeBDRs.length * (kpiTargets.monthlyAgreements || 12),
    listsOut: activeBDRs.length * (kpiTargets.monthlyListsOut || 4),
    sales: activeBDRs.length * (kpiTargets.monthlySales || 2)
  };
  
  // Helper function to calculate KPI for a specific period
  const calculateKPIForPeriod = (activityType: string, startDate: Date, endDate: Date, target: number) => {
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
  };

  // Helper function to detect sales indicators in text
  const detectSalesIndicators = (text: string): boolean => {
    if (!text) return false;
    const lowerText = text.toLowerCase();
    
    // Check for sales indicators
    const salesKeywords = ['sold', 'deal'];
    const currencySymbols = ['£', '$'];
    
    // Check for sales keywords
    const hasSalesKeywords = salesKeywords.some(keyword => lowerText.includes(keyword));
    
    // Check for currency symbols
    const hasCurrencySymbols = currencySymbols.some(symbol => text.includes(symbol));
    
    return hasSalesKeywords || hasCurrencySymbols;
  };

  // Helper function to calculate conversion rate for a period
  const calculateConversionForPeriod = (startDate: Date, endDate: Date) => {
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
  };

  // Helper function to calculate sales for a period
  const calculateSalesForPeriod = (startDate: Date, endDate: Date, target: number) => {
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
    
    const status = salesInPeriod >= target * 1.25 ? 'excellent' : 
                   salesInPeriod >= target ? 'good' : 
                   salesInPeriod >= target * 0.5 ? 'needs_attention' : 'critical';
    
    return {
      current: salesInPeriod,
      target: target,
      status: status as 'excellent' | 'good' | 'needs_attention' | 'critical'
    };
  };

  return {
    thisWeek: {
      callVolume: calculateKPIForPeriod('Call_Completed', thisWeekStart, thisWeekEnd, teamWeeklyTargets.calls),
      agreements: calculateKPIForPeriod('Agreement_Sent', thisWeekStart, thisWeekEnd, teamWeeklyTargets.agreements),
      listsOut: calculateKPIForPeriod('Partner_List_Sent', thisWeekStart, thisWeekEnd, teamWeeklyTargets.listsOut),
      sales: calculateSalesForPeriod(thisWeekStart, thisWeekEnd, teamWeeklyTargets.sales)
    },
    lastWeek: {
      callVolume: calculateKPIForPeriod('Call_Completed', lastWeekStart, lastWeekEnd, teamWeeklyTargets.calls),
      agreements: calculateKPIForPeriod('Agreement_Sent', lastWeekStart, lastWeekEnd, teamWeeklyTargets.agreements),
      listsOut: calculateKPIForPeriod('Partner_List_Sent', lastWeekStart, lastWeekEnd, teamWeeklyTargets.listsOut),
      sales: calculateSalesForPeriod(lastWeekStart, lastWeekEnd, teamWeeklyTargets.sales)
    },
    thisMonth: {
      callVolume: calculateKPIForPeriod('Call_Completed', thisMonthStart, thisMonthEnd, teamMonthlyTargets.calls),
      agreements: calculateKPIForPeriod('Agreement_Sent', thisMonthStart, thisMonthEnd, teamMonthlyTargets.agreements),
      listsOut: calculateKPIForPeriod('Partner_List_Sent', thisMonthStart, thisMonthEnd, teamMonthlyTargets.listsOut),
      conversionRate: calculateConversionForPeriod(thisMonthStart, thisMonthEnd)
    },
    lastMonth: {
      callVolume: calculateKPIForPeriod('Call_Completed', lastMonthStart, lastMonthEnd, teamMonthlyTargets.calls),
      agreements: calculateKPIForPeriod('Agreement_Sent', lastMonthStart, lastMonthEnd, teamMonthlyTargets.agreements),
      listsOut: calculateKPIForPeriod('Partner_List_Sent', lastMonthStart, lastMonthEnd, teamMonthlyTargets.listsOut),
      conversionRate: calculateConversionForPeriod(lastMonthStart, lastMonthEnd)
    }
  };
}

export function calculateTeamPerformance(pipelineItems: any[], activityLogs: any[]) {
  // Get unique BDRs from the provided data
  const bdrSet = new Set<string>();
  pipelineItems.forEach(item => item.bdr && bdrSet.add(item.bdr));
  activityLogs.forEach(log => log.bdr && bdrSet.add(log.bdr));
  
  const allBDRs = Array.from(bdrSet);
  
  const activeBDRs = allBDRs.filter(bdr => {
    const recentActivity = activityLogs.filter(log => 
      log.bdr === bdr && 
      log.timestamp >= subDays(new Date(), 7)
    );
    return recentActivity.length > 0;
  });
  
  // Calculate individual BDR performance
  const bdrPerformance = allBDRs.map(bdr => {
    const bdrItems = pipelineItems.filter(item => item.bdr === bdr);
    const bdrActivities = activityLogs.filter(log => log.bdr === bdr);
    
    // Use enhanced call completion logic for BDR performance
    const allCallCompletions = getAllCallCompletions(pipelineItems, activityLogs, new Date(0), new Date());
    const bdrCallCompletions = allCallCompletions.filter(completion => completion.bdr === bdr);
    const calls = bdrCallCompletions.length;
    
    const agreements = bdrActivities.filter(log => log.activityType === 'Agreement_Sent').length;
    const lists = bdrActivities.filter(log => log.activityType === 'Partner_List_Sent').length;
    const sales = bdrItems.filter(item => item.status === 'Sold').length;
    
    const score = calls * 1 + agreements * 3 + lists * 2 + sales * 5;
    
    return { bdr, score, calls, agreements, lists, sales };
  });
  
  // Sort by performance score
  bdrPerformance.sort((a, b) => b.score - a.score);
  
  const topPerformers = bdrPerformance.slice(0, 3).map(p => p.bdr);
  const needsSupport = bdrPerformance.filter(p => p.score < 10 && p.calls < 5).map(p => p.bdr);
  
  // Calculate benchmark metrics using enhanced call completion logic
  const allCallCompletions = getAllCallCompletions(pipelineItems, activityLogs, new Date(0), new Date());
  const totalCalls = allCallCompletions.length;
  const totalAgreements = activityLogs.filter(log => log.activityType === 'Agreement_Sent').length;
  const totalLists = activityLogs.filter(log => log.activityType === 'Partner_List_Sent').length;
  const totalSales = pipelineItems.filter(item => item.status === 'Sold').length;
  
  return {
    totalBDRs: allBDRs.length,
    activeBDRs: activeBDRs.length,
    topPerformers,
    needsSupport,
    benchmarkMetrics: {
      avgCallsPerWeek: allBDRs.length > 0 ? Math.round((totalCalls / allBDRs.length) * 10) / 10 : 0,
      avgAgreementsPerMonth: allBDRs.length > 0 ? Math.round((totalAgreements / allBDRs.length) * 10) / 10 : 0,
      avgListsPerMonth: allBDRs.length > 0 ? Math.round((totalLists / allBDRs.length) * 10) / 10 : 0,
      teamConversionRate: totalCalls > 0 ? Math.round((totalSales / totalCalls) * 100 * 100) / 100 : 0
    }
  };
}

export function assessPipelineHealth(pipelineItems: any[], activityLogs: any[], currentDate: Date) {
  const now = currentDate;
  const nextWeekEnd = endOfWeek(addDays(now, 7), { weekStartsOn: 1 });
  const next2WeeksEnd = endOfWeek(addDays(now, 14), { weekStartsOn: 1 });
  
  // Upcoming calls
  const upcomingCallsNextWeek = pipelineItems.filter(item => 
    item.callDate && item.callDate > now && item.callDate <= nextWeekEnd
  ).length;
  
  const upcomingCallsNext2Weeks = pipelineItems.filter(item => 
    item.callDate && item.callDate > nextWeekEnd && item.callDate <= next2WeeksEnd
  ).length;
  
  const totalUpcomingCalls = pipelineItems.filter(item => 
    item.callDate && item.callDate > now
  ).length;
  
  // Pending agreements
  const proposalsAwaitingResponse = pipelineItems.filter(item => 
    item.status && item.status.includes('Proposal') && !item.status.includes('Agreement')
  ).length;
  
  const agreementsAwaitingLists = pipelineItems.filter(item => 
    item.status && item.status.includes('Agreement') && !item.partnerListSentDate
  ).length;
  
  const overduePartnerLists = pipelineItems.filter(item => 
    item.expectedCloseDate && item.expectedCloseDate < now && 
    !item.partnerListSentDate && item.status && item.status.includes('Agreement')
  ).length;
  
  // Active lists out
  const activeListsTotal = pipelineItems.filter(item => 
    item.partnerListSentDate && 
    !['Sold', 'List Out - Not Sold', 'Free Q&A Offered'].includes(item.status || '')
  ).length;
  
  const activeLists = pipelineItems.filter(item => 
    item.partnerListSentDate && item.partnerListSize &&
    !['Sold', 'List Out - Not Sold', 'Free Q&A Offered'].includes(item.status || '')
  );
  
  const smallLists = activeLists.filter(item => item.partnerListSize! >= 3 && item.partnerListSize! <= 8).length;
  const mediumLists = activeLists.filter(item => item.partnerListSize! >= 9 && item.partnerListSize! <= 15).length;
  const largeLists = activeLists.filter(item => item.partnerListSize! >= 16).length;
  
  const averageListSize = activeLists.length > 0 ? 
    activeLists.reduce((sum, item) => sum + (item.partnerListSize || 0), 0) / activeLists.length : 0;
  
  // Conversion funnel - use enhanced call completion logic
  const callsBooked = pipelineItems.filter(item => 
    item.category === 'Calls' && item.status === 'Call Booked'
  ).length;
  
  const allCallCompletions = getAllCallCompletions(pipelineItems, activityLogs, new Date(0), new Date());
  const callsConducted = allCallCompletions.length;
  
  const proposalsSent = activityLogs.filter(log => 
    log.activityType === 'Proposal_Sent'
  ).length;
  
  const agreementsSigned = activityLogs.filter(log => 
    log.activityType === 'Agreement_Sent'
  ).length;
  
  const listsSent = activityLogs.filter(log => 
    log.activityType === 'Partner_List_Sent'
  ).length;
  
  const salesGenerated = pipelineItems.filter(item => 
    item.status === 'Sold'
  ).length;
  
  return {
    upcomingCalls: {
      nextWeek: upcomingCallsNextWeek,
      next2Weeks: upcomingCallsNext2Weeks,
      total: totalUpcomingCalls
    },
    pendingAgreements: {
      proposalsAwaitingResponse,
      agreementsAwaitingLists,
      overduePartnerLists
    },
    activeListsOut: {
      total: activeListsTotal,
      smallLists,
      mediumLists,
      largeLists,
      averageListSize: Math.round(averageListSize * 10) / 10
    },
    conversionFunnel: {
      callsBooked,
      callsConducted,
      proposalsSent,
      agreementsSigned,
      listsSent,
      salesGenerated
    }
  };
}

export function calculateTrends(pipelineItems: any[], activityLogs: any[], currentDate: Date) {
  const now = currentDate;
  
  // Weekly call volume trend (last 4 weeks) - use enhanced call completion logic
  const weeklyCallVolume = [];
  for (let i = 3; i >= 0; i--) {
    const weekStart = startOfWeek(subWeeks(now, i), { weekStartsOn: 1 });
    const weekEnd = endOfWeek(subWeeks(now, i), { weekStartsOn: 1 });
    
    const callCompletions = getAllCallCompletions(pipelineItems, activityLogs, weekStart, weekEnd);
    const calls = callCompletions.length;
    
    const target = 40; // Target calls per week
    const variance = ((calls - target) / target) * 100;
    
    weeklyCallVolume.push({
      week: format(weekStart, 'MMM dd'),
      calls,
      target,
      variance: Math.round(variance)
    });
  }
  
  // Monthly agreements trend (last 4 months)
  const monthlyAgreements = [];
  for (let i = 3; i >= 0; i--) {
    const monthStart = startOfMonth(subMonths(now, i));
    const monthEnd = endOfMonth(subMonths(now, i));
    
    const agreements = activityLogs.filter(log => 
      log.activityType === 'Agreement_Sent' && 
      log.timestamp >= monthStart && log.timestamp <= monthEnd
    ).length;
    
    const target = 20; // Target agreements per month
    const variance = ((agreements - target) / target) * 100;
    
    monthlyAgreements.push({
      month: format(monthStart, 'MMM yyyy'),
      agreements,
      target,
      variance: Math.round(variance)
    });
  }
  
  // Quarterly lists out trend (current and previous quarters)
  const quarterlyListsOut = [];
  for (let i = 1; i >= 0; i--) {
    const quarterStart = startOfQuarter(subMonths(now, i * 3));
    const quarterEnd = endOfQuarter(subMonths(now, i * 3));
    
    const lists = activityLogs.filter(log => 
      log.activityType === 'Partner_List_Sent' && 
      log.timestamp >= quarterStart && log.timestamp <= quarterEnd
    ).length;
    
    const conversions = pipelineItems.filter(item => 
      item.status === 'Sold' && 
      item.firstSaleDate && 
      item.firstSaleDate >= quarterStart && item.firstSaleDate <= quarterEnd
    ).length;
    
    const revenue = pipelineItems
      .filter(item => 
        item.status === 'Sold' && 
        item.firstSaleDate && 
        item.firstSaleDate >= quarterStart && item.firstSaleDate <= quarterEnd
      )
      .reduce((sum, item) => sum + (item.value || 0), 0);
    
    quarterlyListsOut.push({
      quarter: `Q${Math.floor((quarterStart.getMonth()) / 3) + 1} ${quarterStart.getFullYear()}`,
      lists,
      conversions,
      revenue
    });
  }
  
  return {
    weeklyCallVolume,
    monthlyAgreements,
    quarterlyListsOut
  };
}

export function identifyCriticalActions(pipelineItems: any[], activityLogs: any[], teamPerformance: any, currentDate: Date): Array<{
  priority: 'urgent' | 'high' | 'medium';
  category: 'calls' | 'agreements' | 'lists' | 'team';
  action: string;
  assignedTo?: string;
  metric?: number;
  deadline?: string;
}> {
  const actions: Array<{
    priority: 'urgent' | 'high' | 'medium';
    category: 'calls' | 'agreements' | 'lists' | 'team';
    action: string;
    assignedTo?: string;
    metric?: number;
    deadline?: string;
  }> = [];
  const now = currentDate;
  
  // Check for overdue partner lists
  const overdueCount = pipelineItems.filter(item => 
    item.expectedCloseDate && item.expectedCloseDate < now && 
    !item.partnerListSentDate && item.status && item.status.includes('Agreement')
  ).length;
  
  if (overdueCount > 0) {
    actions.push({
      priority: 'urgent' as const,
      category: 'lists' as const,
      action: `Send ${overdueCount} overdue partner lists immediately`,
      metric: overdueCount,
      deadline: 'Today'
    });
  }
  
  // Check for low call volume - use enhanced call completion logic
  const thisWeekCallCompletions = getAllCallCompletions(pipelineItems, activityLogs, startOfWeek(now, { weekStartsOn: 1 }), now);
  const thisWeekCalls = thisWeekCallCompletions.length;
  
  if (thisWeekCalls < 25) {
    actions.push({
      priority: 'high' as const,
      category: 'calls' as const,
      action: 'Boost call volume - current week significantly below target',
      metric: thisWeekCalls,
      deadline: 'End of week'
    });
  }
  
  // Check for team members needing support
  if (teamPerformance.needsSupport.length > 0) {
    actions.push({
      priority: 'medium' as const,
      category: 'team' as const,
      action: `Provide support to underperforming BDRs: ${teamPerformance.needsSupport.join(', ')}`,
      metric: teamPerformance.needsSupport.length,
      deadline: 'This week'
    });
  }
  
  // Check for upcoming calls without enough pipeline
  const upcomingCalls = pipelineItems.filter(item => 
    item.callDate && item.callDate > now && item.callDate <= addDays(now, 7)
  ).length;
  
  if (upcomingCalls < 30) {
    actions.push({
      priority: 'high' as const,
      category: 'calls' as const,
      action: 'Schedule more calls for next week to maintain pipeline',
      metric: upcomingCalls,
      deadline: 'End of week'
    });
  }
  
  return actions.sort((a, b) => {
    const priorityOrder = { urgent: 3, high: 2, medium: 1 };
    return priorityOrder[b.priority] - priorityOrder[a.priority];
  });
}

export function calculateFinancialSummary(pipelineItems: any[], activityLogs: any[], currentDate: Date) {
  const now = currentDate;
  const thisMonthStart = startOfMonth(now);
  const thisQuarterStart = startOfQuarter(now);
  
  const soldItems = pipelineItems.filter(item => item.status === 'Sold');
  
  const monthlyRevenue = soldItems
    .filter(item => item.firstSaleDate && item.firstSaleDate >= thisMonthStart)
    .reduce((sum, item) => sum + (item.value || 0), 0);
  
  const quarterlyRevenue = soldItems
    .filter(item => item.firstSaleDate && item.firstSaleDate >= thisQuarterStart)
    .reduce((sum, item) => sum + (item.value || 0), 0);
  
  const totalRevenue = soldItems.reduce((sum, item) => sum + (item.value || 0), 0);
  
  const activeBDRs = Array.from(new Set(pipelineItems.map(item => item.bdr).filter(Boolean))).length;
  
  // Use enhanced call completion logic for financial metrics
  const allCallCompletions = getAllCallCompletions(pipelineItems, activityLogs, new Date(0), new Date());
  const totalCalls = allCallCompletions.length;
  
  const totalLists = activityLogs.filter(log => log.activityType === 'Partner_List_Sent').length;
  
  return {
    monthlyRevenue,
    quarterlyRevenue,
    revenuePerBDR: activeBDRs > 0 ? Math.round(totalRevenue / activeBDRs) : 0,
    revenuePerCall: totalCalls > 0 ? Math.round(totalRevenue / totalCalls) : 0,
    revenuePerList: totalLists > 0 ? Math.round(totalRevenue / totalLists) : 0,
    forecastAccuracy: 85 // Would require historical forecasting data to calculate
  };
}

export function generatePredictiveInsights(pipelineItems: any[], activityLogs: any[], trends: any, currentDate: Date) {
  const now = currentDate;
  
  // Simple predictions based on current trends
  const avgWeeklyCalls = trends.weeklyCallVolume.reduce((sum: number, week: any) => sum + week.calls, 0) / trends.weeklyCallVolume.length;
  const expectedCallsNextWeek = Math.round(avgWeeklyCalls * 1.1); // Slight optimistic projection
  
  const avgMonthlyAgreements = trends.monthlyAgreements.reduce((sum: number, month: any) => sum + month.agreements, 0) / trends.monthlyAgreements.length;
  const expectedAgreementsNextMonth = Math.round(avgMonthlyAgreements * 1.05);
  
  const avgQuarterlyRevenue = trends.quarterlyListsOut.reduce((sum: number, quarter: any) => sum + quarter.revenue, 0) / trends.quarterlyListsOut.length;
  const expectedRevenueNextQuarter = Math.round(avgQuarterlyRevenue * 1.1);
  
  // Risk factors
  const riskFactors = [];
  const lowCallWeeks = trends.weeklyCallVolume.filter((week: any) => week.calls < week.target * 0.8).length;
  if (lowCallWeeks > 1) {
    riskFactors.push('Declining call volume trend could impact future pipeline');
  }
  
  const upcomingCalls = pipelineItems.filter(item => 
    item.callDate && item.callDate > now && item.callDate <= addDays(now, 14)
  ).length;
  if (upcomingCalls < 40) {
    riskFactors.push('Insufficient upcoming calls scheduled for next 2 weeks');
  }
  
  // Opportunities
  const opportunities = [];
  const strongPerformers: { [key: string]: number } = {};
  const recentLogs = activityLogs.filter(log => log.timestamp >= subDays(now, 30));
  for (const log of recentLogs) {
    if (log.bdr) {
      strongPerformers[log.bdr] = (strongPerformers[log.bdr] || 0) + 1;
    }
  }
  
  const topBDR = Object.entries(strongPerformers).sort(([,a], [,b]) => b - a)[0];
  if (topBDR) {
    opportunities.push(`${topBDR[0]} showing strong activity - consider replicating their approach`);
  }
  
  return {
    expectedCallsNextWeek,
    expectedAgreementsNextMonth,
    expectedRevenueNextQuarter,
    riskFactors,
    opportunities
  };
}
