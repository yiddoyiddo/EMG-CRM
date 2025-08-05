import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { startOfDay, endOfDay, parseISO, startOfWeek, endOfWeek } from 'date-fns';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const bdr = searchParams.get('bdr');
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');

    // Default: current week range
    const now = new Date();
    const defaultStart = startOfDay(startOfWeek(now, { weekStartsOn: 1 }));
    const defaultEnd = endOfDay(endOfWeek(now, { weekStartsOn: 1 }));

    const startDate = startDateParam ? startOfDay(parseISO(startDateParam)) : defaultStart;
    const endDate = endDateParam ? endOfDay(parseISO(endDateParam)) : defaultEnd;

    const where: any = {
      activityType: 'Call_Completed',
      timestamp: {
        gte: startDate,
        lte: endDate,
      },
    };

    if (bdr) {
      where.bdr = bdr;
    }

    // Fetch relevant logs
    const logs = await prisma.activityLog.findMany({
      select: {
        timestamp: true,
        bdr: true,
      },
      where,
    });

    // Aggregate by BDR total
    const bdrTotals: Record<string, number> = {};
    logs.forEach((l) => {
      if (!l.bdr) return;
      bdrTotals[l.bdr] = (bdrTotals[l.bdr] || 0) + 1;
    });

    // Heatmap data – 7 days × 24h matrix (Mon-Sun)
    const heatmap = Array.from({ length: 7 }, () => Array(24).fill(0));
    logs.forEach((l) => {
      const d = new Date(l.timestamp);
      const dayIdx = (d.getDay() + 6) % 7; // Make Monday=0
      const hour = d.getHours();
      heatmap[dayIdx][hour] += 1;
    });

    return NextResponse.json({
      range: { startDate, endDate },
      totals: bdrTotals,
      heatmap,
      generatedAt: now.toISOString(),
    });
  } catch (error) {
    console.error('Error fetching call volume:', error);
    return NextResponse.json(
      { error: (error as Error).message, callVolume: null },
      { status: 500 },
    );
  }
} 