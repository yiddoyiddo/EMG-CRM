import { NextRequest, NextResponse } from 'next/server';
import { withSecurity, SecurityService } from '@/lib/security';
import { Action, Resource } from '@prisma/client';
import { triggerConversationEvent } from '@/lib/realtime';

export async function POST(req: NextRequest) {
  try {
    const { conversationId } = await req.json();
    await withSecurity(Resource.MESSAGING, Action.READ, async (context) => {
      // Do not let realtime failures cause a 400. Fire-and-forget.
      Promise.resolve().then(() =>
        triggerConversationEvent(conversationId, 'presence:typing', { userId: context.userId, at: Date.now() })
      ).catch(() => {});
    }, req);
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    await SecurityService.logAction({ action: 'TYPING', resource: 'MESSAGING', success: false, errorMsg: err?.message }, req);
    return NextResponse.json({ error: 'Failed' }, { status: 400 });
  }
}



