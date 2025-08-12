"use client";
import { useMemo, useState } from 'react';
import { ReactionsBar } from './ReactionsBar';
import { ReadReceipts } from './ReadReceipts';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { MoreHorizontal, Pin, PinOff, Pencil, Trash2 } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';

export function MessageBubble({ message, isOwn, onEdited }: { message: any; isOwn?: boolean; onEdited?: () => void }) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState<string>('');
  const content = useMemo(() => {
    if (message.isDeleted) return '<i>deleted</i>';
    return message.content || '';
  }, [message]);

  async function pin(toggle: boolean) {
    try {
      const url = `/api/chat/messages/${message.id}/pin`;
      const res = await fetch(url, { method: toggle ? 'POST' : 'DELETE' });
      if (!res.ok) return;
      onEdited?.();
    } catch {}
  }
  async function del() {
    try {
      const res = await fetch(`/api/chat/messages/${message.id}`, { method: 'DELETE' });
      if (!res.ok) return;
      onEdited?.();
    } catch {}
  }

  async function save() {
    try {
      const res = await fetch(`/api/chat/messages/${message.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content: draft }) });
      if (!res.ok) return;
      setIsEditing(false);
      onEdited?.();
    } catch {}
  }

  return (
    <div className={`group rounded-xl border p-2 md:p-3 ${isOwn ? 'bg-accent/30' : 'bg-background'}`}>
      <div className="flex items-start gap-2">
        <div className="flex-1 min-w-0">
          <div className="text-[11px] text-muted-foreground flex items-center gap-2">
            <span>{new Date(message.createdAt).toLocaleString()}</span>
            {message.isEdited && <span>(edited)</span>}
            {message.isPinned && <span className="text-amber-600">(pinned)</span>}
          </div>
          {isEditing ? (
            <div className="space-y-2">
              <Textarea value={draft} onChange={(e)=>setDraft(e.target.value)} rows={3} />
              <div className="flex gap-2">
                <Button size="sm" onClick={save}>Save</Button>
                <Button size="sm" variant="ghost" onClick={()=>{ setIsEditing(false); setDraft(''); }}>Cancel</Button>
              </div>
            </div>
          ) : (
            <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: content }} />
          )}
          {Array.isArray(message.attachments) && message.attachments.length > 0 && (
            <div className="mt-2 flex flex-col gap-1">
              {message.attachments.map((a: any) => (
                <a key={a.id || a.url} href={a.url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary underline">
                  {a.fileName} ({Math.round((a.size || 0)/1024)}KB)
                </a>
              ))}
            </div>
          )}
          <ReactionsBar messageId={message.id} onChanged={()=> onEdited?.()} />
          <ReadReceipts reads={message.reads || []} />
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {isOwn && !message.isDeleted && (
              <DropdownMenuItem onClick={() => { setDraft((message.content || '').replace(/<[^>]+>/g, '')); setIsEditing(true); }}>
                <span className="inline-flex items-center gap-2"><Pencil className="h-4 w-4" /> Edit</span>
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={() => pin(!message.isPinned)}>{message.isPinned ? <span className="inline-flex items-center gap-2"><PinOff className="h-4 w-4" /> Unpin</span> : <span className="inline-flex items-center gap-2"><Pin className="h-4 w-4" /> Pin</span>}</DropdownMenuItem>
            <DropdownMenuItem onClick={del} className="text-red-600"><span className="inline-flex items-center gap-2"><Trash2 className="h-4 w-4" /> Delete</span></DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}


