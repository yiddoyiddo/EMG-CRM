"use client";
import { useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';

export function SearchBar({ conversationId }: { conversationId?: string }) {
  const [q, setQ] = useState('');
  const [results, setResults] = useState<any[]>([]);
  useEffect(() => {
    let cancelled = false;
    if (!q) { setResults([]); return; }
    (async () => {
      const url = new URL('/api/chat/search', window.location.origin);
      url.searchParams.set('q', q);
      if (conversationId) url.searchParams.set('conversationId', conversationId);
      const res = await fetch(url.toString());
      if (!res.ok) return;
      const json = await res.json();
      if (cancelled) return;
      setResults(json.messages || []);
    })();
    return () => { cancelled = true; };
  }, [q, conversationId]);

  return (
    <div className="border-b bg-card/40 px-3 py-2">
      <Input value={q} onChange={(e)=>setQ(e.target.value)} placeholder={conversationId ? 'Search in conversation' : 'Search all messages'} />
      {!!q && results.length > 0 && (
        <div className="mt-2 max-h-60 overflow-y-auto space-y-1">
          {results.slice(0, 20).map((m:any) => (
            <div key={m.id} className="rounded-md border p-2 text-xs">
              <div className="text-muted-foreground">{new Date(m.createdAt).toLocaleString()} — {m.sender?.name}</div>
              <div dangerouslySetInnerHTML={{ __html: m.content || '' }} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}


