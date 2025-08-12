"use client";
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { subscribeToUser } from '@/lib/realtime-client';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';

type SidebarConversation = {
  id: string;
  name?: string | null;
  members?: Array<{ user?: { id: string; name?: string | null } }>;
  messages?: Array<any>;
  unreadCount?: number;
};

export function ChatSidebar({ activeId, onSelect }: { activeId?: string | null; onSelect: (id: string) => void }) {
  const qc = useQueryClient();
  const [q, setQ] = useState('');
  const [searchResults, setSearchResults] = useState<Array<{ id: string; name?: string; email?: string }>>([]);
  const { data } = useQuery<SidebarConversation[]>({
    queryKey: ['conversations'],
    queryFn: async () => {
      const res = await fetch('/api/chat/conversations');
      if (!res.ok) throw new Error('Failed to load conversations');
      return (await res.json()).conversations as SidebarConversation[];
    },
  });

  useEffect(() => {
    let channel: any | null = null;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/auth/session');
        if (!res.ok) return;
        const json = await res.json();
        const userId = json?.user?.id as string | undefined;
        if (cancelled || !userId) return;
        channel = subscribeToUser(userId);
        const handler = () => qc.invalidateQueries({ queryKey: ['conversations'] });
        channel.bind('conversation:updated', handler);
      } catch {}
    })();
    return () => { if (channel) { channel.unbind_all?.(); channel.unsubscribe?.(); } cancelled = true; };
  }, [qc]);

  // Live user search for starting new DMs
  useEffect(() => {
    let aborted = false;
    (async () => {
      const query = q.trim();
      if (!query) { setSearchResults([]); return; }
      try {
        const url = new URL('/api/users', window.location.origin);
        url.searchParams.set('search', query);
        const res = await fetch(url.toString());
        if (!res.ok) return;
        const json = await res.json();
        if (aborted) return;
        const list = (json?.users || json?.data?.users || []) as any[];
        setSearchResults(list.map((u: any) => ({ id: u.id, name: u.name, email: u.email })));
      } catch {}
    })();
    return () => { aborted = true; };
  }, [q]);

  async function startDirectMessage(userId: string) {
    try {
      const res = await fetch('/api/chat/conversations', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ memberIds: [userId] }) });
      if (!res.ok) { return; }
      const { conversation } = await res.json();
      setQ('');
      setSearchResults([]);
      onSelect(conversation.id);
      qc.invalidateQueries({ queryKey: ['conversations'] });
    } catch {}
  }

  function renderInitials(name?: string | null) {
    const text = (name || '').trim();
    if (!text) return 'DM';
    const parts = text.split(/\s+/).slice(0, 2);
    return parts.map((p) => p[0]?.toUpperCase() || '').join('');
  }

  function stripHtml(html?: string) {
    if (!html) return '';
    const div = document.createElement('div');
    div.innerHTML = html;
    return (div.textContent || div.innerText || '').trim();
  }

  return (
    <div className="flex h-full w-full flex-col">
      <div className="p-3 border-b bg-card">
        <Input value={q} onChange={(e)=>setQ(e.target.value)} placeholder="Search users to message..." />
        {q && searchResults.length > 0 && (
          <div className="relative">
            <div className="absolute left-0 right-0 z-20 mt-1 rounded-md border bg-popover shadow">
              {searchResults.slice(0,8).map(u => (
                <button key={u.id} className="block w-full text-left px-3 py-2 text-sm hover:bg-accent" onClick={()=>startDirectMessage(u.id)}>
                  {u.name || u.email} ({u.id})
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {data?.map((c) => {
            const last = (c.messages && c.messages[0]) || undefined;
            const title = c.name || 'Direct message';
            return (
              <button
                key={c.id}
                className={`group w-full text-left rounded-md px-2 py-2 hover:bg-accent ${activeId===c.id?'bg-accent/60':''}`}
                onClick={async () => {
                  onSelect(c.id);
                  try {
                    await fetch(`/api/chat/conversations/${c.id}/reads`, { method: 'POST' });
                    qc.invalidateQueries({ queryKey: ['conversations'] });
                  } catch {}
                }}
              >
                <div className="flex items-center gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback>{renderInitials(title)}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <div className="truncate font-medium leading-tight">{title}</div>
                      {c.unreadCount && c.unreadCount > 0 ? (
                        <span className="ml-auto inline-flex items-center justify-center rounded-full bg-primary text-primary-foreground text-[10px] px-2 py-0.5">
                          {c.unreadCount}
                        </span>
                      ) : null}
                    </div>
                    <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="truncate">{stripHtml(last?.content) || 'No messages yet'}</span>
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </ScrollArea>
      <div className="border-t p-3">
        <Button className="w-full" onClick={async()=>{
          const res = await fetch('/api/chat/conversations', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ memberIds: [] }) });
          if (!res.ok) { toast.error('Failed to create'); return; }
          const { conversation } = await res.json();
          onSelect(conversation.id);
          qc.invalidateQueries({ queryKey:['conversations'] });
        }}>New chat</Button>
      </div>
    </div>
  );
}



