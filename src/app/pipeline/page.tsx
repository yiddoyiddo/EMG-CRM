'use client';

import { Suspense, useEffect, useState } from 'react';
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
import { Users, RefreshCcw, LayoutGrid, Table2, HelpCircle, Sparkles } from 'lucide-react';
import { PipelineBoardEnhanced } from '@/components/pipeline-board-enhanced';
import { PipelineTable } from '@/components/pipeline-table';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { usePipelineItems, useBdrManager } from '@/lib/hooks';
import { AddBdrDialog } from '@/components/ui/add-bdr-dialog';
import { useQueryClient } from '@tanstack/react-query';

// Define the BDR type for TypeScript
type BdrType = string;
type ViewType = 'board' | 'table';

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
  const [viewType, setViewType] = useState<ViewType>('board');
  const queryClient = useQueryClient();

  const { data, isLoading, refetch } = usePipelineItems({
    bdr: selectedBdr,
    page: 1,
    pageSize: 50,
  });

  const pipelineItems = data?.items ?? [];

  // Handle refresh of data
  const handleRefresh = () => {
    // Invalidate all pipeline queries regardless of filters
    queryClient.invalidateQueries({ 
      predicate: (query) => {
        return Array.isArray(query.queryKey) && query.queryKey[0] === 'pipeline';
      }
    });
  };

  const handleAddBdr = (newBdr: string) => {
    const success = addBdr(newBdr);
    if (success) {
      // Update the selected BDR to the newly added one
      setSelectedBdr(newBdr);
    }
    return success;
  };

  // Simple Mode for non-technical BDRs - start with default to avoid hydration mismatch
  const [simpleMode, setSimpleMode] = useState<boolean>(true);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    // Load from localStorage only after component mounts
    setIsMounted(true);
    const stored = window.localStorage.getItem('pipeline.simpleMode');
    if (stored) {
      setSimpleMode(stored === 'true');
    }
  }, []);

  useEffect(() => {
    // Save to localStorage when simpleMode changes (but only after initial mount)
    if (isMounted) {
      window.localStorage.setItem('pipeline.simpleMode', simpleMode ? 'true' : 'false');
    }
  }, [simpleMode, isMounted]);

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
            {/* View Toggle */}
            <div className="flex items-center rounded-lg border border-white/30 dark:border-white/10 bg-white/60 dark:bg-white/[0.05] backdrop-blur">
              <Button
                variant={viewType === 'board' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewType('board')}
                className="rounded-r-none"
              >
                <LayoutGrid className="h-4 w-4 mr-1" />
                Board
              </Button>
              <Button
                variant={viewType === 'table' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewType('table')}
                className="rounded-l-none"
              >
                <Table2 className="h-4 w-4 mr-1" />
                Table
              </Button>
            </div>

            {/* Simple Mode Toggle */}
            <Button
              variant={simpleMode ? 'secondary' : 'outline'}
              size="sm"
              onClick={() => setSimpleMode(v => !v)}
              className="h-9"
              title="Toggle a simplified, guided interface"
            >
              <Sparkles className="h-4 w-4 mr-1" />
              {simpleMode ? 'Simple Mode' : 'Advanced Mode'}
            </Button>
            
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

            {/* Help */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="icon" className="ml-1" title="Quick help">
                  <HelpCircle className="h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent side="bottom" align="end" className="w-80">
                <div className="space-y-2 text-sm">
                  <p className="font-medium">How to use the Pipeline</p>
                  <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                    <li>Select your name in BDR.</li>
                    <li>Click Add Lead to create a new prospect.</li>
                    <li>Use Status to move items forward (Board or Table).</li>
                    <li>Click Updates to jot quick notes after each call.</li>
                  </ol>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {viewType === 'board' ? (
          <PipelineBoardEnhanced
            items={pipelineItems}
            isLoading={isLoading}
            selectedBdr={selectedBdr}
            simpleMode={simpleMode}
            onRefresh={handleRefresh}
          />
        ) : (
          <PipelineTable 
            items={pipelineItems} 
            onRefresh={handleRefresh}
            selectedBdr={selectedBdr}
            simpleMode={simpleMode}
          />
        )}
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