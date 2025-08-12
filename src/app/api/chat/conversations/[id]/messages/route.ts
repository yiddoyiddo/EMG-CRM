import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { withSecurity, SecurityService } from '@/lib/security';
import { Action, Resource } from '@prisma/client';
import { triggerConversationEvent } from '@/lib/realtime';
import sanitizeHtml from 'sanitize-html';
import { canSendMessage } from '@/lib/rate-limit';

interface Params { params: { id: string } }

const sanitizeOptions: sanitizeHtml.IOptions = {
  allowedTags: ['b','i','em','strong','a','code','pre','p','ul','ol','li','br','span'],
  allowedAttributes: { a: ['href','rel','target'], span: ['data-user-id','class'] },
  transformTags: {
    a: sanitizeHtml.simpleTransform('a', { rel: 'noopener noreferrer', target: '_blank' })
  }
};

async function resolveMentions(content: string) {
  // Find patterns like @{userId}
  const ids = Array.from(new Set(Array.from(content.matchAll(/@\{([a-zA-Z0-9_-]+)\}/g)).map((m) => m[1])));
  if (ids.length === 0) return content;
  const users = await prisma.user.findMany({ where: { id: { in: ids } }, select: { id: true, name: true, email: true } });
  let out = content;
  for (const u of users) {
    const name = u.name || u.email || 'User';
    const re = new RegExp(`@\\{${u.id}\\}`, 'g');
    out = out.replace(re, `<span class="mention" data-user-id="${u.id}">@${name}</span>`);
  }
  return out;
}

// GET messages with cursor pagination
export async function GET(req: NextRequest, { params }: Params) {
  const { id } = params;
  try {
    const url = new URL(req.url);
    const cursor = url.searchParams.get('cursor');
    const take = Math.min(parseInt(url.searchParams.get('take') || '50', 10), 100);

    const data = await withSecurity(Resource.MESSAGING, Action.READ, async (context) => {
      const membership = await prisma.conversationMember.findUnique({
        where: { conversationId_userId: { conversationId: id, userId: context.userId } },
      });
      if (!membership) throw new Error('Forbidden');
      const conv = await prisma.conversation.findUnique({ where: { id }, select: { isLocked: true } });
      if (conv?.isLocked) return NextResponse.json({ error: 'Conversation locked' }, { status: 423 });

      const messages = await prisma.message.findMany({
        where: { conversationId: id },
        orderBy: { createdAt: 'desc' },
        take,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
        include: {
          attachments: true,
          reactions: true,
          reads: { include: { user: { select: { id: true, name: true } } } },
          sender: { select: { id: true, name: true } },
        },
      });

      const nextCursor = messages.length === take ? messages[messages.length - 1]?.id : null;
      return { messages, nextCursor };
    }, req);

    return NextResponse.json(data);
  } catch (err: any) {
    await SecurityService.logAction({ action: 'READ', resource: 'MESSAGING', resourceId: id, success: false, errorMsg: err?.message }, req);
    return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 400 });
  }
}

// POST send message
export async function POST(req: NextRequest, { params }: Params) {
  const { id } = params;
  try {
    const body = await req.json();
    const data = await withSecurity(Resource.MESSAGING, Action.CREATE, async (context) => {
      const membership = await prisma.conversationMember.findUnique({
        where: { conversationId_userId: { conversationId: id, userId: context.userId } },
      });
      if (!membership) throw new Error('Forbidden');
      const allowed = await canSendMessage(context.userId, id);
      if (!allowed) {
        return NextResponse.json({ error: 'Rate limit' }, { status: 429 });
      }

      let { content, attachments, parentId } = body as { content?: string; attachments?: Array<{ url: string; fileName: string; mimeType: string; size: number; width?: number; height?: number }>; parentId?: string };
      content = content ? await resolveMentions(content) : null as any;
      content = content ? sanitizeHtml(content, sanitizeOptions) : null as any;

      const message = await prisma.message.create({
        data: {
          conversationId: id,
          senderId: context.userId,
          content,
          parentId: parentId || null,
          attachments: attachments && attachments.length ? {
            create: attachments.map(a => ({ url: a.url, fileName: a.fileName, mimeType: a.mimeType, size: a.size, width: a.width, height: a.height }))
          } : undefined,
        },
      });

      await prisma.conversation.update({ where: { id }, data: { lastMessageAt: new Date() } });
      // Do not fail request if realtime triggers error
      Promise.resolve().then(() => triggerConversationEvent(id, 'message:new', { messageId: message.id })).catch(()=>{});
      // Notify members on their private channels for desktop notifications
      try {
        const { triggerUserEvent } = await import('@/lib/realtime');
        const members = await prisma.conversationMember.findMany({ where: { conversationId: id }, select: { userId: true } });
        for (const m of members) {
          if (m.userId === context.userId) continue;
          Promise.resolve().then(() => triggerUserEvent(m.userId, 'message:new', { conversationId: id, messageId: message.id })).catch(()=>{});
        }
      } catch {}
      return message;
    }, req);

    if (data instanceof NextResponse) return data;
    return NextResponse.json({ message: data }, { status: 201 });
  } catch (err: any) {
    await SecurityService.logAction({ action: 'CREATE', resource: 'MESSAGING', resourceId: id, success: false, errorMsg: err?.message }, req);
    return NextResponse.json({ error: 'Failed to send message' }, { status: 400 });
  }
}


