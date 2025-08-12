'use client';
import { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ChatSidebar } from '@/components/chat/ChatSidebar';
import { ChatWindow } from '@/components/chat/ChatWindow';
import { ChatHeader } from '@/components/chat/ChatHeader';
import { SearchBar } from '@/components/chat/SearchBar';
import { ChatDesktopNotifications } from '@/components/chat/notifications-client';

export default function ChatPage() {
  const qc = useQueryClient();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const { data } = useQuery({
    queryKey: ['conversations'],
    queryFn: async () => {
      const res = await fetch('/api/chat/conversations');
      if (!res.ok) throw new Error('Failed to load conversations');
      return (await res.json()).conversations as any[];
    },
  });

  useEffect(() => {
    // Resolve session user id for desktop notifications and UI hints
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/auth/session');
        if (!res.ok) return;
        const json = await res.json();
        if (cancelled) return;
        setUserId(json?.user?.id || null);
      } catch {}
    })();
    return () => { cancelled = true; };
  }, []);

  const active = useMemo(() => data?.find((c) => c.id === activeId) || data?.[0], [data, activeId]);

  useEffect(() => {
    if (!active) return;
    const { subscribeToConversation } = require('@/lib/realtime-client');
    const channel = subscribeToConversation(active.id);
    const handler = () => qc.invalidateQueries({ queryKey: ['messages', active.id] });
    channel.bind('message:new', handler);
    channel.bind('message:edit', handler);
    channel.bind('message:delete', handler);
    channel.bind('message:read', handler);
    return () => { channel.unbind_all(); channel.unsubscribe(); };
  }, [active?.id, qc]);

  return (
    <div className="h-[calc(100vh-120px)] w-full overflow-hidden">
      {userId ? <ChatDesktopNotifications userId={userId} /> : null}
      <div className="flex h-full rounded-lg border bg-background">
        <aside className="hidden md:flex w-[320px] shrink-0 border-r bg-card">
          <ChatSidebar activeId={active?.id} onSelect={(id) => setActiveId(id)} />
        </aside>
        <main className="flex min-w-0 flex-1 flex-col">
          {active ? (
            <>
              <ChatHeader conversation={active} onChanged={() => qc.invalidateQueries({ queryKey: ['conversations'] })} />
              <SearchBar conversationId={active.id} />
              <div className="flex-1 min-h-0">
                <ChatWindow conversationId={active.id} currentUserId={userId || undefined} />
              </div>
            </>
          ) : (
            <div className="flex h-full items-center justify-center text-muted-foreground">
              Select a conversation
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

