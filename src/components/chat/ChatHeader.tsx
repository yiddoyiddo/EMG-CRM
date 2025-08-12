"use client";
import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { UserSearchSelect } from './UserSearchSelect';
import { Separator } from '@/components/ui/separator';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Lock, LockOpen, MoreVertical, Users } from 'lucide-react';

export function ChatHeader({ conversation, onChanged }: { conversation: any; onChanged: () => void }) {
  const [name, setName] = useState(conversation?.name || '');
  const [lock, setLock] = useState<boolean>(!!conversation?.isLocked);

  const isGroup = !!conversation?.isGroup || (conversation?.members?.length || 0) > 2 || !!name;
  const memberCount = conversation?.members?.length || 0;

  async function save() {
    const res = await fetch(`/api/chat/conversations/${conversation.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, lock }) });
    if (res.ok) onChanged();
  }
  async function addMember(userId: string) {
    if (!userId) return;
    const res = await fetch(`/api/chat/conversations/${conversation.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ addMemberIds: [userId] }) });
    if (res.ok) { onChanged(); }
  }
  async function removeMember(userId: string) {
    const res = await fetch(`/api/chat/conversations/${conversation.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ removeMemberIds: [userId] }) });
    if (res.ok) onChanged();
  }

  return (
    <div className="flex items-center gap-3 border-b bg-card px-4 py-3">
      <div className="flex min-w-0 items-center gap-3">
        <Input className="max-w-sm" value={name} onChange={(e)=>setName(e.target.value)} placeholder={isGroup ? 'Group name' : 'Direct message'} />
        <Button size="sm" variant="outline" onClick={() => setLock((v) => !v)} aria-label={lock ? 'Unlock conversation' : 'Lock conversation'}>
          {lock ? <Lock className="h-4 w-4" /> : <LockOpen className="h-4 w-4" />}
        </Button>
        <Button size="sm" onClick={save}>Save</Button>
      </div>

      <div className="ml-auto flex items-center gap-3">
        <div className="text-xs text-muted-foreground hidden md:inline-flex items-center gap-1">
          <Users className="h-3 w-3" />
          {memberCount} members
        </div>
        <div className="w-64 hidden md:block">
          <UserSearchSelect onSelect={(u)=> addMember(u.id)} />
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="More">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setLock((v) => !v)}>{lock ? 'Unlock conversation' : 'Lock conversation'}</DropdownMenuItem>
            <DropdownMenuSeparator />
            {!!conversation?.members?.length && (
              <div className="px-2 py-1 text-xs text-muted-foreground">Members</div>
            )}
            {!!conversation?.members?.length && conversation.members.map((m: any) => (
              <DropdownMenuItem key={m.userId} onClick={()=>removeMember(m.userId)}>
                Remove {m.user?.name || m.userId}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}


