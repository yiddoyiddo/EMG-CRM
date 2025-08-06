import { describe, it, expect } from 'vitest';
import { calculateKPIs } from '@/lib/reporting-helpers';
import { 
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
  { status: 'Sold', bdr: 'A' }, // This should be ignored for sales data
  { status: 'Call Booked', bdr: 'A' },
  { status: 'Agreement - Profile', bdr: 'A' },
];

const financeEntries = [
  { bdr: 'A', gbpAmount: 1000, createdAt: now, status: 'Paid' },
  { bdr: 'A', gbpAmount: 2000, createdAt: now, status: 'Invoiced' },
  { bdr: 'B', gbpAmount: 1500, createdAt: now, status: 'Paid' },
];

const targets = { steadyCallVolume: 1, agreementRate: 1, listsOut: 1 } as any;

describe('calculateKPIs', () => {
  it('should compute current values', () => {
    const kpis = calculateKPIs(pipelineItems as any, activityLogs as any, targets, now);
    expect(kpis.steadyCallVolume.current).toBe(1);
    expect(kpis.agreementRate.current).toBe(1);
    expect(kpis.listsOut.current).toBe(1);
  });
});

describe('Sales Data from Finance Entries', () => {
  it('should use finance entries for sales count instead of pipeline items with status Sold', () => {
    const teamPerformance = calculateTeamPerformance(
      pipelineItems as any, 
      activityLogs as any, 
      financeEntries as any
    );
    
    // Should count finance entries as sales, not pipeline items with status 'Sold'
    expect(teamPerformance.benchmarkMetrics.teamConversionRate).toBeGreaterThan(0);
    
    // Check that BDR A has sales from finance entries
    const bdrAPerformance = teamPerformance.topPerformers.includes('A') || 
                           teamPerformance.needsSupport.includes('A');
    expect(bdrAPerformance).toBe(true);
  });

  it('should calculate sales generated from finance entries in pipeline health', () => {
    const pipelineHealth = assessPipelineHealth(
      pipelineItems as any, 
      activityLogs as any, 
      now, 
      financeEntries as any
    );
    
    // Should count finance entries as sales generated
    expect(pipelineHealth.conversionFunnel.salesGenerated).toBe(3); // 3 finance entries
  });

  it('should calculate revenue from finance entries in trends', () => {
    const trends = calculateTrends(
      pipelineItems as any, 
      activityLogs as any, 
      now, 
      financeEntries as any
    );
    
    // Should calculate revenue from finance entries
    expect(trends.quarterlyListsOut.length).toBeGreaterThan(0);
    const totalRevenue = trends.quarterlyListsOut.reduce((sum, quarter) => sum + quarter.revenue, 0);
    expect(totalRevenue).toBe(4500); // 1000 + 2000 + 1500
  });

  it('should calculate financial summary from finance entries', () => {
    const financialSummary = calculateFinancialSummary(
      pipelineItems as any, 
      activityLogs as any, 
      now, 
      financeEntries as any
    );
    
    // Should calculate revenue from finance entries
    expect(financialSummary.totalRevenue).toBe(4500); // 1000 + 2000 + 1500
    expect(financialSummary.monthlyRevenue).toBe(4500); // All entries are from current month
    expect(financialSummary.quarterlyRevenue).toBe(4500); // All entries are from current quarter
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
      pipelineItems as any, 
      activityLogs as any, 
      financeEntries as any
    );
    
    // BDR A should have 2 sales, BDR B should have 1 sale
    const bdrAPerformance = teamPerformance.topPerformers.includes('A');
    const bdrBPerformance = teamPerformance.topPerformers.includes('B');
    
    // At least one BDR should be in top performers due to sales
    expect(bdrAPerformance || bdrBPerformance).toBe(true);
  });
}); 