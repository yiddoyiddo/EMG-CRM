import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { withSecurity, SecurityService } from '@/lib/security';
import { Action, Resource } from '@prisma/client';

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const q = url.searchParams.get('q') || '';
    const conversationId = url.searchParams.get('conversationId') || undefined;
    const take = Math.min(parseInt(url.searchParams.get('take') || '50', 10), 100);
    const data = await withSecurity(Resource.MESSAGING, Action.READ, async (context) => {
      const where: any = {
        isDeleted: false,
        content: q ? { contains: q, mode: 'insensitive' } : undefined,
        conversation: {
          members: { some: { userId: context.userId } },
        },
      };
      if (conversationId) where.conversationId = conversationId;
      const messages = await prisma.message.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take,
        include: { sender: { select: { id: true, name: true } }, conversation: true },
      });
      return messages;
    }, req);
    return NextResponse.json({ messages: data });
  } catch (err: any) {
    await SecurityService.logAction({ action: 'SEARCH', resource: 'MESSAGING', success: false, errorMsg: err?.message }, req);
    return NextResponse.json({ error: 'Search failed' }, { status: 400 });
  }
}



