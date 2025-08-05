import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { startOfMonth, endOfMonth, subMonths } from 'date-fns';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const bdr = searchParams.get('bdr');
    const monthsParam = parseInt(searchParams.get('months') || '4', 10);

    const now = new Date();

    // Time filter
    const oldestMonthStart = startOfMonth(subMonths(now, monthsParam - 1));

    // Fetch partner list sent logs
    const logWhere: any = {
      activityType: 'Partner_List_Sent',
      timestamp: { gte: oldestMonthStart, lte: endOfMonth(now) },
    };
    if (bdr) logWhere.bdr = bdr;
    const listLogs = await prisma.activityLog.findMany({ select: { timestamp: true, bdr: true, pipelineItemId: true }, where: logWhere });

    // Fetch pipeline items linked to these lists for size & conversion
    const pipelineIds = listLogs.map((l) => l.pipelineItemId).filter(Boolean);
    const items = await prisma.pipelineItem.findMany({
      where: { id: { in: pipelineIds as number[] } },
      select: { id: true, partnerListSize: true, status: true, totalSalesFromList: true, bdr: true, partnerListSentDate: true },
    });

    // Monthly counts
    const monthly: Array<{ month: string; lists: number; avgSize: number }> = [];
    for (let i = monthsParam - 1; i >= 0; i--) {
      const mStart = startOfMonth(subMonths(now, i));
      const mEnd = endOfMonth(subMonths(now, i));
      const monthItems = items.filter((it) => it.partnerListSentDate && it.partnerListSentDate >= mStart && it.partnerListSentDate <= mEnd);
      const lists = monthItems.length;
      const avgSize = lists > 0 ? Math.round(monthItems.reduce((s, it) => s + (it.partnerListSize || 0), 0) / lists) : 0;
      monthly.push({ month: mStart.toISOString().substring(0, 7), lists, avgSize });
    }

    // Overall stats
    const totalLists = items.length;
    const averageSize = totalLists > 0 ? Math.round(items.reduce((s, it) => s + (it.partnerListSize || 0), 0) / totalLists) : 0;
    const soldLists = items.filter((it) => it.status === 'Sold');
    const conversionRate = totalLists > 0 ? Math.round((soldLists.length / totalLists) * 100 * 100) / 100 : 0;

    return NextResponse.json({
      range: { months: monthsParam },
      monthly,
      overall: { totalLists, averageSize, conversionRate },
      generatedAt: now.toISOString(),
    });
  } catch (error) {
    console.error('Error fetching lists out:', error);
    return NextResponse.json(
      { error: (error as Error).message, listsOut: null },
      { status: 500 },
    );
  }
} 