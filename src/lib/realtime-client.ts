"use client";
import Pusher from 'pusher-js';

const key = (process.env.NEXT_PUBLIC_PUSHER_KEY as string) || "";
const cluster = (process.env.NEXT_PUBLIC_PUSHER_CLUSTER as string) || 'eu';

// Provide a no-op fallback when no key is configured so dev can run without Pusher
const createNoopChannel = () => ({
  bind: () => {},
  unbind: () => {},
  unbind_all: () => {},
  unsubscribe: () => {},
});

const noopClient = {
  subscribe: () => createNoopChannel(),
};

export const pusherClient: { subscribe: (name: string) => any } = key
  ? new Pusher(key, {
      cluster,
      channelAuthorization: {
        endpoint: '/api/chat/pusher/auth',
        transport: 'ajax',
      },
    })
  : (noopClient as any);

export function subscribeToConversation(conversationId: string) {
  return pusherClient.subscribe(`presence-conv-${conversationId}`);
}

export function subscribeToUser(userId: string) {
  return pusherClient.subscribe(`private-user-${userId}`);
}


