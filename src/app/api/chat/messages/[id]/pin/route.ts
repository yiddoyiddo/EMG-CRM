import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { withSecurity, SecurityService } from '@/lib/security';
import { Action, Resource } from '@prisma/client';
import { triggerConversationEvent } from '@/lib/realtime';

interface Params { params: { id: string } }

export async function POST(req: NextRequest, { params }: Params) {
  const messageId = params.id;
  try {
    await withSecurity(Resource.MESSAGING, Action.MANAGE, async () => {
      const message = await prisma.message.findUnique({ where: { id: messageId } });
      if (!message) throw new Error('Not found');
      await prisma.message.update({ where: { id: messageId }, data: { isPinned: true } });
      await triggerConversationEvent(message.conversationId, 'conversation:updated', { conversationId: message.conversationId });
    }, req);
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    await SecurityService.logAction({ action: 'PIN', resource: 'MESSAGING', resourceId: messageId, success: false, errorMsg: err?.message }, req);
    return NextResponse.json({ error: 'Failed to pin' }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const messageId = params.id;
  try {
    await withSecurity(Resource.MESSAGING, Action.MANAGE, async () => {
      const message = await prisma.message.findUnique({ where: { id: messageId } });
      if (!message) throw new Error('Not found');
      await prisma.message.update({ where: { id: messageId }, data: { isPinned: false } });
      await triggerConversationEvent(message.conversationId, 'conversation:updated', { conversationId: message.conversationId });
    }, req);
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    await SecurityService.logAction({ action: 'PIN_UNDO', resource: 'MESSAGING', resourceId: messageId, success: false, errorMsg: err?.message }, req);
    return NextResponse.json({ error: 'Failed to unpin' }, { status: 400 });
  }
}


