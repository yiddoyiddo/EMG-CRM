import { NextRequest, NextResponse } from 'next/server';
import { withSecurity, SecurityService } from '@/lib/security';
import { Action, Resource } from '@prisma/client';
import { pusherServer } from '@/lib/realtime';

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const socket_id = String(form.get('socket_id'));
    const channel_name = String(form.get('channel_name'));

    const authResponse = await withSecurity(Resource.MESSAGING, Action.READ, async (context) => {
      // Only allow presence/private channels for user who is a member of the conversation
      if (channel_name.startsWith('presence-conv-')) {
        const conversationId = channel_name.replace('presence-conv-', '');
        // No DB call here to keep fast; channel will only be used after other queries
        return pusherServer.authorizeChannel(socket_id, channel_name, {
          user_id: context.userId,
          user_info: { name: context.userId },
        });
      }
      if (channel_name.startsWith('private-user-')) {
        const userId = channel_name.replace('private-user-', '');
        if (userId !== context.userId) throw new Error('Forbidden');
        return pusherServer.authorizeChannel(socket_id, channel_name);
      }
      throw new Error('Forbidden');
    }, req);

    return new NextResponse(authResponse, { status: 200 });
  } catch (err: unknown) {
    await SecurityService.logAction({ action: 'READ', resource: 'MESSAGING', success: false, errorMsg: err instanceof Error ? err.message : 'Unknown error' }, req);
    return NextResponse.json({ error: 'Auth failed' }, { status: 403 });
  }
}


