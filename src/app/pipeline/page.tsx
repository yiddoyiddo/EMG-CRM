'use client';

import { Suspense, useState } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { Button } from '@/components/ui/button';
import { Navbar } from '@/components/ui/navbar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Users, RefreshCcw } from 'lucide-react';
// import { LayoutGrid, Table2 } from 'lucide-react'; // Disabled - available for future restoration
// import { PipelineBoard } from '@/components/pipeline-board'; // Disabled - available for future restoration
import { PipelineTable } from '@/components/pipeline-table';
import { usePipelineItems, useBdrManager } from '@/lib/hooks';
import { AddBdrDialog } from '@/components/ui/add-bdr-dialog';
import { useQueryClient } from '@tanstack/react-query';

// Define the BDR type for TypeScript
type BdrType = string;
// type ViewType = 'kanban' | 'table'; // Disabled - available for future restoration

function ErrorFallback({ error, resetErrorBoundary }: { error: Error; resetErrorBoundary: () => void }) {
  return (
    <div className="rounded-lg bg-destructive/10 p-6 text-center">
      <h2 className="mb-2 text-lg font-semibold">Error loading pipeline data</h2>
      <p className="mb-4 text-sm text-muted-foreground">{error.message}</p>
      <Button onClick={resetErrorBoundary}>Try again</Button>
    </div>
  );
}

function PipelineContent() {
  const { bdrs, addBdr } = useBdrManager();
  const [selectedBdr, setSelectedBdr] = useState<BdrType>(bdrs[0] || '');
  // const [viewType, setViewType] = useState<ViewType>('table'); // Disabled - available for future restoration
  const queryClient = useQueryClient();

  const { data, isLoading, refetch } = usePipelineItems({
    bdr: selectedBdr,
    page: 1,
    pageSize: 50,
  });

  const pipelineItems = data?.items ?? [];

  // Handle refresh of data
  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['pipeline'] });
  };

  const handleAddBdr = (newBdr: string) => {
    const success = addBdr(newBdr);
    if (success) {
      // Update the selected BDR to the newly added one
      setSelectedBdr(newBdr);
    }
    return success;
  };

  return (
    <>
      <Navbar />
      <div className="space-y-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Sales Pipeline</h1>
            <p className="text-muted-foreground">Track and manage your deals through the sales process</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center">
              <Users className="mr-2 h-4 w-4 text-muted-foreground" />
              <span className="mr-2 text-sm text-muted-foreground">BDR:</span>
            </div>
            <div className="flex gap-2">
              <Select 
                value={selectedBdr} 
                onValueChange={(value: BdrType) => setSelectedBdr(value)}
              >
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Select BDR" />
                </SelectTrigger>
                <SelectContent>
                  {bdrs.map((bdr) => (
                    <SelectItem key={bdr} value={bdr}>
                      {bdr}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <AddBdrDialog onAddBdr={handleAddBdr} />
            </div>
            <Button variant="outline" size="icon" onClick={handleRefresh} className="ml-2">
              <RefreshCcw className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <PipelineTable 
          items={pipelineItems} 
          onRefresh={handleRefresh}
          selectedBdr={selectedBdr}
        />
      </div>
    </>
  );
}

export default function PipelinePage() {
  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <Suspense>
        <PipelineContent />
      </Suspense>
    </ErrorBoundary>
  );
} 