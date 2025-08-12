import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { withSecurity, SecurityService } from '@/lib/security';
import { Action, Resource } from '@prisma/client';
import { triggerConversationEvent } from '@/lib/realtime';

interface Params { params: { id: string } }

export async function POST(req: NextRequest, { params }: Params) {
  const messageId = params.id;
  try {
    const result = await withSecurity(Resource.MESSAGING, Action.READ, async (context) => {
      const message = await prisma.message.findUnique({ where: { id: messageId } });
      if (!message) throw new Error('Not found');
      const membership = await prisma.conversationMember.findUnique({
        where: { conversationId_userId: { conversationId: message.conversationId, userId: context.userId } },
      });
      if (!membership) throw new Error('Forbidden');
      await prisma.messageRead.upsert({
        where: { messageId_userId: { messageId, userId: context.userId } },
        create: { messageId, userId: context.userId },
        update: { readAt: new Date() },
      });
      // Do not fail if realtime fails
      Promise.resolve().then(() =>
        triggerConversationEvent(message.conversationId, 'message:read', { messageId, userId: context.userId })
      ).catch(()=>{});
      return { ok: true };
    }, req);
    return NextResponse.json(result);
  } catch (err: any) {
    await SecurityService.logAction({ action: 'READ', resource: 'MESSAGING', resourceId: messageId, success: false, errorMsg: err?.message }, req);
    return NextResponse.json({ error: 'Failed to mark read' }, { status: 400 });
  }
}


