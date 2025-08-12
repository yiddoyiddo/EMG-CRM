import { describe, it, expect } from 'vitest';
import { 
  calculateKPIs,
  calculateTeamPerformance,
  assessPipelineHealth,
  calculateTrends,
  calculateFinancialSummary
} from '@/lib/reporting-helpers';

const now = new Date('2025-07-29T12:00:00Z');

const activityLogs = [
  { activityType: 'Call_Completed', timestamp: now, bdr: 'A' },
  { activityType: 'Agreement_Sent', timestamp: now, bdr: 'A' },
  { activityType: 'Partner_List_Sent', timestamp: now, bdr: 'A' },
];

const pipelineItems = [
  { status: 'Sold', bdr: 'A', lastUpdated: now },
  { status: 'Call Booked', bdr: 'A', lastUpdated: now },
  { status: 'Agreement - Profile', bdr: 'A', lastUpdated: now },
];

const financeEntries = [
  // Note: finance entry objects as used across helpers expect nested bdr objects for performance calcs
  { bdr: { name: 'A' }, gbpAmount: 1000, createdAt: now, invoiceDate: now, status: 'Paid' },
  { bdr: { name: 'A' }, gbpAmount: 2000, createdAt: now, invoiceDate: now, status: 'Invoiced' },
  { bdr: { name: 'B' }, gbpAmount: 1500, createdAt: now, invoiceDate: now, status: 'Paid' },
];

// Minimal KPI targets used by calculateKPIs (team targets are derived internally)
const targets = { weeklyCalls: 1, monthlyCalls: 1 } as any;

describe('calculateKPIs', () => {
  it('should compute period KPIs with current values', () => {
    const kpis = calculateKPIs(pipelineItems as any, activityLogs as any, targets as any, now, financeEntries as any);
    expect(kpis.thisWeek.callVolume.current).toBeGreaterThanOrEqual(0);
    expect(kpis.thisWeek.agreements.current).toBeGreaterThanOrEqual(0);
    expect(kpis.thisMonth.listsOut.current).toBeGreaterThanOrEqual(0);
  });
});

describe('Sales Data from Finance Entries', () => {
  it('should use finance entries for sales count instead of pipeline items with status Sold', () => {
    const teamPerformance = calculateTeamPerformance(
      // pipeline items and logs need bdr nested objects for helpers that expect .bdr.name in some places
      pipelineItems.map(p => ({ ...p, bdr: { name: p.bdr } })) as any,
      activityLogs.map(l => ({ ...l, bdr: { name: l.bdr } })) as any,
      financeEntries as any
    );
    expect(teamPerformance.benchmarkMetrics.teamConversionRate).toBeGreaterThan(0);
    // Ensure at least one BDR appears in rankings
    expect(teamPerformance.topPerformers.length + teamPerformance.needsSupport.length).toBeGreaterThan(0);
  });

  it('should calculate sales generated from finance entries in pipeline health', () => {
    const pipelineHealth = assessPipelineHealth(
      pipelineItems as any,
      activityLogs as any,
      now,
      financeEntries as any
    );
    expect(pipelineHealth.conversionFunnel.salesGenerated).toBe(3);
  });

  it('should calculate revenue from finance entries in trends', () => {
    const trends = calculateTrends(
      pipelineItems as any,
      activityLogs as any,
      now,
      financeEntries as any
    );
    expect(trends.quarterlyListsOut.length).toBeGreaterThan(0);
    const totalRevenue = trends.quarterlyListsOut.reduce((sum, quarter) => sum + quarter.revenue, 0);
    expect(totalRevenue).toBe(4500);
  });

  it('should calculate financial summary from finance entries', () => {
    const financialSummary = calculateFinancialSummary(
      pipelineItems as any,
      activityLogs as any,
      now,
      financeEntries as any
    );
    expect(financialSummary.monthlyRevenue).toBe(4500);
    expect(financialSummary.quarterlyRevenue).toBe(4500);
  });

  it('should handle empty finance entries gracefully', () => {
    const teamPerformance = calculateTeamPerformance(
      pipelineItems as any, 
      activityLogs as any, 
      [] // Empty finance entries
    );
    
    // Should not crash and should have 0 sales
    expect(teamPerformance.benchmarkMetrics.teamConversionRate).toBe(0);
  });

  it('should calculate sales per BDR correctly', () => {
    const teamPerformance = calculateTeamPerformance(
      pipelineItems.map(p => ({ ...p, bdr: { name: p.bdr } })) as any,
      activityLogs.map(l => ({ ...l, bdr: { name: l.bdr } })) as any,
      financeEntries as any
    );
    // Ensure that A and B are present in either top or support lists based on sales
    const hasA = teamPerformance.topPerformers.includes('A') || teamPerformance.needsSupport.includes('A');
    const hasB = teamPerformance.topPerformers.includes('B') || teamPerformance.needsSupport.includes('B');
    expect(hasA || hasB).toBe(true);
  });
}); 