import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { withSecurity, SecurityService } from '@/lib/security';
import { Action, Resource } from '@prisma/client';

// GET /api/chat/conversations
export async function GET(req: NextRequest) {
  try {
    const data = await withSecurity(Resource.MESSAGING, Action.READ, async (context) => {
      const conversations = await prisma.conversation.findMany({
        where: {
          members: { some: { userId: context.userId } },
        },
        orderBy: [{ lastMessageAt: 'desc' }, { updatedAt: 'desc' }],
        include: {
          members: { select: { userId: true, role: true, user: { select: { id: true, name: true, role: true } } } },
          messages: {
            take: 1,
            orderBy: { createdAt: 'desc' },
            include: { attachments: true, reactions: true, reads: true, sender: { select: { id: true, name: true } } },
          },
        },
      });

      // Compute unread counts per conversation
      const result = await Promise.all(
        conversations.map(async (c) => {
          const lastReadAt = await prisma.messageRead.findFirst({
            where: { userId: context.userId, message: { conversationId: c.id } },
            orderBy: { readAt: 'desc' },
            select: { readAt: true },
          });

          const where: any = {
            conversationId: c.id,
            isDeleted: false,
          };
          if (lastReadAt?.readAt) {
            where.createdAt = { gt: lastReadAt.readAt };
          }

          const unreadCount = await prisma.message.count({ where });

          return { ...c, unreadCount };
        })
      );

      return result;
    }, req);

    return NextResponse.json({ conversations: data });
  } catch (err: any) {
    console.error('Conversations GET failed:', err);
    await SecurityService.logAction({ action: 'LIST', resource: 'MESSAGING', success: false, errorMsg: err?.message }, req);
    return NextResponse.json({ error: 'Failed to load conversations', detail: err?.message }, { status: 500 });
  }
}

// POST /api/chat/conversations
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = await withSecurity(Resource.MESSAGING, Action.CREATE, async (context) => {
      const { name, memberIds } = body as { name?: string; memberIds: string[] };
      const uniqueMembers = Array.from(new Set([context.userId, ...(memberIds || [])]));

      const conversation = await prisma.conversation.create({
        data: {
          name: name || null,
          isGroup: !!name || uniqueMembers.length > 2,
          createdById: context.userId,
          members: {
            create: uniqueMembers.map((uid) => ({ userId: uid, role: uid === context.userId ? 'admin' : 'member' })),
          },
        },
        include: { members: { include: { user: { select: { id: true, name: true } } } } },
      });

      // Notify invited users
      // Note: this is fire-and-forget; do not block
      Promise.resolve().then(async () => {
        const { triggerUserEvent } = await import('@/lib/realtime');
        for (const m of conversation.members) {
          await triggerUserEvent(m.userId, 'conversation:updated', { conversationId: conversation.id });
        }
      });

      return conversation;
    }, req);

    return NextResponse.json({ conversation: data }, { status: 201 });
  } catch (err: any) {
    console.error('Conversations POST failed:', err);
    await SecurityService.logAction({ action: 'CREATE', resource: 'MESSAGING', success: false, errorMsg: err?.message }, req);
    return NextResponse.json({ error: 'Failed to create conversation', detail: err?.message }, { status: 500 });
  }
}


