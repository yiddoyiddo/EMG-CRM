import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { startOfDay, endOfDay, parseISO } from 'date-fns';

export async function GET(request: Request, { params }: { params: { bdr: string } }) {
  try {
    const { bdr } = params;
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // Map BDR route param (name) to userId for relational field filtering
    const user = await prisma.user.findFirst({ where: { name: bdr }, select: { id: true } });
    if (!user) {
      return NextResponse.json([], { status: 200 });
    }

    const where: any = {
      bdrId: user.id,
    };

    if (startDate && endDate) {
      where.timestamp = {
        gte: startOfDay(parseISO(startDate)),
        lte: endOfDay(parseISO(endDate)),
      };
    }

    const bdrPerformance = await prisma.activityLog.groupBy({
      by: ['activityType'],
      _count: {
        _all: true,
      },
      where,
    });

    return NextResponse.json(bdrPerformance);
  } catch (error) {
    console.error('Error fetching BDR performance:', error);
    return NextResponse.json({ 
      error: (error as Error).message,
      bdrPerformance: null
    }, { status: 500 });
  }
} 