import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { withSecurity, SecurityService } from '@/lib/security';
import { Action, Resource } from '@prisma/client';
import { triggerConversationEvent } from '@/lib/realtime';
import sanitizeHtml from 'sanitize-html';

interface Params { params: Promise<{ id: string }> }

const sanitizeOptions: sanitizeHtml.IOptions = {
  allowedTags: ['b','i','em','strong','a','code','pre','p','ul','ol','li','br'],
  allowedAttributes: { a: ['href','rel','target'] },
  transformTags: {
    a: sanitizeHtml.simpleTransform('a', { rel: 'noopener noreferrer', target: '_blank' })
  }
};

export async function PATCH(req: NextRequest, { params }: Params) {
  const resolvedParams = await params;
  const messageId = resolvedParams.id;
  try {
    const body = await req.json();
    const result = await withSecurity(Resource.MESSAGING, Action.UPDATE, async (context) => {
      const message = await prisma.message.findUnique({ where: { id: messageId } });
      if (!message) throw new Error('Not found');
      const membership = await prisma.conversationMember.findUnique({
        where: { conversationId_userId: { conversationId: message.conversationId, userId: context.userId } },
      });
      if (!membership) throw new Error('Forbidden');
      // Allow sender within 10 minutes
      const isSender = message.senderId === context.userId;
      const withinWindow = Date.now() - new Date(message.createdAt).getTime() <= 10 * 60 * 1000;
      if (!isSender || !withinWindow) throw new Error('Edit window expired');
      const content = sanitizeHtml((body.content as string) || '', sanitizeOptions);
      const updated = await prisma.message.update({ where: { id: messageId }, data: { content, isEdited: true } });
      await triggerConversationEvent(message.conversationId, 'message:edit', { messageId });
      return updated;
    }, req);
    return NextResponse.json({ message: result });
  } catch (err: any) {
    await SecurityService.logAction({ action: 'UPDATE', resource: 'MESSAGING', resourceId: messageId, success: false, errorMsg: err?.message }, req);
    return NextResponse.json({ error: 'Failed to edit message' }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const resolvedParams = await params;
  const messageId = resolvedParams.id;
  try {
    await withSecurity(Resource.MESSAGING, Action.DELETE, async (context) => {
      const message = await prisma.message.findUnique({ where: { id: messageId } });
      if (!message) throw new Error('Not found');
      const conv = await prisma.conversation.findUnique({ where: { id: message.conversationId }, select: { isLocked: true } });
      if (conv?.isLocked) throw new Error('Conversation locked');
      const membership = await prisma.conversationMember.findUnique({
        where: { conversationId_userId: { conversationId: message.conversationId, userId: context.userId } },
      });
      if (!membership) throw new Error('Forbidden');
      const isSender = message.senderId === context.userId;
      const withinWindow = Date.now() - new Date(message.createdAt).getTime() <= 10 * 60 * 1000;
      const isAdmin = membership.role === 'admin';
      if (!(isAdmin || (isSender && withinWindow))) throw new Error('Forbidden');
      await prisma.message.update({ where: { id: messageId }, data: { isDeleted: true, content: '' } });
      await triggerConversationEvent(message.conversationId, 'message:delete', { messageId });
    }, req);
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    await SecurityService.logAction({ action: 'DELETE', resource: 'MESSAGING', resourceId: messageId, success: false, errorMsg: err?.message }, req);
    return NextResponse.json({ error: 'Failed to delete message' }, { status: 400 });
  }
}


