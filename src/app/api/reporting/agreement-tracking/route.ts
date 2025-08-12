import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { startOfMonth, endOfMonth, subMonths } from 'date-fns';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const bdr = searchParams.get('bdr');
    const monthsParam = parseInt(searchParams.get('months') || '4', 10);

    const now = new Date();

    // Build where clause for activity logs
    const where: any = {
      activityType: 'Agreement_Sent',
    };
    if (bdr) {
      where.bdr = bdr;
    }

    // Fetch logs for last N months
    const oldestMonthStart = startOfMonth(subMonths(now, monthsParam - 1));
    where.timestamp = {
      gte: oldestMonthStart,
      lte: endOfMonth(now),
    };

    const logs = await prisma.activityLog.findMany({
      select: { timestamp: true, bdr: true },
      where,
    });

    // Monthly aggregation and trend
    const monthly: Array<{ month: string; count: number }> = [];
    for (let i = monthsParam - 1; i >= 0; i--) {
      const mStart = startOfMonth(subMonths(now, i));
      const mEnd = endOfMonth(subMonths(now, i));
      const count = logs.filter((l) => l.timestamp >= mStart && l.timestamp <= mEnd).length;
      monthly.push({ month: mStart.toISOString().substring(0, 7), count });
    }

    // BDR breakdown
    const bdrCounts: Record<string, number> = {};
    logs.forEach((l) => {
      if (!l.bdr) return;
      bdrCounts[l.bdr] = (bdrCounts[l.bdr] || 0) + 1;
    });

    return NextResponse.json({
      range: { months: monthsParam },
      monthly,
      byBdr: bdrCounts,
      generatedAt: now.toISOString(),
    });
  } catch (error) {
    console.error('Error fetching agreement tracking:', error);
    return NextResponse.json(
      { error: (error as Error).message, agreementTracking: null },
      { status: 500 },
    );
  }
} 