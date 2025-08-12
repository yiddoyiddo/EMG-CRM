"use client";
import { useEffect, useMemo, useState } from 'react';
import { Input } from '@/components/ui/input';

type User = { id: string; name?: string; email?: string };

export function UserSearchSelect({ onSelect }: { onSelect: (user: User) => void }) {
  const [q, setQ] = useState('');
  const [results, setResults] = useState<User[]>([]);
  useEffect(() => {
    let aborted = false;
    const run = async () => {
      const url = new URL('/api/users', window.location.origin);
      url.searchParams.set('search', q);
      const res = await fetch(url.toString());
      if (!res.ok) return;
      const json = await res.json();
      if (aborted) return;
      setResults((json?.users || []).map((u: any) => ({ id: u.id, name: u.name, email: u.email })));
    };
    run().catch(()=>{});
    return () => { aborted = true; };
  }, [q]);

  return (
    <div className="relative">
      <Input value={q} onChange={(e)=>setQ(e.target.value)} placeholder="Search users..." />
      {q && results.length > 0 && (
        <div className="absolute z-10 mt-1 w-full rounded border bg-background shadow">
          {results.slice(0,8).map((u) => (
            <button key={u.id} className="block w-full text-left px-2 py-1 hover:bg-accent" onClick={()=>onSelect(u)}>
              {u.name || u.email} ({u.id})
            </button>
          ))}
        </div>
      )}
    </div>
  );
}


