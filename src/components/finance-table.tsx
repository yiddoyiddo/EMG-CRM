'use client';

import React, { useState, useMemo } from 'react';
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
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
import { 
  Filter, 
  Download, 
  Upload, 
  Trash2, 
  Edit, 
  ChevronLeft, 
  ChevronRight,
  Plus,
  LayoutGrid,
  List,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { financeStatusEnum, leadBdrEnum } from '@/lib/validations';
import { formatDateUK, getMonthName } from '@/lib/date-utils';
import { toast } from 'sonner';

interface FinanceEntry {
  id: number;
  company: string;
  bdr: string;
  leadGen: boolean;
  status: string;
  invoiceDate: Date | null;
  dueDate: Date | null;
  soldAmount: number | null;
  gbpAmount: number | null;
  exchangeRate: number | null;
  exchangeRateDate: Date | null;
  actualGbpReceived: number | null;
  notes: string | null;
  commissionPaid: boolean;
  month: string;
  createdAt: Date;
  updatedAt: Date;
}

interface FinanceTableProps {
  data?: FinanceEntry[];
  groupedData?: { [key: string]: FinanceEntry[] };
  isLoading: boolean;
  onEdit: (entry: FinanceEntry) => void;
  onDelete: (id: number) => void;
  onCreate: () => void;
  pagination?: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
  onPaginationChange?: (page: number, pageSize: number) => void;
  filters: {
    search: string;
    status: string;
    bdr: string;
    month?: string;
  };
  onFiltersChange: (filters: any) => void;
  viewMode: 'table' | 'groups';
  onViewModeChange: (mode: 'table' | 'groups') => void;
}

export function FinanceTable({
  data,
  groupedData,
  isLoading,
  onEdit,
  onDelete,
  onCreate,
  pagination,
  onPaginationChange,
  filters,
  onFiltersChange,
  viewMode,
  onViewModeChange,
}: FinanceTableProps) {
  const [selectedRows, setSelectedRows] = useState<number[]>([]);
  const [collapsedMonths, setCollapsedMonths] = useState<Set<string>>(new Set());

  const toggleMonthCollapse = (month: string) => {
    const newCollapsed = new Set(collapsedMonths);
    if (newCollapsed.has(month)) {
      newCollapsed.delete(month);
    } else {
      newCollapsed.add(month);
    }
    setCollapsedMonths(newCollapsed);
  };

  const calculateMonthSummary = (entries: FinanceEntry[]) => {
    const totalEntries = entries.length;
    const totalValue = entries.reduce((sum, entry) => sum + (entry.gbpAmount || 0), 0);
    const paidEntries = entries.filter(entry => entry.status === 'Paid').length;
    return { totalEntries, totalValue, paidEntries };
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'Paid':
        return 'default';
      case 'Cancelled':
        return 'destructive';
      case 'Late':
        return 'destructive';
      case 'Invoiced':
        return 'secondary';
      case 'Pending Clearance':
        return 'outline';
      default:
        return 'secondary';
    }
  };

  const columns: ColumnDef<FinanceEntry>[] = [
    {
      id: 'select',
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
    },
    {
      accessorKey: 'company',
      header: 'Company',
      cell: ({ row }) => (
        <div className="font-medium">{row.getValue('company')}</div>
      ),
    },
    {
      accessorKey: 'bdr',
      header: 'BDR',
      cell: ({ row }) => (
        <div className="text-sm">{row.getValue('bdr')}</div>
      ),
    },
    {
      accessorKey: 'month',
      header: 'Month',
      cell: ({ row }) => (
        <div className="text-sm">{getMonthName(row.getValue('month'))}</div>
      ),
    },
    {
      accessorKey: 'leadGen',
      header: 'Lead Gen',
      cell: ({ row }) => (
        <div className="text-center">
          {row.getValue('leadGen') ? '✓' : '✗'}
        </div>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => (
        <Badge variant={getStatusBadgeVariant(row.getValue('status'))}>
          {row.getValue('status')}
        </Badge>
      ),
    },
    {
      accessorKey: 'invoiceDate',
      header: 'Invoice Date',
      cell: ({ row }) => {
        const date = row.getValue('invoiceDate') as Date | null;
        return formatDateUK(date);
      },
    },
    {
      accessorKey: 'dueDate',
      header: 'Due Date',
      cell: ({ row }) => {
        const date = row.getValue('dueDate') as Date | null;
        return formatDateUK(date);
      },
    },
    {
      accessorKey: 'soldAmount',
      header: 'Sold Amount',
      cell: ({ row }) => {
        const amount = row.getValue('soldAmount') as number | null;
        return amount ? `$${amount.toLocaleString()}` : '-';
      },
    },
    {
      accessorKey: 'gbpAmount',
      header: 'GBP Amount',
      cell: ({ row }) => {
        const amount = row.getValue('gbpAmount') as number | null;
        const exchangeRate = row.getValue('exchangeRate') as number | null;
        const exchangeRateDate = row.getValue('exchangeRateDate') as Date | null;
        
        if (!amount) return '-';
        
        return (
          <div className="space-y-1">
            <div className="font-medium">£{amount.toLocaleString()}</div>
            {exchangeRate && (
              <div className="text-xs text-gray-500">
                Rate: $1 = £{exchangeRate.toFixed(4)}
                {exchangeRateDate && (
                  <span className="ml-1">
                    ({new Date(exchangeRateDate).toLocaleDateString()})
                  </span>
                )}
              </div>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: 'actualGbpReceived',
      header: 'Actual GBP Received',
      cell: ({ row }) => {
        const amount = row.getValue('actualGbpReceived') as number | null;
        return amount ? `£${amount.toLocaleString()}` : '-';
      },
    },
    {
      accessorKey: 'commissionPaid',
      header: 'Commission Paid',
      cell: ({ row }) => (
        <div className="text-center">
          {row.getValue('commissionPaid') ? '✓' : '✗'}
        </div>
      ),
    },
    {
      accessorKey: 'notes',
      header: 'Notes',
      cell: ({ row }) => {
        const notes = row.getValue('notes') as string | null;
        return notes ? (
          <div className="max-w-[200px] truncate" title={notes}>
            {notes}
          </div>
        ) : '-';
      },
    },
    {
      id: 'actions',
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onEdit(row.original)}
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              if (confirm('Are you sure you want to delete this entry?')) {
                onDelete(row.original.id);
              }
            }}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  const table = useReactTable({
    data: data || [],
    columns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const renderMonthlyGroups = () => {
    if (!groupedData) return null;

    const sortedMonths = Object.keys(groupedData).sort((a, b) => b.localeCompare(a));

    return (
      <div className="space-y-4">
        {sortedMonths.map((month) => {
          const entries = groupedData[month];
          const isCollapsed = collapsedMonths.has(month);
          const summary = calculateMonthSummary(entries);

          return (
            <Card key={month} className="overflow-hidden">
              <div
                className="flex items-center justify-between p-4 bg-muted/50 cursor-pointer hover:bg-muted/70 transition-colors"
                onClick={() => toggleMonthCollapse(month)}
              >
                <div className="flex items-center space-x-3">
                  {isCollapsed ? (
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-muted-foreground" />
                  )}
                  <div>
                    <h3 className="text-lg font-semibold text-primary">
                      {getMonthName(month)}
                    </h3>
                    <div className="flex items-center space-x-4 text-sm text-muted-foreground mt-1">
                      <span>{summary.totalEntries} entries</span>
                      <span>£{summary.totalValue.toLocaleString()}</span>
                      <span>{summary.paidEntries} paid</span>
                    </div>
                  </div>
                </div>
                <Badge variant="outline" className="ml-2">
                  {entries.length}
                </Badge>
              </div>
              
              {!isCollapsed && (
                <div className="border-t">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/20">
                        <TableHead className="w-[50px]">
                          <Checkbox
                            checked={entries.every(entry => selectedRows.includes(entry.id))}
                            onCheckedChange={(value) => {
                              if (value) {
                                setSelectedRows(prev => [...new Set([...prev, ...entries.map(e => e.id)])]);
                              } else {
                                setSelectedRows(prev => prev.filter(id => !entries.map(e => e.id).includes(id)));
                              }
                            }}
                          />
                        </TableHead>
                        <TableHead>Company</TableHead>
                        <TableHead>BDR</TableHead>
                        <TableHead>Lead Gen</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Invoice Date</TableHead>
                        <TableHead>Due Date</TableHead>
                        <TableHead>Sold Amount</TableHead>
                        <TableHead>GBP Amount</TableHead>
                        <TableHead>Actual GBP</TableHead>
                        <TableHead>Commission</TableHead>
                        <TableHead>Notes</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {entries.map((entry) => (
                        <TableRow key={entry.id} className="hover:bg-muted/30">
                          <TableCell>
                            <Checkbox
                              checked={selectedRows.includes(entry.id)}
                              onCheckedChange={(value) => {
                                if (value) {
                                  setSelectedRows(prev => [...prev, entry.id]);
                                } else {
                                  setSelectedRows(prev => prev.filter(id => id !== entry.id));
                                }
                              }}
                            />
                          </TableCell>
                          <TableCell className="font-medium">{entry.company}</TableCell>
                          <TableCell>{entry.bdr}</TableCell>
                          <TableCell className="text-center">
                            {entry.leadGen ? '✓' : '✗'}
                          </TableCell>
                          <TableCell>
                            <Badge variant={getStatusBadgeVariant(entry.status)}>
                              {entry.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {formatDateUK(entry.invoiceDate)}
                          </TableCell>
                          <TableCell>
                            {formatDateUK(entry.dueDate)}
                          </TableCell>
                          <TableCell>
                            {entry.soldAmount ? `$${entry.soldAmount.toLocaleString()}` : '-'}
                          </TableCell>
                          <TableCell>
                            {entry.gbpAmount ? (
                              <div className="space-y-1">
                                <div className="font-medium">£{entry.gbpAmount.toLocaleString()}</div>
                                {entry.exchangeRate && (
                                  <div className="text-xs text-gray-500">
                                    Rate: $1 = £{entry.exchangeRate.toFixed(4)}
                                    {entry.exchangeRateDate && (
                                      <span className="ml-1">
                                        ({new Date(entry.exchangeRateDate).toLocaleDateString()})
                                      </span>
                                    )}
                                  </div>
                                )}
                              </div>
                            ) : '-'}
                          </TableCell>
                          <TableCell>
                            {entry.actualGbpReceived ? `£${entry.actualGbpReceived.toLocaleString()}` : '-'}
                          </TableCell>
                          <TableCell className="text-center">
                            {entry.commissionPaid ? '✓' : '✗'}
                          </TableCell>
                          <TableCell>
                            {entry.notes ? (
                              <div className="max-w-[200px] truncate" title={entry.notes}>
                                {entry.notes}
                              </div>
                            ) : '-'}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => onEdit(entry)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  if (confirm('Are you sure you want to delete this entry?')) {
                                    onDelete(entry.id);
                                  }
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </Card>
          );
        })}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Filters and Actions */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle>Finance Board</CardTitle>
            <div className="flex items-center gap-2">
              <div className="flex items-center border rounded-md">
                <Button
                  variant={viewMode === 'table' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => onViewModeChange('table')}
                  className="rounded-r-none"
                >
                  <List className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === 'groups' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => onViewModeChange('groups')}
                  className="rounded-l-none"
                >
                  <LayoutGrid className="h-4 w-4" />
                </Button>
              </div>
              <Button onClick={onCreate}>
                <Plus className="h-4 w-4 mr-2" />
                New Entry
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 mb-4">
            <div className="flex-1">
              <Input
                placeholder="Search companies, BDRs, or notes..."
                value={filters.search}
                onChange={(e) =>
                  onFiltersChange({ ...filters, search: e.target.value })
                }
                className="max-w-sm"
              />
            </div>
            <Select
              value={filters.status}
              onValueChange={(value) =>
                onFiltersChange({ ...filters, status: value === 'all' ? '' : value })
              }
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {financeStatusEnum.map((status) => (
                  <SelectItem key={status} value={status}>
                    {status}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={filters.bdr}
              onValueChange={(value) =>
                onFiltersChange({ ...filters, bdr: value === 'all' ? '' : value })
              }
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by BDR" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All BDRs</SelectItem>
                {leadBdrEnum.map((bdr) => (
                  <SelectItem key={bdr} value={bdr}>
                    {bdr}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {viewMode === 'table' && (
              <Select
                value={filters.month || 'all'}
                onValueChange={(value) =>
                  onFiltersChange({ ...filters, month: value === 'all' ? '' : value })
                }
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by month" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Months</SelectItem>
                  <SelectItem value="2025-01">January 2025</SelectItem>
                  <SelectItem value="2025-02">February 2025</SelectItem>
                  <SelectItem value="2025-03">March 2025</SelectItem>
                  <SelectItem value="2025-04">April 2025</SelectItem>
                  <SelectItem value="2025-05">May 2025</SelectItem>
                  <SelectItem value="2025-06">June 2025</SelectItem>
                  <SelectItem value="2025-07">July 2025</SelectItem>
                  <SelectItem value="2025-08">August 2025</SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <div className="text-center">Loading...</div>
            </div>
          ) : viewMode === 'groups' ? (
            renderMonthlyGroups()
          ) : (
            <>
              {/* Table View */}
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
                          data-state={row.getIsSelected() && 'selected'}
                        >
                          {row.getVisibleCells().map((cell) => (
                            <TableCell key={cell.id}>
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
                          No finance entries found.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination - only show for table view */}
              {pagination && onPaginationChange && (
                <div className="flex items-center justify-between space-x-2 py-4">
                  <div className="text-sm text-muted-foreground">
                    Showing {(pagination.page - 1) * pagination.pageSize + 1} to{' '}
                    {Math.min(pagination.page * pagination.pageSize, pagination.total)} of{' '}
                    {pagination.total} entries
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onPaginationChange(pagination.page - 1, pagination.pageSize)}
                      disabled={pagination.page <= 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Previous
                    </Button>
                    <span className="text-sm">
                      Page {pagination.page} of {pagination.totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onPaginationChange(pagination.page + 1, pagination.pageSize)}
                      disabled={pagination.page >= pagination.totalPages}
                    >
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}