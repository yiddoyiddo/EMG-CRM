'use client';

import { useState, useEffect } from 'react';
import { EditorialBoardTable, type EditorialBoardItem } from '@/components/editorial-board-table';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { RefreshCw, Download } from 'lucide-react';
import { useEditorialItems, useAutoSyncFromPipeline } from '@/lib/editorial-hooks';

interface BdrOption {
  id: string;
  name: string;
}

export default function EditorialPage() {
  const { data: session } = useSession();
  const [selectedBdr, setSelectedBdr] = useState<string>('all');
  const [availableBdrs, setAvailableBdrs] = useState<BdrOption[]>([]);

  // Use the custom hook for fetching editorial items
  const { 
    data: editorialData, 
    isLoading, 
    refetch: refetchItems 
  } = useEditorialItems({
    bdr: selectedBdr === 'all' ? undefined : selectedBdr,
  });

  const { mutate: autoSync, isPending: isAutoSyncing } = useAutoSyncFromPipeline();

  const fetchBdrs = async () => {
    try {
      const response = await fetch('/api/users');
      if (!response.ok) {
        // If we don't have permission to fetch users, just continue without BDR filtering
        if (response.status === 403) {
          console.warn('No permission to fetch users for BDR filtering');
          return;
        }
        throw new Error('Failed to fetch users');
      }
      
      const data = await response.json();
      // Handle both response formats (data.users or users)
      const users = data.data?.users || data.users || [];
      const bdrs = users
        ?.filter((user: any) => ['BDR', 'TEAM_LEAD', 'MANAGER', 'DIRECTOR', 'ADMIN'].includes(user.role))
        ?.map((user: any) => ({
          id: user.id,
          name: user.name || user.email,
        })) || [];
      
      setAvailableBdrs(bdrs);
    } catch (error) {
      console.error('Error fetching BDRs:', error);
      // Continue without BDR filtering if this fails
    }
  };

  useEffect(() => {
    if (session) {
      fetchBdrs();
    }
  }, [session]);

  const handleBdrChange = (bdr: string) => {
    setSelectedBdr(bdr);
  };

  const handleRefresh = () => {
    refetchItems();
  };

  const handleAutoSync = () => {
    autoSync();
  };

  if (!session) {
    return (
      <div className="container py-10">
        <div className="text-center">
          <p>Please log in to access the editorial board.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-6 space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Editorial Board</h1>
          <p className="text-muted-foreground mt-2">
            Manage leads for list out, Q&A, and interview opportunities with your production team.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleRefresh}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            onClick={handleAutoSync}
            disabled={isAutoSyncing}
            className="bg-purple-600 hover:bg-purple-700"
          >
            <Download className={`h-4 w-4 mr-2 ${isAutoSyncing ? 'animate-pulse' : ''}`} />
            Auto-Sync from Pipeline
          </Button>
        </div>
      </div>

      <EditorialBoardTable
        items={editorialData?.items || []}
        isLoading={isLoading}
        onRefresh={handleRefresh}
        selectedBdr={selectedBdr === 'all' ? undefined : selectedBdr}
        onBdrChange={handleBdrChange}
        availableBdrs={availableBdrs}
      />
    </div>
  );
}