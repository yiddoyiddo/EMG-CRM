"use client";
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { subscribeToUser } from '@/lib/realtime-client';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageCircle } from 'lucide-react';

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

  function formatLastMessageTime(timestamp?: string) {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'now';
    if (diffInMinutes < 60) return `${diffInMinutes}m`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h`;
    return date.toLocaleDateString();
  }

  return (
    <div className="flex h-full w-full flex-col bg-gradient-to-b from-background to-muted/20">
      {/* Header */}
      <div className="p-4 border-b bg-card/50 backdrop-blur-sm">
        <h2 className="text-lg font-semibold mb-3 text-foreground">Messages</h2>
        <div className="relative">
          <Input 
            value={q} 
            onChange={(e)=>setQ(e.target.value)} 
            placeholder="Search conversations or start new chat..." 
            className="rounded-full border-2 focus:border-blue-400 transition-colors pl-4"
          />
          {q && searchResults.length > 0 && (
            <div className="absolute left-0 right-0 z-30 mt-2 rounded-xl border bg-popover shadow-lg overflow-hidden">
              <div className="p-2 text-xs text-muted-foreground font-medium border-b">Start new conversation</div>
              {searchResults.slice(0,6).map(u => (
                <button 
                  key={u.id} 
                  className="flex items-center gap-3 w-full text-left px-3 py-3 hover:bg-accent transition-colors" 
                  onClick={()=>startDirectMessage(u.id)}
                >
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="text-xs bg-gradient-to-br from-green-500 to-blue-600 text-white">
                      {renderInitials(u.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="font-medium truncate">{u.name || u.email}</div>
                    <div className="text-xs text-muted-foreground truncate">{u.email}</div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Conversations list */}
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-0.5">
          {data && data.length === 0 ? (
            <div className="text-center py-8 px-4">
              <div className="text-muted-foreground text-sm">
                <MessageCircle className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p className="font-medium mb-1">No conversations yet</p>
                <p className="text-xs">Start a conversation by searching for users above</p>
              </div>
            </div>
          ) : (
            data?.map((c) => {
              const last = (c.messages && c.messages[0]) || undefined;
              const title = c.name || 'Direct message';
              const isActive = activeId === c.id;
              const hasUnread = c.unreadCount && c.unreadCount > 0;
              
              return (
                <button
                  key={c.id}
                  className={`
                    group w-full text-left rounded-xl px-3 py-3 transition-all duration-200 relative
                    ${isActive 
                      ? 'bg-blue-50 dark:bg-blue-900/30 ring-2 ring-blue-500/20' 
                      : 'hover:bg-accent/60'
                    }
                    ${hasUnread ? 'bg-accent/20' : ''}
                  `}
                  onClick={async () => {
                    onSelect(c.id);
                    try {
                      await fetch(`/api/chat/conversations/${c.id}/reads`, { method: 'POST' });
                      qc.invalidateQueries({ queryKey: ['conversations'] });
                    } catch {}
                  }}
                >
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <Avatar className={`h-12 w-12 transition-all ${isActive ? 'ring-2 ring-blue-400' : ''}`}>
                        <AvatarFallback className="text-sm bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                          {renderInitials(title)}
                        </AvatarFallback>
                      </Avatar>
                      {/* Online indicator placeholder */}
                      <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-background"></div>
                    </div>
                    
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <div className={`truncate font-medium leading-tight ${hasUnread ? 'font-semibold' : ''}`}>
                          {title}
                        </div>
                        <div className="text-xs text-muted-foreground ml-auto shrink-0">
                          {formatLastMessageTime(last?.createdAt)}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <div className={`truncate text-sm ${hasUnread ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
                          {stripHtml(last?.content) || 'No messages yet'}
                        </div>
                        {hasUnread && (
                          <span className="ml-auto inline-flex items-center justify-center rounded-full bg-blue-500 text-white text-[10px] font-bold px-2 py-0.5 shrink-0">
                            {c.unreadCount > 9 ? '9+' : c.unreadCount}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </ScrollArea>
      
      {/* Footer with new chat button */}
      <div className="border-t p-4 bg-card/50 backdrop-blur-sm">
        <Button 
          className="w-full rounded-full bg-blue-500 hover:bg-blue-600 text-white shadow-md hover:shadow-lg transition-all duration-200" 
          onClick={async()=>{
            const res = await fetch('/api/chat/conversations', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ memberIds: [] }) });
            if (!res.ok) { toast.error('Failed to create conversation'); return; }
            const { conversation } = await res.json();
            onSelect(conversation.id);
            qc.invalidateQueries({ queryKey:['conversations'] });
          }}
        >
          <MessageCircle className="h-4 w-4 mr-2" />
          New Chat
        </Button>
      </div>
    </div>
  );
}



