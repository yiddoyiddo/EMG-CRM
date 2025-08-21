'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { LeadsTable } from '@/components/leads-table';
// import { KanbanView } from '@/components/kanban-view'; // Disabled - available for future restoration
import { useLeadColumns } from '@/components/lead-columns';
import { useLeads, useBdrManager } from '@/lib/hooks';
// import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'; // Disabled - available for future restoration
import { ErrorBoundary } from 'react-error-boundary';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
} from '@/components/ui/dropdown-menu';
import { Columns, Filter, Plus, Sparkles } from 'lucide-react';
import { leadSourceEnum, leadStatusEnum } from '@/lib/validations';
import { VisibilityState } from '@tanstack/react-table';
import { Lead } from '@/lib/hooks';
import { Navbar } from '@/components/ui/navbar';
import { AddBdrDialog } from '@/components/ui/add-bdr-dialog';
import { useRouter } from 'next/navigation';
import { LeadsSavedViews, LeadsView } from '@/components/leads-saved-views';
import { LeadDetailProvider } from '@/components/lead-detail-provider';

function ErrorFallback({ error, resetErrorBoundary }: { error: Error; resetErrorBoundary: () => void }) {
  return (
    <div className="rounded-lg bg-destructive/10 p-6 text-center">
      <h2 className="mb-2 text-lg font-semibold">Error loading leads</h2>
      <p className="mb-4 text-sm text-muted-foreground">{error.message}</p>
      <Button onClick={resetErrorBoundary}>Try again</Button>
    </div>
  );
}

function LeadsContent() {
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [globalFilter, setGlobalFilter] = useState('');
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  // Initialize to a fixed value to avoid hydration mismatch; read real value after mount
  const [beginnerMode, setBeginnerMode] = useState<boolean>(false);
  const resizeTimeout = useRef<NodeJS.Timeout | null>(null);
  const isUpdatingVisibility = useRef(false);
  const { bdrs, addBdr } = useBdrManager();
  const router = useRouter();

  const { data, isLoading, error } = useLeads({
    page: pageIndex + 1,
    pageSize,
    search: globalFilter || undefined,
    ...filters
  });

  const leads = data?.leads ?? [];
  const total = data?.total ?? 0;
  const pageCount = Math.ceil(total / pageSize);

  const columns = useLeadColumns();

  // Safe column visibility setter to prevent infinite loops
  const safeSetColumnVisibility = useCallback((newState: VisibilityState) => {
    if (isUpdatingVisibility.current) return;
    isUpdatingVisibility.current = true;
    
    setColumnVisibility(prev => {
      // Replace visibility entirely to ensure predictable layouts
      const updated = { ...newState };
      
      // Schedule a reset of the updating flag after this render cycle
      setTimeout(() => {
        isUpdatingVisibility.current = false;
      }, 0);
      
      return updated;
    });
  }, []);

  const handleAddBdr = (newBdr: string) => {
    const success = addBdr(newBdr);
    if (success) {
      // Update the BDR filter if it's currently set
      if (filters.bdr) {
        setFilters(prev => ({ ...prev, bdr: newBdr }));
      }
    }
    return success;
  };

  // Create a memoized function to update visibility based on screen size
  const updateColumnVisibility = useCallback(() => {
    // Get screen width
    const width = window.innerWidth;
    const newVisibility: VisibilityState = {};
    
    if (beginnerMode) {
      // Beginner: show only high priority columns on all screen sizes
      columns.forEach(column => {
        const colId = (column as any).id ?? (column as any).accessorKey;
        if (!colId) return;
        const priority = (column.meta as any)?.priority;
        newVisibility[colId] = priority === 'high';
      });
    } else if (width >= 1280) {
      // Advanced large screens: show all columns
      columns.forEach(column => {
        const colId = (column as any).id ?? (column as any).accessorKey;
        if (!colId) return;
        newVisibility[colId] = true;
      });
    } else if (width >= 768) {
      // Advanced medium screens: show high and medium
      columns.forEach(column => {
        const colId = (column as any).id ?? (column as any).accessorKey;
        if (!colId) return;
        const priority = (column.meta as any)?.priority;
        newVisibility[colId] = priority === 'high' || priority === 'medium';
      });
    } else {
      // Advanced small screens: show only high
      columns.forEach(column => {
        const colId = (column as any).id ?? (column as any).accessorKey;
        if (!colId) return;
        const priority = (column.meta as any)?.priority;
        newVisibility[colId] = priority === 'high';
      });
    }

    safeSetColumnVisibility(newVisibility);
  }, [columns, safeSetColumnVisibility, beginnerMode]);

  // Set default column visibility based on screen size and beginner mode
  useEffect(() => {
    // Initialize column visibility
    updateColumnVisibility();

    // Debounced resize handler to prevent excessive updates
    const handleResize = () => {
      if (resizeTimeout.current) {
        clearTimeout(resizeTimeout.current);
      }
      
      resizeTimeout.current = setTimeout(() => {
        updateColumnVisibility();
        resizeTimeout.current = null;
      }, 200); // 200ms debounce
    };

    // Add event listener
    window.addEventListener('resize', handleResize);
    
    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      if (resizeTimeout.current) {
        clearTimeout(resizeTimeout.current);
      }
    };
  }, [updateColumnVisibility]);

  // Read beginner mode from localStorage after mount to avoid hydration mismatch
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = window.localStorage.getItem('leads.beginnerMode');
      if (stored !== null) {
        setBeginnerMode(stored === 'true');
      } else {
        // Default to true if not set
        setBeginnerMode(true);
      }
    }
  }, []);

  // Persist beginner mode
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('leads.beginnerMode', beginnerMode ? 'true' : 'false');
    }
  }, [beginnerMode]);

  // Recompute column visibility when beginner mode toggles
  useEffect(() => {
    updateColumnVisibility();
  }, [beginnerMode, updateColumnVisibility]);

  const handlePaginationChange = (newPageIndex: number, newPageSize: number) => {
    setPageIndex(newPageIndex);
    setPageSize(newPageSize);
  };

  const handleGlobalFilterChange = (value: string) => {
    setGlobalFilter(value);
    setPageIndex(0);
  };

  const handleFilterChange = (columnId: string, value: string) => {
    setFilters(prev => {
      const newFilters = { ...prev };
      if (value === 'all') {
        delete newFilters[columnId];
      } else {
        newFilters[columnId] = value;
      }
      return newFilters;
    });
    setPageIndex(0);
  };

  const getActiveFilters = () => {
    const activeFilters = Object.entries(filters).map(([key, value]) => {
      const label = key.toUpperCase();
      return `${label}: ${value}`;
    });
    return activeFilters.length ? activeFilters.join(', ') : 'Filter';
  };

  // Handle column visibility changes from the dropdown
  const handleColumnVisibilityChange = useCallback((columnId: string, isVisible: boolean) => {
    safeSetColumnVisibility({
      ...columnVisibility,
      [columnId]: isVisible
    });
  }, [columnVisibility, safeSetColumnVisibility]);

  return (
    <LeadDetailProvider>
      <Navbar />
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex gap-2">
            <Button 
              onClick={() => router.push('/leads/new')}
              className="h-9"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add New Lead
            </Button>
            <Button
              variant={beginnerMode ? 'secondary' : 'outline'}
              className="h-9 px-3"
              onClick={() => setBeginnerMode((v) => !v)}
            >
              <Sparkles className="h-4 w-4 mr-2" />
              {beginnerMode ? 'Beginner Mode' : 'Advanced Mode'}
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="h-9 px-3">
                  <Columns className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">Columns</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel>Toggle Columns</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {columns.map((column) => {
                  // Skip checkbox column
                  if (column.id === 'select') return null;
                  
                  // Skip columns without IDs
                  if (!column.id) return null;
                  
                  // Get a readable header name
                  let headerName = column.id;
                  if (typeof column.header === 'string') {
                    headerName = column.header;
                  } else if (column.id) {
                    // Format the ID as readable text
                    headerName = column.id
                      .replace(/([A-Z])/g, ' $1') // Insert space before capital letters
                      .replace(/^./, str => str.toUpperCase()); // Capitalize first letter
                  }
                  
                  return (
                    <DropdownMenuCheckboxItem
                      key={column.id}
                      checked={!!columnVisibility[column.id]}
                      onCheckedChange={(checked) => {
                        handleColumnVisibilityChange(column.id!, checked);
                      }}
                      disabled={beginnerMode}
                    >
                      {headerName}
                    </DropdownMenuCheckboxItem>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="h-9 px-3">
                  <Filter className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">{getActiveFilters()}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel>Filter By</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  className={filters.status ? 'bg-muted' : ''}
                  onClick={() => setFilters(prev => {
                    const newFilters = { ...prev };
                    if (newFilters.status) {
                      delete newFilters.status;
                    } else {
                      newFilters.status = leadStatusEnum[0];
                    }
                    return newFilters;
                  })}
                >
                  Status {filters.status && '✓'}
                </DropdownMenuItem>
                <DropdownMenuItem 
                  className={filters.source ? 'bg-muted' : ''}
                  onClick={() => setFilters(prev => {
                    const newFilters = { ...prev };
                    if (newFilters.source) {
                      delete newFilters.source;
                    } else {
                      newFilters.source = leadSourceEnum[0];
                    }
                    return newFilters;
                  })}
                >
                  Source {filters.source && '✓'}
                </DropdownMenuItem>
                <DropdownMenuItem 
                  className={filters.bdr ? 'bg-muted' : ''}
                  onClick={() => setFilters(prev => {
                    const newFilters = { ...prev };
                    if (newFilters.bdr) {
                      delete newFilters.bdr;
                    } else {
                      newFilters.bdr = bdrs[0] || '';
                    }
                    return newFilters;
                  })}
                >
                  BDR {filters.bdr && '✓'}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <AddBdrDialog onAddBdr={handleAddBdr} />
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <LeadsSavedViews
            filters={filters}
            columnVisibility={columnVisibility as Record<string, boolean>}
            onApply={(view: LeadsView) => {
              setFilters(view.filters);
              safeSetColumnVisibility(view.columnVisibility as unknown as VisibilityState);
            }}
          />
        </div>
        {/* Enterprise control surface */}
        <div className="rounded-xl border border-white/30 dark:border-white/10 bg-white/60 dark:bg-white/[0.05] backdrop-blur p-3">
          <div className="text-sm text-muted-foreground">Use the search, filters and saved views to quickly segment leads.</div>
        </div>
        <LeadsTable
          data={leads}
          columns={columns}
          pageCount={pageCount}
          pageIndex={pageIndex}
          pageSize={pageSize}
          total={total}
          onPaginationChange={handlePaginationChange}
          onGlobalFilterChange={handleGlobalFilterChange}
          filters={filters}
          onFilterChange={handleFilterChange}
          isLoading={isLoading}
          columnVisibility={columnVisibility}
          onColumnVisibilityChange={safeSetColumnVisibility}
        />
      </div>
    </LeadDetailProvider>
  );
}

export default function LeadsPage() {
  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <LeadsContent />
    </ErrorBoundary>
  );
} 