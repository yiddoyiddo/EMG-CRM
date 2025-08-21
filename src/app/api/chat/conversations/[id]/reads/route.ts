import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { withSecurity, SecurityService } from '@/lib/security';
import { Action, Resource } from '@prisma/client';
import { triggerConversationEvent } from '@/lib/realtime';

interface Params { params: Promise<{ id: string }> }

// Mark conversation as read by creating a read receipt on the latest message
export async function POST(req: NextRequest, { params }: Params) {
  const conversationId = (await params).id;
  try {
    const result = await withSecurity(Resource.MESSAGING, Action.READ, async (context) => {
      const membership = await prisma.conversationMember.findUnique({
        where: { conversationId_userId: { conversationId, userId: context.userId } },
      });
      if (!membership) throw new Error('Forbidden');

      const latest = await prisma.message.findFirst({
        where: { conversationId },
        orderBy: { createdAt: 'desc' },
        select: { id: true },
      });
      if (!latest) return { ok: true };
      await prisma.messageRead.upsert({
        where: { messageId_userId: { messageId: latest.id, userId: context.userId } },
        create: { messageId: latest.id, userId: context.userId },
        update: { readAt: new Date() },
      });
      // Do not fail request if realtime fails
      Promise.resolve().then(() =>
        triggerConversationEvent(conversationId, 'message:read', { messageId: latest.id, userId: context.userId })
      ).catch(()=>{});
      return { ok: true };
    }, req);
    return NextResponse.json(result);
  } catch (err: any) {
    await SecurityService.logAction({ action: 'READ', resource: 'MESSAGING', resourceId: conversationId, success: false, errorMsg: err?.message }, req);
    return NextResponse.json({ error: 'Failed to mark read' }, { status: 400 });
  }
}


