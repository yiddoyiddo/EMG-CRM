"use client";
import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { UserSearchSelect } from './UserSearchSelect';
import { Separator } from '@/components/ui/separator';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Lock, LockOpen, MoreVertical, Users, UserPlus, Settings, Info } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { toast } from 'sonner';

export function ChatHeader({ conversation, onChanged }: { conversation: any; onChanged: () => void }) {
  const [name, setName] = useState(conversation?.name || '');
  const [lock, setLock] = useState<boolean>(!!conversation?.isLocked);
  const [isEditing, setIsEditing] = useState(false);

  const isGroup = !!conversation?.isGroup || (conversation?.members?.length || 0) > 2 || !!name;
  const memberCount = conversation?.members?.length || 0;

  function getUserInitials(name?: string): string {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  }

  async function save() {
    try {
      const res = await fetch(`/api/chat/conversations/${conversation.id}`, { 
        method: 'PATCH', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ name: name.trim(), lock }) 
      });
      if (res.ok) {
        setIsEditing(false);
        onChanged();
        toast.success('Conversation updated');
      } else {
        toast.error('Failed to update conversation');
      }
    } catch {
      toast.error('Failed to update conversation');
    }
  }
  
  async function addMember(userId: string) {
    if (!userId) return;
    try {
      const res = await fetch(`/api/chat/conversations/${conversation.id}`, { 
        method: 'PATCH', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ addMemberIds: [userId] }) 
      });
      if (res.ok) { 
        onChanged(); 
        toast.success('Member added');
      } else {
        toast.error('Failed to add member');
      }
    } catch {
      toast.error('Failed to add member');
    }
  }
  
  async function removeMember(userId: string) {
    try {
      const res = await fetch(`/api/chat/conversations/${conversation.id}`, { 
        method: 'PATCH', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ removeMemberIds: [userId] }) 
      });
      if (res.ok) {
        onChanged();
        toast.success('Member removed');
      } else {
        toast.error('Failed to remove member');
      }
    } catch {
      toast.error('Failed to remove member');
    }
  }

  const displayTitle = conversation?.name || (isGroup ? 'Group Chat' : 'Direct Message');

  return (
    <div className="flex items-center gap-4 border-b bg-gradient-to-r from-card to-muted/20 px-6 py-4">
      {/* Left section - Conversation info */}
      <div className="flex items-center gap-4 min-w-0 flex-1">
        {/* Avatar */}
        <div className="relative">
          <Avatar className="h-10 w-10 ring-2 ring-border">
            <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white font-semibold">
              {getUserInitials(displayTitle)}
            </AvatarFallback>
          </Avatar>
          {/* Online indicator */}
          <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-background"></div>
        </div>

        {/* Title and member count */}
        <div className="min-w-0 flex-1">
          {isEditing ? (
            <div className="flex items-center gap-2">
              <Input 
                value={name} 
                onChange={(e) => setName(e.target.value)}
                placeholder={isGroup ? 'Enter group name' : 'Enter conversation name'}
                className="h-8 text-sm"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') save();
                  if (e.key === 'Escape') { setName(conversation?.name || ''); setIsEditing(false); }
                }}
              />
              <Button size="sm" onClick={save}>Save</Button>
              <Button size="sm" variant="ghost" onClick={() => { setName(conversation?.name || ''); setIsEditing(false); }}>
                Cancel
              </Button>
            </div>
          ) : (
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h1 className="font-semibold text-lg truncate">{displayTitle}</h1>
                {lock && <Lock className="h-4 w-4 text-amber-500" />}
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-6 w-6 opacity-60 hover:opacity-100"
                  onClick={() => setIsEditing(true)}
                >
                  <Settings className="h-3 w-3" />
                </Button>
              </div>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  <span>{memberCount} member{memberCount !== 1 ? 's' : ''}</span>
                </div>
                <div className="hidden md:block">
                  {isGroup ? 'Group conversation' : 'Direct message'}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right section - Actions */}
      <div className="flex items-center gap-2">
        {/* Member avatars preview */}
        <div className="hidden lg:flex items-center -space-x-2">
          {conversation?.members?.slice(0, 3).map((member: any) => (
            <Avatar key={member.userId} className="h-8 w-8 border-2 border-background">
              <AvatarFallback className="text-xs bg-gradient-to-br from-gray-500 to-gray-600 text-white">
                {getUserInitials(member.user?.name)}
              </AvatarFallback>
            </Avatar>
          ))}
          {memberCount > 3 && (
            <div className="h-8 w-8 rounded-full bg-muted border-2 border-background flex items-center justify-center">
              <span className="text-xs font-medium">+{memberCount - 3}</span>
            </div>
          )}
        </div>

        {/* Add member button */}
        <div className="hidden md:block w-48">
          <UserSearchSelect 
            onSelect={(u) => addMember(u.id)} 
            placeholder="Add member..."
          />
        </div>

        {/* More actions */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="ghost" 
              size="icon"
              className="rounded-full hover:bg-muted"
              aria-label="More options"
            >
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            {/* Conversation settings */}
            <DropdownMenuItem onClick={() => setIsEditing(true)}>
              <Settings className="h-4 w-4 mr-2" />
              Edit conversation
            </DropdownMenuItem>
            
            <DropdownMenuItem onClick={() => { setLock(!lock); save(); }}>
              {lock ? (
                <>
                  <LockOpen className="h-4 w-4 mr-2" />
                  Unlock conversation
                </>
              ) : (
                <>
                  <Lock className="h-4 w-4 mr-2" />
                  Lock conversation
                </>
              )}
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            {/* Add member on mobile */}
            <div className="md:hidden">
              <DropdownMenuItem>
                <UserPlus className="h-4 w-4 mr-2" />
                Add member
              </DropdownMenuItem>
              <DropdownMenuSeparator />
            </div>

            {/* Members management */}
            {conversation?.members?.length > 0 && (
              <>
                <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                  Members ({memberCount})
                </div>
                {conversation.members.map((member: any) => (
                  <DropdownMenuItem
                    key={member.userId}
                    onClick={() => removeMember(member.userId)}
                    className="text-red-600 focus:text-red-600"
                  >
                    <div className="flex items-center gap-2 w-full">
                      <Avatar className="h-5 w-5">
                        <AvatarFallback className="text-xs bg-gradient-to-br from-gray-500 to-gray-600 text-white">
                          {getUserInitials(member.user?.name)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="flex-1 truncate">{member.user?.name || member.userId}</span>
                      <span className="text-xs opacity-60">Remove</span>
                    </div>
                  </DropdownMenuItem>
                ))}
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}


