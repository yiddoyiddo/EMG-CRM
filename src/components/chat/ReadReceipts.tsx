"use client";
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

export function ReadReceipts({ reads }: { reads: Array<{ user?: { id: string; name?: string } }> }) {
  if (!reads || reads.length === 0) return null;
  return (
    <div className="mt-1 flex items-center gap-1">
      {reads.slice(0, 5).map((r, idx) => (
        <Avatar key={idx} className="h-4 w-4">
          <AvatarFallback className="text-[8px]">
            {(r.user?.name || r.user?.id || '?').slice(0,2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
      ))}
      {reads.length > 5 && (
        <span className="ml-1 text-[10px] text-muted-foreground">+{reads.length - 5}</span>
      )}
    </div>
  );
}


