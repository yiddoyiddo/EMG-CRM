import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { withSecurity, SecurityService } from '@/lib/security';
import { Action, Resource } from '@prisma/client';

interface Params { params: Promise<{ id: string }> }

// PATCH: rename/add/remove members (admin in conversation)
export async function PATCH(req: NextRequest, { params }: Params) {
  const resolvedParams = await params;
  const { id } = resolvedParams;
  try {
    const body = await req.json();
    const result = await withSecurity(Resource.MESSAGING, Action.UPDATE, async (context) => {
      const membership = await prisma.conversationMember.findUnique({
        where: { conversationId_userId: { conversationId: id, userId: context.userId } },
      });
      if (!membership) throw new Error('Not a member');
      const isAdmin = membership.role === 'admin';
      const { name, addMemberIds, removeMemberIds, lock } = body as {
        name?: string;
        addMemberIds?: string[];
        removeMemberIds?: string[];
        lock?: boolean;
      };

      // Only admin can rename, add/remove, or lock
      if (!isAdmin) throw new Error('Forbidden');

      const updates: any = {};
      if (typeof name === 'string') updates.name = name || null;
      if (typeof lock === 'boolean') updates.isLocked = lock;

      const tx = await prisma.$transaction(async (tx) => {
        const conv = await tx.conversation.update({ where: { id }, data: updates });
        if (addMemberIds?.length) {
          const toAdd = Array.from(new Set(addMemberIds));
          await tx.conversationMember.createMany({
            data: toAdd.map((uid) => ({ conversationId: id, userId: uid, role: 'member' })),
            skipDuplicates: true,
          });
        }
        if (removeMemberIds?.length) {
          await tx.conversationMember.deleteMany({
            where: { conversationId: id, userId: { in: removeMemberIds } },
          });
        }
        return conv;
      });

      return tx;
    }, req);
    return NextResponse.json({ conversation: result });
  } catch (err: any) {
    await SecurityService.logAction({ action: 'UPDATE', resource: 'MESSAGING', resourceId: params.id, success: false, errorMsg: err?.message }, req);
    return NextResponse.json({ error: 'Failed to update conversation' }, { status: 400 });
  }
}

// DELETE: admin-only
export async function DELETE(req: NextRequest, { params }: Params) {
  const { id } = params;
  try {
    await withSecurity(Resource.MESSAGING, Action.MANAGE, async (context) => {
      const membership = await prisma.conversationMember.findUnique({
        where: { conversationId_userId: { conversationId: id, userId: context.userId } },
      });
      if (!membership || membership.role !== 'admin') throw new Error('Forbidden');
      // Soft-delete by removing members and clearing name
      await prisma.conversation.update({ where: { id }, data: { name: null } });
      await prisma.conversationMember.deleteMany({ where: { conversationId: id } });
    }, req);
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    await SecurityService.logAction({ action: 'DELETE', resource: 'MESSAGING', resourceId: id, success: false, errorMsg: err?.message }, req);
    return NextResponse.json({ error: 'Failed to delete conversation' }, { status: 400 });
  }
}


