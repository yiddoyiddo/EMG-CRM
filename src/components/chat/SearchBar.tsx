"use client";
import { useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, X, MessageSquare } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

export function SearchBar({ conversationId }: { conversationId?: string }) {
  const [q, setQ] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!q.trim()) { 
      setResults([]);
      setIsSearching(false);
      return; 
    }

    setIsSearching(true);
    const searchTimeout = setTimeout(async () => {
      try {
        const url = new URL('/api/chat/search', window.location.origin);
        url.searchParams.set('q', q.trim());
        if (conversationId) url.searchParams.set('conversationId', conversationId);
        const res = await fetch(url.toString());
        if (!res.ok) throw new Error('Search failed');
        const json = await res.json();
        if (cancelled) return;
        setResults(json.messages || []);
      } catch (error) {
        if (!cancelled) setResults([]);
      } finally {
        if (!cancelled) setIsSearching(false);
      }
    }, 300);

    return () => { 
      cancelled = true; 
      clearTimeout(searchTimeout);
    };
  }, [q, conversationId]);

  function clearSearch() {
    setQ('');
    setResults([]);
    setIsExpanded(false);
  }

  function highlightText(text: string, query: string): string {
    if (!query || !text) return text;
    const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    return text.replace(regex, '<mark class="bg-yellow-200 dark:bg-yellow-800 rounded px-1">$1</mark>');
  }

  function getUserInitials(name?: string): string {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  }

  return (
    <div className="border-b bg-gradient-to-r from-background to-muted/20 px-4 py-3">
      <div className="relative">
        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            value={q} 
            onChange={(e) => setQ(e.target.value)}
            onFocus={() => setIsExpanded(true)}
            placeholder={conversationId ? 'Search messages in this conversation...' : 'Search all messages...'}
            className="pl-10 pr-10 rounded-full border-2 focus:border-blue-400 transition-all duration-200"
          />
          {q && (
            <Button
              variant="ghost"
              size="icon"
              onClick={clearSearch}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 rounded-full hover:bg-muted"
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>

        {/* Search Results */}
        {isExpanded && q && (
          <div className="absolute left-0 right-0 top-full mt-2 bg-popover rounded-xl border shadow-lg z-50 max-h-80 overflow-hidden">
            {isSearching ? (
              <div className="p-4 text-center">
                <div className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                  <div className="w-4 h-4 border-2 border-muted-foreground/30 border-t-muted-foreground rounded-full animate-spin"></div>
                  Searching...
                </div>
              </div>
            ) : results.length > 0 ? (
              <div className="max-h-80 overflow-y-auto">
                <div className="p-2 text-xs text-muted-foreground font-medium border-b">
                  {results.length} result{results.length !== 1 ? 's' : ''} found
                </div>
                {results.slice(0, 15).map((message: any) => (
                  <div 
                    key={message.id} 
                    className="p-3 hover:bg-accent transition-colors cursor-pointer border-b last:border-b-0"
                  >
                    <div className="flex items-start gap-3">
                      <Avatar className="h-8 w-8 shrink-0">
                        <AvatarFallback className="text-xs bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                          {getUserInitials(message.sender?.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-sm">
                            {message.sender?.name || 'Unknown User'}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {new Date(message.createdAt).toLocaleDateString()} at{' '}
                            {new Date(message.createdAt).toLocaleTimeString([], { 
                              hour: '2-digit', 
                              minute: '2-digit' 
                            })}
                          </span>
                        </div>
                        <div 
                          className="text-sm text-muted-foreground line-clamp-2"
                          dangerouslySetInnerHTML={{ 
                            __html: highlightText(
                              message.content?.replace(/<[^>]*>/g, '') || 'No content', 
                              q
                            ) 
                          }} 
                        />
                      </div>
                    </div>
                  </div>
                ))}
                {results.length > 15 && (
                  <div className="p-3 text-center border-t bg-muted/50">
                    <span className="text-xs text-muted-foreground">
                      Showing first 15 results. Refine your search for more specific results.
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-8 text-center">
                <MessageSquare className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
                <p className="text-sm font-medium mb-1">No messages found</p>
                <p className="text-xs text-muted-foreground">
                  Try adjusting your search terms or check spelling
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Overlay to close search when clicking outside */}
      {isExpanded && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setIsExpanded(false)}
        />
      )}
    </div>
  );
}


