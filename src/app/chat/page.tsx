'use client';
import { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ChatSidebar } from '@/components/chat/ChatSidebar';
import { ChatWindow } from '@/components/chat/ChatWindow';
import { ChatHeader } from '@/components/chat/ChatHeader';
import { SearchBar } from '@/components/chat/SearchBar';
import { ChatDesktopNotifications } from '@/components/chat/notifications-client';
import { Button } from '@/components/ui/button';
import { ArrowLeft, MessageCircle } from 'lucide-react';

export default function ChatPage() {
  const qc = useQueryClient();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
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
      <div className="flex h-full rounded-lg border bg-background relative">
        {/* Mobile sidebar overlay */}
        {sidebarOpen && (
          <div className="fixed inset-0 z-40 bg-black/50 md:hidden" onClick={() => setSidebarOpen(false)} />
        )}
        
        {/* Sidebar */}
        <aside className={`
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          md:translate-x-0 md:static fixed inset-y-0 left-0 z-50
          w-[320px] shrink-0 border-r bg-card transition-transform duration-300 ease-in-out
        `}>
          <ChatSidebar activeId={active?.id} onSelect={(id) => {
            setActiveId(id);
            setSidebarOpen(false); // Close sidebar on mobile after selection
          }} />
        </aside>
        
        <main className="flex min-w-0 flex-1 flex-col">
          {active ? (
            <>
              {/* Mobile chat header with back button */}
              <div className="md:hidden flex items-center gap-2 p-3 border-b bg-card">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSidebarOpen(true)}
                  aria-label="Open conversations"
                >
                  <ArrowLeft className="h-5 w-5" />
                </Button>
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <MessageCircle className="h-5 w-5 text-muted-foreground shrink-0" />
                  <span className="font-medium truncate">{active.name || 'Direct message'}</span>
                </div>
              </div>
              
              {/* Desktop chat header */}
              <div className="hidden md:block">
                <ChatHeader conversation={active} onChanged={() => qc.invalidateQueries({ queryKey: ['conversations'] })} />
              </div>
              
              <SearchBar conversationId={active.id} />
              <div className="flex-1 min-h-0">
                <ChatWindow conversationId={active.id} currentUserId={userId || undefined} />
              </div>
            </>
          ) : (
            <div className="flex h-full flex-col items-center justify-center text-center p-8">
              {/* Mobile: Show button to open sidebar */}
              <div className="md:hidden mb-6">
                <Button onClick={() => setSidebarOpen(true)} size="lg" className="gap-2">
                  <MessageCircle className="h-5 w-5" />
                  View Conversations
                </Button>
              </div>
              
              {/* Desktop: Show welcome message */}
              <div className="hidden md:block text-muted-foreground">
                <MessageCircle className="h-16 w-16 mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-medium mb-2">Welcome to Chat</h3>
                <p className="text-sm max-w-sm">Select a conversation from the sidebar or start a new one to begin messaging.</p>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

