'use client';

import React, { useState, useMemo, ReactNode } from 'react';
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  VisibilityState,
  Row,
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
import { Filter, ChevronLeft, ChevronRight } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

// Custom type for column meta data
interface ColumnMeta {
  priority: 'high' | 'medium' | 'low';
}

// Generic filter option interface
export interface FilterOption {
  value: string;
  label: string;
}

// Generic bulk action interface
export interface BulkAction<TData> {
  label: string;
  icon?: ReactNode;
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  onClick: (selectedRows: TData[]) => void;
  disabled?: (selectedRows: TData[]) => boolean;
}

// Generic filter config interface
export interface FilterConfig {
  key: string;
  label: string;
  options: FilterOption[];
  placeholder?: string;
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
  
  // Bulk operations
  enableRowSelection?: boolean;
  bulkActions?: BulkAction<TData>[];
  
  // Filtering
  filterConfigs?: FilterConfig[];
  searchPlaceholder?: string;
  
  // Customization
  title?: string;
  exportButton?: ReactNode;
  additionalActions?: ReactNode;
  emptyStateMessage?: string;
  
  // Custom row handling
  onRowClick?: (row: Row<TData>) => void;
  getRowId?: (row: TData) => string;
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

export function DataTable<TData, TValue>({
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
  enableRowSelection = false,
  bulkActions = [],
  filterConfigs = [],
  searchPlaceholder = "Search...",
  title,
  exportButton,
  additionalActions,
  emptyStateMessage = "No data available",
  onRowClick,
  getRowId,
}: DataTableProps<TData, TValue>) {
  const [rowSelection, setRowSelection] = useState({});
  const [showFilters, setShowFilters] = useState(false);

  // Add selection column if enabled
  const tableColumns = useMemo(() => {
    if (!enableRowSelection) return columns;
    
    const selectionColumn: ColumnDef<TData, TValue> = {
      id: "select",
      header: ({ table }) => (
        <Checkbox
          checked={table.getIsAllPageRowsSelected()}
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
    
    return [selectionColumn, ...columns];
  }, [columns, enableRowSelection]);

  const table = useReactTable({
    data,
    columns: tableColumns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onRowSelectionChange: enableRowSelection ? setRowSelection : undefined,
    onColumnVisibilityChange,
    getRowId: getRowId ? (row, index) => getRowId(row) : undefined,
    state: {
      rowSelection: enableRowSelection ? rowSelection : {},
      columnVisibility,
    },
  });

  // Get selected rows
  const selectedRowIds = useMemo(() => Object.keys(rowSelection), [rowSelection]);
  const selectedRowData = useMemo(() => {
    return data.filter((_, index) => 
      selectedRowIds.includes(index.toString())
    );
  }, [data, selectedRowIds]);

  if (isLoading) {
    return <TableSkeleton />;
  }

  return (
    <div className="space-y-4">
      {/* Header with Title and Actions */}
      {(title || exportButton || additionalActions) && (
        <div className="flex justify-between items-center">
          {title && <h2 className="text-xl font-semibold">{title}</h2>}
          <div className="flex items-center space-x-2">
            {exportButton}
            {additionalActions}
          </div>
        </div>
      )}

      {/* Bulk Actions */}
      {enableRowSelection && bulkActions.length > 0 && selectedRowData.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">
              Bulk Actions ({selectedRowData.length} selected)
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex flex-wrap gap-2">
              {bulkActions.map((action, index) => (
                <Button
                  key={index}
                  size="sm"
                  variant={action.variant || 'outline'}
                  onClick={() => action.onClick(selectedRowData)}
                  disabled={action.disabled ? action.disabled(selectedRowData) : false}
                >
                  {action.icon}
                  {action.label}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search and Filters */}
      <div className="flex flex-col space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 flex-1">
            <Input
              placeholder={searchPlaceholder}
              value={filters.search || ''}
              onChange={(event) => onGlobalFilterChange(event.target.value)}
              className="max-w-sm"
            />
            {filterConfigs.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
              >
                <Filter className="h-4 w-4 mr-2" />
                Filters
                {Object.values(filters).filter(Boolean).length > 0 && (
                  <Badge variant="secondary" className="ml-2 h-5 w-5 rounded-full p-0 text-xs">
                    {Object.values(filters).filter(Boolean).length}
                  </Badge>
                )}
              </Button>
            )}
          </div>
          <div className="text-sm text-muted-foreground">
            Showing {data.length} of {total} results
          </div>
        </div>

        {showFilters && filterConfigs.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 p-4 border rounded-lg bg-muted/20">
            {filterConfigs.map((config) => (
              <div key={config.key} className="space-y-2">
                <label className="text-sm font-medium">{config.label}</label>
                <Select
                  value={filters[config.key] || 'all'}
                  onValueChange={(value) => onFilterChange(config.key, value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={config.placeholder} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All {config.label}</SelectItem>
                    {config.options.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
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
                  className={onRowClick ? "cursor-pointer hover:bg-muted/50" : ""}
                  onClick={() => onRowClick && onRowClick(row)}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  {emptyStateMessage}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {pageCount > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Page {pageIndex + 1} of {pageCount}
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPaginationChange(Math.max(0, pageIndex - 1), pageSize)}
              disabled={pageIndex === 0}
            >
              <ChevronLeft className="h-4 w-4 mr-2" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPaginationChange(Math.min(pageCount - 1, pageIndex + 1), pageSize)}
              disabled={pageIndex >= pageCount - 1}
            >
              Next
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}