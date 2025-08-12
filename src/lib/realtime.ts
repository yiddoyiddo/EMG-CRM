import Pusher from 'pusher';

const appId = process.env.PUSHER_APP_ID || '';
const key = process.env.PUSHER_KEY || '';
const secret = process.env.PUSHER_SECRET || '';
const cluster = process.env.PUSHER_CLUSTER || 'eu';

export const pusherServer = new Pusher({
  appId,
  key,
  secret,
  cluster,
  useTLS: true,
});

export type ChatEventName =
  | 'message:new'
  | 'message:edit'
  | 'message:delete'
  | 'message:read'
  | 'conversation:updated'
  | 'presence:typing';

export async function triggerConversationEvent<T>(conversationId: string, event: ChatEventName, payload: T) {
  const channel = `presence-conv-${conversationId}`;
  await pusherServer.trigger(channel, event, payload);
}

export async function triggerUserEvent<T>(userId: string, event: string, payload: T) {
  const channel = `private-user-${userId}`;
  await pusherServer.trigger(channel, event, payload);
}


