import { describe, it, expect } from 'vitest';
import { GET as getExecutive } from '@/app/api/reporting/executive-dashboard/route';

describe('API: Executive Dashboard', () => {
  it('returns mock data in test mode without auth', async () => {
    const req = new Request('http://localhost/api/reporting/executive-dashboard?test=1', {
      headers: { 'x-cypress-test': '1' }
    });
    const res = await getExecutive(req as any);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.dashboard).toBeTruthy();
    expect(Array.isArray(body.dashboard.bdrList)).toBe(true);
    expect(body.dashboard.kpis).toBeTruthy();
  });
});






