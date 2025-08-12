import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { withSecurity, SecurityService } from '@/lib/security';
import { Action, Resource } from '@prisma/client';
import { triggerConversationEvent } from '@/lib/realtime';

interface Params { params: { id: string } }

export async function POST(req: NextRequest, { params }: Params) {
  const messageId = params.id;
  try {
    const { emoji } = await req.json();
    const result = await withSecurity(Resource.MESSAGING, Action.UPDATE, async (context) => {
      const message = await prisma.message.findUnique({ where: { id: messageId } });
      if (!message) throw new Error('Not found');
      const membership = await prisma.conversationMember.findUnique({
        where: { conversationId_userId: { conversationId: message.conversationId, userId: context.userId } },
      });
      if (!membership) throw new Error('Forbidden');
      const existing = await prisma.messageReaction.findFirst({
        where: { messageId, userId: context.userId, emoji },
      });
      if (existing) {
        await prisma.messageReaction.delete({ where: { id: existing.id } });
      } else {
        await prisma.messageReaction.create({ data: { messageId, userId: context.userId, emoji } });
      }
      await triggerConversationEvent(message.conversationId, 'message:edit', { messageId });
      return { toggled: true };
    }, req);
    return NextResponse.json(result);
  } catch (err: any) {
    await SecurityService.logAction({ action: 'UPDATE', resource: 'MESSAGING', resourceId: messageId, success: false, errorMsg: err?.message }, req);
    return NextResponse.json({ error: 'Failed to toggle reaction' }, { status: 400 });
  }
}


