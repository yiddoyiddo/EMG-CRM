"use client";
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Smile, Paperclip, Send } from 'lucide-react';
import { toast } from 'sonner';
import { EmojiPicker } from '@/components/ui/emoji-picker';

const Picker = EmojiPicker as any;

type User = { id: string; name: string };

export function MessageComposer({
  conversationId,
  onSend,
  onTyping,
}: {
  conversationId: string;
  onSend: (payload: { content: string; attachments: any[] }) => Promise<void>;
  onTyping?: () => void;
}) {
  const [text, setText] = useState('');
  const [showEmoji, setShowEmoji] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [mentionOpen, setMentionOpen] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    fetch('/api/users')
      .then((r) => r.json())
      .then((j) => {
        const list = (j?.data?.users || []).map((u: any) => ({ id: u.id, name: u.name || u.email }));
        setUsers(list);
      })
      .catch(() => {});
  }, []);

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      doSend();
      return;
    }
    if (onTyping) onTyping();
  }

  function insertEmoji(emoji: any) {
    setText((t) => `${t}${emoji.native}`);
    setShowEmoji(false);
  }

  function onChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const val = e.target.value;
    setText(val);
    const atIndex = val.lastIndexOf('@');
    if (atIndex >= 0) {
      const q = val.slice(atIndex + 1).trim();
      setMentionQuery(q);
      setMentionOpen(q.length > 0);
    } else {
      setMentionOpen(false);
      setMentionQuery('');
    }
  }

  function selectMention(u: User) {
    const atIndex = text.lastIndexOf('@');
    if (atIndex >= 0) {
      const before = text.slice(0, atIndex);
      const after = text.slice(atIndex + 1 + mentionQuery.length);
      setText(`${before}@{${u.id}} ${after}`);
      setMentionOpen(false);
      setMentionQuery('');
    }
  }

  async function uploadFiles(): Promise<any[]> {
    const results: any[] = [];
    for (const file of files) {
      try {
        const res = await fetch('/api/chat/uploads/create-url', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ filename: file.name, mime: file.type, size: file.size }),
        });
        if (!res.ok) throw new Error('upload url');
        const { uploadUrl, url } = await res.json();
        const put = await fetch(uploadUrl, { method: 'PUT', body: file });
        if (!put.ok) throw new Error('upload fail');
        results.push({ url, fileName: file.name, mimeType: file.type, size: file.size });
      } catch (e) {
        toast.error(`Failed to upload ${file.name}`);
      }
    }
    return results;
  }

  async function doSend() {
    const trimmed = text.trim();
    if (!trimmed && files.length === 0) return;
    const attachments = await uploadFiles();
    await onSend({ content: trimmed, attachments });
    setText('');
    setFiles([]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  return (
    <div className="border-t bg-card/40 p-2 md:p-3">
      <div className="flex items-end gap-2">
        <Popover open={showEmoji} onOpenChange={setShowEmoji}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="icon" aria-label="Insert emoji"><Smile className="h-4 w-4" /></Button>
          </PopoverTrigger>
          <PopoverContent className="p-0">
            {Picker ? <Picker onSelect={insertEmoji} /> : null}
          </PopoverContent>
        </Popover>
        <input ref={fileInputRef} type="file" multiple className="hidden" onChange={(e) => setFiles(Array.from(e.target.files || []))} />
        <Button type="button" variant="outline" size="icon" aria-label="Attach files" onClick={() => fileInputRef.current?.click()}>
          <Paperclip className="h-4 w-4" />
        </Button>
        <div className="relative flex-1">
          <Textarea rows={2} value={text} onChange={onChange} onKeyDown={handleKeyDown} placeholder="Type a message (Ctrl/Cmd + Enter to send). Use @ to mention..." />
          {mentionOpen && (
            <div className="absolute z-10 mt-1 w-full rounded-md border bg-popover shadow">
              {(users.filter((u) => u.name?.toLowerCase().includes(mentionQuery.toLowerCase())).slice(0, 6)).map((u) => (
                <button key={u.id} type="button" className="block w-full text-left px-2 py-1 hover:bg-accent" onClick={() => selectMention(u)}>
                  {u.name}
                </button>
              ))}
            </div>
          )}
        </div>
        <Button onClick={doSend} aria-label="Send message"><Send className="h-4 w-4" /></Button>
      </div>
      {files.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2 text-sm text-muted-foreground">
          {files.map((f) => (<span key={f.name} className="rounded bg-accent px-2 py-1">{f.name}</span>))}
        </div>
      )}
    </div>
  );
}


