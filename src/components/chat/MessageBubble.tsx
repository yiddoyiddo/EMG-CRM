"use client";
import { useMemo, useState } from 'react';
import { ReactionsBar } from './ReactionsBar';
import { ReadReceipts } from './ReadReceipts';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { MoreHorizontal, Pin, PinOff, Pencil, Trash2 } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

function getRelativeTime(date: Date): string {
  const now = new Date();
  const diffInMs = now.getTime() - date.getTime();
  const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
  const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

  if (diffInMinutes < 1) return 'Just now';
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
  if (diffInHours < 24) return `${diffInHours}h ago`;
  if (diffInDays < 7) return `${diffInDays}d ago`;
  
  return date.toLocaleDateString();
}

function getUserInitials(name?: string): string {
  if (!name) return 'U';
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

export function MessageBubble({ message, isOwn, onEdited }: { message: any; isOwn?: boolean; onEdited?: () => void }) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState<string>('');
  const [showFullTime, setShowFullTime] = useState(false);
  
  const content = useMemo(() => {
    if (message.isDeleted) return '<i class="text-muted-foreground">This message was deleted</i>';
    return message.content || '';
  }, [message]);

  const messageTime = useMemo(() => new Date(message.createdAt), [message.createdAt]);

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
    <div className={`group flex gap-3 px-3 py-2 hover:bg-muted/30 transition-colors ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}>
      {/* Avatar - only show for others' messages */}
      {!isOwn && (
        <Avatar className="w-8 h-8 shrink-0">
          <AvatarFallback className="text-xs bg-gradient-to-br from-blue-500 to-purple-600 text-white">
            {getUserInitials(message.sender?.name)}
          </AvatarFallback>
        </Avatar>
      )}
      
      <div className={`flex flex-col min-w-0 max-w-[85%] sm:max-w-[70%] ${isOwn ? 'items-end' : 'items-start'}`}>
        {/* Message bubble */}
        <div className={`
          relative rounded-2xl px-4 py-2.5 shadow-sm transition-all duration-200
          ${isOwn 
            ? 'bg-blue-500 text-white rounded-br-md' 
            : 'bg-white dark:bg-gray-800 border rounded-bl-md'
          }
          ${message.isPinned ? 'ring-2 ring-amber-400/50' : ''}
        `}>
          {/* Pinned indicator */}
          {message.isPinned && (
            <div className={`absolute -top-2 ${isOwn ? '-left-2' : '-right-2'} bg-amber-400 rounded-full p-1`}>
              <Pin className="w-3 h-3 text-white" />
            </div>
          )}
          
          {/* Name for group messages (non-own) */}
          {!isOwn && message.sender?.name && (
            <div className="text-sm font-medium mb-1 text-blue-600 dark:text-blue-400">
              {message.sender.name}
            </div>
          )}
          
          {/* Message content */}
          {isEditing ? (
            <div className="space-y-3">
              <Textarea 
                value={draft} 
                onChange={(e)=>setDraft(e.target.value)} 
                rows={3}
                className="min-h-[80px] resize-none"
                placeholder="Edit your message..."
              />
              <div className="flex gap-2 justify-end">
                <Button size="sm" variant="ghost" onClick={()=>{ setIsEditing(false); setDraft(''); }}>
                  Cancel
                </Button>
                <Button size="sm" onClick={save}>Save</Button>
              </div>
            </div>
          ) : (
            <div className={`prose prose-sm max-w-none ${isOwn ? 'prose-invert' : ''}`} 
                 dangerouslySetInnerHTML={{ __html: content }} />
          )}
          
          {/* Attachments */}
          {Array.isArray(message.attachments) && message.attachments.length > 0 && (
            <div className="mt-3 space-y-2">
              {message.attachments.map((a: any) => (
                <a 
                  key={a.id || a.url} 
                  href={a.url} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className={`
                    flex items-center gap-2 p-2 rounded-lg border transition-colors
                    ${isOwn ? 'bg-white/20 border-white/30 hover:bg-white/30 text-white' : 'bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600'}
                  `}
                >
                  <div className="text-xs font-medium truncate">{a.fileName}</div>
                  <div className={`text-xs ${isOwn ? 'text-white/70' : 'text-muted-foreground'}`}>
                    ({Math.round((a.size || 0)/1024)}KB)
                  </div>
                </a>
              ))}
            </div>
          )}
        </div>
        
        {/* Message footer */}
        <div className={`flex items-center gap-2 mt-1 text-xs text-muted-foreground ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}>
          {/* Timestamp */}
          <button 
            onClick={() => setShowFullTime(!showFullTime)}
            className="hover:text-foreground transition-colors"
            title={messageTime.toLocaleString()}
          >
            {showFullTime ? messageTime.toLocaleString() : getRelativeTime(messageTime)}
          </button>
          
          {/* Edited indicator */}
          {message.isEdited && (
            <span className="italic">edited</span>
          )}
          
          {/* Actions menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-muted"
              >
                <MoreHorizontal className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align={isOwn ? "end" : "start"}>
              {isOwn && !message.isDeleted && (
                <DropdownMenuItem onClick={() => { 
                  setDraft((message.content || '').replace(/<[^>]+>/g, '')); 
                  setIsEditing(true); 
                }}>
                  <Pencil className="h-4 w-4 mr-2" />
                  Edit
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={() => pin(!message.isPinned)}>
                {message.isPinned ? (
                  <>
                    <PinOff className="h-4 w-4 mr-2" />
                    Unpin
                  </>
                ) : (
                  <>
                    <Pin className="h-4 w-4 mr-2" />
                    Pin
                  </>
                )}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={del} className="text-red-600 focus:text-red-600">
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        
        {/* Reactions and read receipts */}
        <div className={`${isOwn ? 'self-end' : 'self-start'} mt-1`}>
          <ReactionsBar messageId={message.id} onChanged={()=> onEdited?.()} />
          <ReadReceipts reads={message.reads || []} />
        </div>
      </div>
    </div>
  );
}


