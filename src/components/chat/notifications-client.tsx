'use client';
import { useEffect } from 'react';
import { subscribeToUser } from '@/lib/realtime-client';
import { useQueryClient } from '@tanstack/react-query';

export function ChatDesktopNotifications({ userId }: { userId: string }) {
  const qc = useQueryClient();
  useEffect(() => {
    if (!('Notification' in window)) return;
    if (Notification.permission === 'default') {
      Notification.requestPermission().catch(()=>{});
    }
    const channel = subscribeToUser(userId);
    const handler = (payload: any) => {
      if (Notification.permission !== 'granted') return;
      try {
        new Notification('New message', { body: 'You have a new message', tag: `${payload.conversationId}:${payload.messageId}` });
      } catch {}
      // Refresh conversations list to update unread badges
      qc.invalidateQueries({ queryKey: ['conversations'] });
    };
    channel.bind('message:new', handler);
    channel.bind('conversation:updated', () => qc.invalidateQueries({ queryKey: ['conversations'] }));
    return () => { channel.unbind('message:new', handler); channel.unbind_all(); channel.unsubscribe(); };
  }, [userId]);
  return null;
}


