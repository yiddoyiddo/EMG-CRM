"use client";
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Plus } from 'lucide-react';

const DEFAULT_EMOJIS = ['👍','❤️','😂','😮','😢','😡'];

interface Reaction {
  emoji: string;
  count: number;
  users: Array<{id: string; name?: string}>;
  hasReacted: boolean;
}

export function ReactionsBar({ messageId, onChanged }: { messageId: string; onChanged: () => void }) {
  const [busy, setBusy] = useState(false);
  const [reactions, setReactions] = useState<Reaction[]>([]);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  // Load existing reactions
  useEffect(() => {
    fetch(`/api/chat/messages/${messageId}/reactions`)
      .then(res => res.json())
      .then(data => {
        if (data.reactions) {
          const groupedReactions = data.reactions.reduce((acc: Record<string, Reaction>, reaction: any) => {
            if (!acc[reaction.emoji]) {
              acc[reaction.emoji] = {
                emoji: reaction.emoji,
                count: 0,
                users: [],
                hasReacted: false
              };
            }
            acc[reaction.emoji].count++;
            acc[reaction.emoji].users.push({ id: reaction.userId, name: reaction.user?.name });
            // TODO: Check if current user has reacted
            return acc;
          }, {});
          setReactions(Object.values(groupedReactions));
        }
      })
      .catch(() => {});
  }, [messageId]);

  async function toggle(emoji: string) {
    if (busy) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/chat/messages/${messageId}/reactions`, { 
        method: 'POST', 
        headers: { 'Content-Type':'application/json' }, 
        body: JSON.stringify({ emoji }) 
      });
      if (res.ok) {
        onChanged();
        // Refresh reactions
        const data = await fetch(`/api/chat/messages/${messageId}/reactions`).then(r => r.json());
        if (data.reactions) {
          const groupedReactions = data.reactions.reduce((acc: Record<string, Reaction>, reaction: any) => {
            if (!acc[reaction.emoji]) {
              acc[reaction.emoji] = {
                emoji: reaction.emoji,
                count: 0,
                users: [],
                hasReacted: false
              };
            }
            acc[reaction.emoji].count++;
            acc[reaction.emoji].users.push({ id: reaction.userId, name: reaction.user?.name });
            return acc;
          }, {});
          setReactions(Object.values(groupedReactions));
        }
      }
    } finally {
      setBusy(false);
      setShowEmojiPicker(false);
    }
  }

  // Show existing reactions if any, otherwise show quick reactions
  const displayReactions = reactions.length > 0 ? reactions : DEFAULT_EMOJIS.map(e => ({
    emoji: e,
    count: 0,
    users: [],
    hasReacted: false
  }));

  return (
    <div className="mt-2 flex flex-wrap gap-1 items-center">
      {displayReactions.map((reaction) => (
        <button
          key={reaction.emoji}
          onClick={() => toggle(reaction.emoji)}
          disabled={busy}
          className={`
            group flex items-center gap-1 rounded-full border px-2 py-1 text-xs transition-all hover:scale-105
            ${reaction.count > 0 
              ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800' 
              : 'bg-muted/50 hover:bg-muted border-transparent'
            }
            ${reaction.hasReacted ? 'ring-2 ring-blue-400/50' : ''}
          `}
          title={
            reaction.count > 0 
              ? `${reaction.users.map(u => u.name || u.id).join(', ')}` 
              : `React with ${reaction.emoji}`
          }
        >
          <span className="text-sm">{reaction.emoji}</span>
          {reaction.count > 0 && (
            <span className="font-medium text-xs text-blue-600 dark:text-blue-400">
              {reaction.count}
            </span>
          )}
        </button>
      ))}
      
      {/* Add reaction button */}
      <Popover open={showEmojiPicker} onOpenChange={setShowEmojiPicker}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 rounded-full opacity-70 hover:opacity-100 hover:bg-muted transition-all"
            aria-label="Add reaction"
          >
            <Plus className="h-3 w-3" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="p-2 w-auto" align="start">
          <div className="grid grid-cols-6 gap-1">
            {['😀','😃','😄','😁','😅','😂','🤣','😊','😇','🙂','🙃','😉','😌','😍','🥰','😘','😗','😙','😚','😋','😛','😝','😜','🤪','🤨','🧐','🤓','😎','🤩','🥳','😏','😒','😞','😔','😟','😕','🙁','☹️','😣','😖','😫','😩','🥺','😢','😭','😤','😠','😡','🤬','🤯','😳','🥵','🥶','😱','😨','😰','😥','😓','🤗','🤔','🤭','🤫','🤥','😶','😐','😑','😬','🙄','😯','😦','😧','😮','😲','🥱','😴','🤤','😪','😵','🤐','🥴','🤢','🤮','🤧','😷','🤒','🤕','🤑','🤠','😈','👿','👹','👺','🤡','💩','👻','💀','☠️','👽','👾','🤖','🎃','😺','😸','😹','😻','😼','😽','🙀','😿','😾'].map(emoji => (
              <button
                key={emoji}
                onClick={() => toggle(emoji)}
                className="p-1 hover:bg-muted rounded text-lg transition-colors"
                disabled={busy}
              >
                {emoji}
              </button>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}


