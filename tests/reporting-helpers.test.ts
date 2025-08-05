import { describe, it, expect } from 'vitest';
import { calculateKPIs } from '@/lib/reporting-helpers';

const now = new Date('2025-07-29T12:00:00Z');

const activityLogs = [
  { activityType: 'Call_Completed', timestamp: now, bdr: 'A' },
  { activityType: 'Agreement_Sent', timestamp: now, bdr: 'A' },
  { activityType: 'Partner_List_Sent', timestamp: now, bdr: 'A' },
];

const pipelineItems = [{ status: 'Sold', bdr: 'A' }];

const targets = { steadyCallVolume: 1, agreementRate: 1, listsOut: 1 } as any;

describe('calculateKPIs', () => {
  it('should compute current values', () => {
    const kpis = calculateKPIs(pipelineItems as any, activityLogs as any, targets, now);
    expect(kpis.steadyCallVolume.current).toBe(1);
    expect(kpis.agreementRate.current).toBe(1);
    expect(kpis.listsOut.current).toBe(1);
  });
}); 