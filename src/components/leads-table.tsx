'use client';

import React, { useState, useMemo, useEffect } from 'react';
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  VisibilityState,
} from '@tanstack/react-table';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Filter, Download, Upload, Trash2, Move, CheckCircle2, ChevronLeft, ChevronRight } from 'lucide-react';
import { Lead, useBdrManager } from '@/lib/hooks';
import { useBulkUpdateLeads, useBulkDeleteLeads, useBulkConvertLeads } from '@/lib/bulk-operations';
import { leadSourceEnum, leadStatusEnum } from '@/lib/validations';
import { toast } from 'sonner';
import { BulkPipelineDialog } from './bulk-pipeline-dialog';
import { LeadUpdatesDialog } from './lead-updates-dialog';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Skeleton } from '@/components/ui/skeleton';
import { AddBdrDialog } from '@/components/ui/add-bdr-dialog';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';

// Custom type for column meta data
interface ColumnMeta {
  priority: 'high' | 'medium' | 'low';
}

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  filters: Record<string, string>;
  total: number;
  pageCount: number;
  pageIndex: number;
  pageSize: number;
  onPaginationChange: (pageIndex: number, pageSize: number) => void;
  onGlobalFilterChange: (value: string) => void;
  onFilterChange: (columnId: string, value: string) => void;
  isLoading?: boolean;
  columnVisibility?: VisibilityState;
  onColumnVisibilityChange?: (state: VisibilityState) => void;
}

function TableSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 10 }).map((_, i) => (
        <div key={i} className="flex items-center space-x-4">
          <Skeleton className="h-4 w-4" />
          <Skeleton className="h-4 w-[200px]" />
          <Skeleton className="h-4 w-[150px]" />
          <Skeleton className="h-4 w-[100px]" />
          <Skeleton className="h-4 w-[120px]" />
        </div>
      ))}
    </div>
  );
}

export function LeadsTable<TData, TValue>({
  columns,
  data,
  filters,
  total,
  pageCount,
  pageIndex,
  pageSize,
  onPaginationChange,
  onGlobalFilterChange,
  onFilterChange,
  isLoading,
  columnVisibility,
  onColumnVisibilityChange,
}: DataTableProps<TData, TValue>) {
  const { bdrs, addBdr } = useBdrManager();
  const [rowSelection, setRowSelection] = useState({});
  const [showFilters, setShowFilters] = useState(false);
  const [bulkPipelineOpen, setBulkPipelineOpen] = useState(false);
  const bulkUpdateLeads = useBulkUpdateLeads();
  const bulkDeleteLeads = useBulkDeleteLeads();
  const bulkConvertLeads = useBulkConvertLeads();
  const [confirmOpen, setConfirmOpen] = useState(false);

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onRowSelectionChange: setRowSelection,
    onColumnVisibilityChange,
    state: {
      rowSelection,
      columnVisibility: columnVisibility || {},
    },
  });

  // Get selected rows (must be declared before effects that depend on it)
  const selectedRowIds = useMemo(() => Object.keys(rowSelection), [rowSelection]);
  const selectedRowData = useMemo(() => {
    return data.filter((_, index) => 
      selectedRowIds.includes(index.toString())
    ) as Lead[];
  }, [data, selectedRowIds]);
  const selectedRows = selectedRowData;

  // Keyboard shortcuts: / focus search, Del delete, Shift+P convert
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === '/' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        const el = document.getElementById('leads-search') as HTMLInputElement | null;
        el?.focus();
      }
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedRows.length > 0) {
        e.preventDefault();
        setConfirmOpen(true);
      }
      if (((e as any).key?.toLowerCase?.() === 'p' && (e.shiftKey || e.altKey)) && selectedRows.length > 0) {
        e.preventDefault();
        handleConvertAll();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selectedRows.length]);

  // Note: Virtualization removed to ensure consistent column layout and header alignment
  const tableContainerRef = React.useRef<HTMLDivElement | null>(null);

  function handleStatusChange(status: string) {
    if (selectedRows.length === 0) {
      toast.error('Please select at least one lead to update');
      return;
    }
    const selectedIds = selectedRows.map(row => row.id);
    const previousStatusById = new Map<number, string>(
      selectedRows.map(r => [r.id, r.status])
    );

    bulkUpdateLeads.mutate(
      { ids: selectedIds, status: status as any },
      {
        onSuccess: () => {
          setRowSelection({});
          toast.success(
            `Updated ${selectedRows.length} leads to ${status}`,
            {
              action: {
                label: 'Undo',
                onClick: () => {
                  const rollbackIds = Array.from(previousStatusById.keys());
                  // Apply rollback to previous per-lead status is not supported by the bulk API in one call if statuses differ;
                  // best effort: revert all to the first previous status
                  const firstPrev = previousStatusById.values().next().value as string;
                  bulkUpdateLeads.mutate({ ids: rollbackIds, status: firstPrev as any });
                },
              },
              duration: 4000,
            }
          );
        },
      }
    );
  }

  const handleBulkConvert = async () => {
    if (selectedRows.length === 0) {
      toast.error('Please select at least one lead to convert');
      return;
    }
    setBulkPipelineOpen(true);
  };

  const handleConvertAll = async () => {
    if (selectedRows.length === 0) {
      toast.error('Please select at least one lead to convert');
      return;
    }

    const selectedIds = selectedRows.map(row => row.id);
    bulkConvertLeads.mutate(
      { leadIds: selectedIds, category: 'Pipeline', status: 'Proposal - Media' },
      {
        onSuccess: () => {
          setRowSelection({});
          toast.success(`Converted ${selectedRows.length} leads to pipeline`);
        },
      }
    );
  };

  const handleBulkDelete = () => {
    if (selectedRows.length === 0) {
      toast.error('Please select at least one lead to delete');
      return;
    }
    setConfirmOpen(true);
  };

  const handleAddBdr = (newBdr: string) => {
    const success = addBdr(newBdr);
    if (success) {
      // Update the BDR filter if it's currently set
      if (filters.bdr && filters.bdr !== 'all') {
        onFilterChange('bdr', newBdr);
      }
    }
    return success;
  };

  // Render skeleton conditionally, but without changing hook order above
  const maybeSkeleton = isLoading ? <TableSkeleton /> : null;

  

  return (
    <div className="space-y-4">
      {/* Loading Skeleton */}
      {maybeSkeleton}

      {/* Bulk Actions */}
      {selectedRows.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              {selectedRows.length} Lead{selectedRows.length !== 1 ? 's' : ''} Selected
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              <Select onValueChange={handleStatusChange}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Update Status" />
                </SelectTrigger>
                <SelectContent>
                  {leadStatusEnum.map((status) => (
                    <SelectItem key={`bulk-${status}`} value={status}>
                      {status}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <BulkPipelineDialog 
                isOpen={bulkPipelineOpen}
                onClose={() => setBulkPipelineOpen(false)}
                selectedLeads={selectedRows.map(lead => ({
                  id: lead.id,
                  bdr: lead.bdr || null
                }))}
                onConvert={handleBulkConvert}
              />

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleConvertAll}
                    className="flex items-center gap-2"
                  >
                    <Move className="h-4 w-4" />
                    Convert All to Pipeline
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Convert all selected leads to pipeline with default settings</p>
                </TooltipContent>
              </Tooltip>

              <Button
                variant="destructive"
                size="sm"
                onClick={handleBulkDelete}
                className="flex items-center gap-2"
              >
                <Trash2 className="h-4 w-4" />
                Delete Selected
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Confirm bulk delete dialog */}
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Delete selected leads?"
        description={`This will permanently remove ${selectedRows.length} lead${selectedRows.length !== 1 ? 's' : ''}. This action cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={() => {
          const ids = selectedRows.map(r => r.id);
          const snapshot = [...selectedRows];
          bulkDeleteLeads.mutate(
            { ids },
            {
              onSuccess: () => {
                setConfirmOpen(false);
                setRowSelection({});
                toast.success(`Deleted ${snapshot.length} lead${snapshot.length !== 1 ? 's' : ''}`);
              },
            }
          );
        }}
      />

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between pb-16 sm:pb-0">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
          <div className="relative">
            <Input
              id="leads-search"
              placeholder="Search leads..."
              value={filters.search || ''}
              onChange={(e) => onGlobalFilterChange(e.target.value)}
              className="w-full sm:w-[300px]"
            />
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2"
          >
            <Filter className="h-4 w-4" />
            Filters
          </Button>
        </div>

        {showFilters && (
          <div className="flex flex-wrap gap-4 items-center">
            <Select
              value={filters.status || 'all'}
              onValueChange={(value) => onFilterChange('status', value)}
            >
              <SelectTrigger className="w-full min-w-[160px] max-w-[180px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {leadStatusEnum.map((status) => (
                  <SelectItem key={`filter-${status}`} value={status}>
                    {status}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={filters.source || 'all'}
              onValueChange={(value) => onFilterChange('source', value)}
            >
              <SelectTrigger className="w-full min-w-[160px] max-w-[180px]">
                <SelectValue placeholder="Source" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sources</SelectItem>
                {leadSourceEnum.map((source) => (
                  <SelectItem key={source} value={source}>
                    {source}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={filters.bdr || 'all'}
              onValueChange={(value) => onFilterChange('bdr', value)}
            >
              <SelectTrigger className="w-full min-w-[160px] max-w-[180px]">
                <SelectValue placeholder="BDR" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All BDRs</SelectItem>
                {bdrs.map((bdr) => (
                  <SelectItem key={bdr} value={bdr}>
                    {bdr}
                  </SelectItem>
                ))}
                <AddBdrDialog onAddBdr={handleAddBdr} />
              </SelectContent>
            </Select>
          </div>
        )}
      </div>
      
      <div className="max-h-[70vh] overflow-auto" ref={tableContainerRef}>
          <Table className="w-full">
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHead
                      key={header.id}
                      className="whitespace-nowrap px-4 text-foreground/80"
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    data-state={row.getIsSelected() && "selected"}
                    className="hover:bg-white/50 dark:hover:bg-white/5 transition-colors"
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id} className="px-4">
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className="h-24 text-center"
                  >
                    No results.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="text-sm text-muted-foreground">
          {selectedRows.length} of{" "}
          {table.getFilteredRowModel().rows.length} row(s) selected.
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-4">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium whitespace-nowrap">Rows per page</p>
            <Select
              value={`${table.getState().pagination.pageSize}`}
              onValueChange={(value) => {
                onPaginationChange(0, Number(value));
              }}
            >
              <SelectTrigger className="h-8 w-[70px]">
                <SelectValue placeholder={table.getState().pagination.pageSize} />
              </SelectTrigger>
              <SelectContent side="top">
                {[10, 20, 30, 40, 50].map((pageSize) => (
                  <SelectItem key={pageSize} value={`${pageSize}`}>
                    {pageSize}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center whitespace-nowrap text-sm font-medium">
            Page {pageIndex + 1} of {pageCount}
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              className="hidden h-8 w-8 p-0 sm:flex"
              onClick={() => onPaginationChange(0, pageSize)}
              disabled={pageIndex === 0}
            >
              <span className="sr-only">Go to first page</span>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              className="h-8 w-8 p-0"
              onClick={() => onPaginationChange(pageIndex - 1, pageSize)}
              disabled={pageIndex === 0}
            >
              <span className="sr-only">Go to previous page</span>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              className="h-8 w-8 p-0"
              onClick={() => onPaginationChange(pageIndex + 1, pageSize)}
              disabled={pageIndex === pageCount - 1}
            >
              <span className="sr-only">Go to next page</span>
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              className="hidden h-8 w-8 p-0 sm:flex"
              onClick={() => onPaginationChange(pageCount - 1, pageSize)}
              disabled={pageIndex === pageCount - 1}
            >
              <span className="sr-only">Go to last page</span>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Sticky bottom action bar for mobile when rows are selected */}
      {selectedRows.length > 0 && (
        <div className="sm:hidden fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="mx-auto max-w-screen-sm px-4 py-3">
            <div className="flex items-center justify-between gap-2">
              <div className="text-sm font-medium">
                {selectedRows.length} selected
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" onClick={() => setShowFilters(!showFilters)}>
                  <Filter className="h-4 w-4" />
                </Button>
                <Button size="sm" variant="outline" onClick={handleConvertAll}>
                  <Move className="h-4 w-4" />
                </Button>
                <Button size="sm" variant="destructive" onClick={handleBulkDelete}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Remove the duplicate BulkPipelineDialog */}
    </div>
  );
}

// Helper function to create a checkbox column
export function createSelectColumn<T>(): ColumnDef<T, any> {
  return {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && "indeterminate")
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  };
} 