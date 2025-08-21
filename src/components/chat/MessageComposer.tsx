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
  const [isUploading, setIsUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    fetch('/api/users')
      .then((r) => r.json())
      .then((j) => {
        const list = (j?.data?.users || []).map((u: any) => ({ id: u.id, name: u.name || u.email }));
        setUsers(list);
      })
      .catch(() => {});
  }, []);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [text]);

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter') {
      if (!e.shiftKey && !mentionOpen) {
        e.preventDefault();
        doSend();
        return;
      }
      // Allow Shift+Enter for new lines
    }
    if (onTyping) onTyping();
  }

  // Drag and drop handlers
  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(true);
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const droppedFiles = Array.from(e.dataTransfer.files);
    setFiles(prev => [...prev, ...droppedFiles]);
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
    if (files.length === 0) return [];
    
    setIsUploading(true);
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
    setIsUploading(false);
    return results;
  }

  async function doSend() {
    const trimmed = text.trim();
    if (!trimmed && files.length === 0) return;
    if (isUploading) return;
    
    try {
      const attachments = await uploadFiles();
      await onSend({ content: trimmed, attachments });
      setText('');
      setFiles([]);
      if (fileInputRef.current) fileInputRef.current.value = '';
      // Focus back to textarea after sending
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 100);
    } catch (error) {
      console.error('Failed to send message:', error);
      toast.error('Failed to send message');
    }
  }

  function removeFile(index: number) {
    setFiles(prev => prev.filter((_, i) => i !== index));
  }

  const canSend = (text.trim() || files.length > 0) && !isUploading;

  return (
    <div 
      className={`relative border-t bg-gradient-to-r from-background to-muted/20 p-4 transition-colors ${dragOver ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-300' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* File attachments preview */}
      {files.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-2">
          {files.map((file, index) => (
            <div key={`${file.name}-${file.size}-${index}`} className="group flex items-center gap-2 rounded-lg border bg-muted/50 px-3 py-2 text-sm">
              <Paperclip className="h-3 w-3 text-muted-foreground" />
              <span className="font-medium truncate max-w-[150px]">{file.name}</span>
              <span className="text-xs text-muted-foreground">({Math.round(file.size / 1024)}KB)</span>
              <Button
                size="icon"
                variant="ghost"
                className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => removeFile(index)}
              >
                ×
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Drag overlay */}
      {dragOver && (
        <div className="absolute inset-4 bg-blue-500/10 border-2 border-dashed border-blue-300 rounded-lg flex items-center justify-center z-10">
          <div className="text-blue-600 font-medium">Drop files to attach</div>
        </div>
      )}

      <div className="flex items-end gap-3">
        {/* Emoji picker */}
        <Popover open={showEmoji} onOpenChange={setShowEmoji}>
          <PopoverTrigger asChild>
            <Button 
              variant="ghost" 
              size="icon" 
              className="rounded-full hover:bg-muted"
              aria-label="Insert emoji"
            >
              <Smile className="h-5 w-5" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="p-0 w-auto" align="start">
            {Picker ? <Picker onSelect={insertEmoji} /> : null}
          </PopoverContent>
        </Popover>

        {/* File attachment */}
        <input 
          ref={fileInputRef} 
          type="file" 
          multiple 
          className="hidden" 
          onChange={(e) => setFiles(prev => [...prev, ...Array.from(e.target.files || [])])} 
        />
        <Button 
          type="button" 
          variant="ghost" 
          size="icon" 
          className="rounded-full hover:bg-muted"
          aria-label="Attach files" 
          onClick={() => fileInputRef.current?.click()}
        >
          <Paperclip className="h-5 w-5" />
        </Button>

        {/* Message input */}
        <div className="relative flex-1">
          <Textarea
            ref={textareaRef}
            value={text}
            onChange={onChange}
            onKeyDown={handleKeyDown}
            placeholder="Type a message... (Enter to send, Shift+Enter for new line)"
            className="resize-none min-h-[44px] max-h-[120px] rounded-2xl border-2 focus:border-blue-400 transition-colors pr-4 py-3"
            rows={1}
          />
          
          {/* Mention dropdown */}
          {mentionOpen && (
            <div className="absolute bottom-full mb-1 w-full rounded-lg border bg-popover shadow-lg z-20">
              {(users.filter((u) => u.name?.toLowerCase().includes(mentionQuery.toLowerCase())).slice(0, 6)).map((u) => (
                <button 
                  key={u.id} 
                  type="button" 
                  className="block w-full text-left px-3 py-2 hover:bg-accent first:rounded-t-lg last:rounded-b-lg transition-colors" 
                  onClick={() => selectMention(u)}
                >
                  <div className="font-medium">{u.name}</div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Send button */}
        <Button 
          onClick={doSend}
          disabled={!canSend}
          size="icon"
          className={`rounded-full transition-all duration-200 ${
            canSend 
              ? 'bg-blue-500 hover:bg-blue-600 text-white shadow-md hover:shadow-lg' 
              : 'bg-muted text-muted-foreground'
          }`}
          aria-label="Send message"
        >
          {isUploading ? (
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </div>
    </div>
  );
}


