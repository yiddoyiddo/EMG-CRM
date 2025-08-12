"use client";
import { useState } from 'react';

const DEFAULT_EMOJIS = ['👍','❤️','👏','🎉','😀','🙏'];

export function ReactionsBar({ messageId, onChanged }: { messageId: string; onChanged: () => void }) {
  const [busy, setBusy] = useState(false);
  async function toggle(emoji: string) {
    if (busy) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/chat/messages/${messageId}/reactions`, { method: 'POST', headers: { 'Content-Type':'application/json' }, body: JSON.stringify({ emoji }) });
      if (res.ok) onChanged();
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="mt-1 flex flex-wrap gap-1">
      {DEFAULT_EMOJIS.map(e => (
        <button key={e} onClick={()=>toggle(e)} className="rounded-md border bg-background px-1.5 py-0.5 text-xs hover:bg-accent">
          {e}
        </button>
      ))}
    </div>
  );
}


