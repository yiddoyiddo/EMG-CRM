"use client";
import { useEffect, useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { subscribeToConversation } from '@/lib/realtime-client';
import { toast } from 'sonner';
import { MessageComposer } from './MessageComposer';
import { MessageBubble } from './MessageBubble';
import { ScrollArea } from '@/components/ui/scroll-area';

export function ChatWindow({ conversationId, currentUserId }: { conversationId: string; currentUserId?: string }) {
  const qc = useQueryClient();
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteMessages(conversationId);
  const [typingBy, setTypingBy] = useState<Record<string, number>>({});

  useEffect(() => {
    const channel = subscribeToConversation(conversationId);
    const handler = () => {
      qc.invalidateQueries({ queryKey: ['messages', conversationId] });
      // Also trigger shim refresh if needed
      if (qc._shimRefresh?.[conversationId]) {
        qc._shimRefresh[conversationId]();
      }
    };
    channel.bind('message:new', handler);
    channel.bind('message:edit', handler);
    channel.bind('message:delete', handler);
    channel.bind('message:read', handler);
    channel.bind('presence:typing', (payload: any) => {
      if (!payload?.userId) return;
      setTypingBy((prev) => ({ ...prev, [payload.userId]: Date.now() }));
    });
    return () => { channel.unbind_all(); channel.unsubscribe(); };
  }, [conversationId, qc]);

  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setTypingBy((prev) => {
        const next: Record<string, number> = {};
        for (const [k, v] of Object.entries(prev)) {
          if (now - v < 2500) next[k] = v;
        }
        return next;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // Mark latest message read when viewing
    const firstPage = data?.pages?.[0];
    const latest = firstPage?.messages?.[0];
    if (!latest) return;
    fetch(`/api/chat/messages/${latest.id}/reads`, { method: 'POST' }).catch(()=>{});
    fetch(`/api/chat/conversations/${conversationId}/reads`, { method: 'POST' }).then(()=>{
      qc.invalidateQueries({ queryKey: ['conversations'] });
    }).catch(()=>{});
  }, [data]);

  useEffect(() => {
    // Auto-scroll to bottom on first load or on new page append
    if (!viewportRef.current) return;
    viewportRef.current.scrollTop = viewportRef.current.scrollHeight;
  }, [data]);

  async function onSend(payload: { content: string; attachments: any[] }) {
    try {
      const res = await fetch(`/api/chat/conversations/${conversationId}/messages`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (!res.ok) throw new Error(await res.text());
      
      // Force immediate refresh of messages
      qc.invalidateQueries({ queryKey: ['messages', conversationId] });
      qc.refetchQueries({ queryKey: ['messages', conversationId] });
      
      // Also trigger shim refresh for immediate update
      if (qc._shimRefresh?.[conversationId]) {
        qc._shimRefresh[conversationId]();
      }
    } catch (e) {
      toast.error('Failed to send');
    }
  }

  const messages = useMemo(() => {
    const allMessages = data?.pages?.flatMap((p: any) => p.messages) || [];
    // Remove duplicates based on message ID
    const uniqueMessages = allMessages.reduce((acc: any[], message: any) => {
      if (!acc.find(m => m.id === message.id)) {
        acc.push(message);
      }
      return acc;
    }, []);
    return uniqueMessages.slice().reverse();
  }, [data]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div ref={viewportRef} className="flex-1 overflow-y-auto">
        {messages.map((m: any, index: number) => (
          <MessageBubble 
            key={`${m.id}-${index}`} 
            message={m} 
            isOwn={m.senderId === currentUserId} 
            onEdited={() => qc.invalidateQueries({ queryKey: ['messages', conversationId] })} 
          />
        ))}
        {hasNextPage && (
          <button className="mx-auto my-2 block rounded border px-3 py-1 text-xs" disabled={isFetchingNextPage} onClick={()=>fetchNextPage()}>
            {isFetchingNextPage ? 'Loading...' : 'Load older messages'}
          </button>
        )}
      </div>
      {Object.keys(typingBy).filter((id) => id !== (currentUserId || '')).length > 0 && (
        <div className="px-6 py-3">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-muted-foreground rounded-full animate-pulse"></div>
                <div className="w-2 h-2 bg-muted-foreground rounded-full animate-pulse [animation-delay:0.2s]"></div>
                <div className="w-2 h-2 bg-muted-foreground rounded-full animate-pulse [animation-delay:0.4s]"></div>
              </div>
            </div>
            <span className="text-sm text-muted-foreground">Someone is typing...</span>
          </div>
        </div>
      )}
      <MessageComposer conversationId={conversationId} onSend={onSend} onTyping={async()=>{ try{ await fetch('/api/chat/typing', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ conversationId }) }); } catch{} }} />
    </div>
  );
}

function useInfiniteMessages(conversationId: string) {
  const qc = useQueryClient();
  return (window as any).ReactQuery?.useInfiniteQuery || useInfiniteQueryShim(conversationId, qc);
}

function useInfiniteQueryShim(conversationId: string, qc: any) {
  const [pages, setPages] = useState<any[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasNextPage, setHasNextPage] = useState(true);
  const [isFetchingNextPage, setIsFetchingNextPage] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Expose refresh function to query client
  useEffect(() => {
    if (!qc._shimRefresh) qc._shimRefresh = {};
    qc._shimRefresh[conversationId] = () => setRefreshTrigger(prev => prev + 1);
    return () => {
      if (qc._shimRefresh) delete qc._shimRefresh[conversationId];
    };
  }, [conversationId, qc]);

  useEffect(() => {
    let cancelled = false;
    // Reset state when conversation changes or refresh is triggered
    setPages([]);
    setCursor(null);
    setHasNextPage(true);
    
    (async () => {
      try {
        const res = await fetch(`/api/chat/conversations/${conversationId}/messages`);
        if (!res.ok) return;
        const json = await res.json();
        if (cancelled) return;
        setPages([json]);
        setCursor(json.nextCursor);
        setHasNextPage(!!json.nextCursor);
      } catch (error) {
        console.error('Failed to fetch messages:', error);
      }
    })();
    return () => { cancelled = true; };
  }, [conversationId, refreshTrigger]);

  async function fetchNextPage() {
    if (!hasNextPage || isFetchingNextPage) return;
    setIsFetchingNextPage(true);
    try {
      const res = await fetch(`/api/chat/conversations/${conversationId}/messages` + (cursor ? `?cursor=${cursor}` : ''));
      if (!res.ok) return;
      const json = await res.json();
      setPages((prev) => [...prev, json]);
      setCursor(json.nextCursor);
      setHasNextPage(!!json.nextCursor);
    } finally {
      setIsFetchingNextPage(false);
    }
  }

  return { data: { pages }, fetchNextPage, hasNextPage, isFetchingNextPage } as any;
}



