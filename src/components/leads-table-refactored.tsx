'use client';

import React, { useMemo } from 'react';
import { ColumnDef, VisibilityState } from '@tanstack/react-table';
import { Download, Upload, Trash2, Move, CheckCircle2 } from 'lucide-react';
import { Lead, useBdrManager } from '@/lib/hooks';
import { leadSourceEnum, leadStatusEnum } from '@/lib/validations';
import { toast } from 'sonner';
import { BulkPipelineDialog } from './bulk-pipeline-dialog';
import { LeadUpdatesDialog } from './lead-updates-dialog';
import { AddBdrDialog } from '@/components/ui/add-bdr-dialog';
import { DataTable, FilterConfig, BulkAction } from '@/components/ui/data-table';
import { 
  useBulkUpdateLeads, 
  useBulkDeleteLeads, 
  useBulkConvertLeads,
  createBulkStatusAction,
  createBulkDeleteAction,
  createBulkConvertAction 
} from '@/lib/bulk-operations';
import { useState } from 'react';
import { Button } from '@/components/ui/button';

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

export function LeadsTableRefactored<TData, TValue>({
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
}: DataTableProps<TData, TValue>) {
  const { bdrs, addBdr } = useBdrManager();
  const [bulkPipelineOpen, setBulkPipelineOpen] = useState(false);
  const [selectedRowsForDialog, setSelectedRowsForDialog] = useState<Lead[]>([]);

  // Bulk operation hooks
  const bulkUpdateLeads = useBulkUpdateLeads();
  const bulkDeleteLeads = useBulkDeleteLeads();
  const bulkConvertLeads = useBulkConvertLeads();

  // Filter configurations
  const filterConfigs: FilterConfig[] = useMemo(() => [
    {
      key: 'status',
      label: 'Status',
      options: leadStatusEnum.map(status => ({ value: status, label: status })),
      placeholder: 'All Statuses'
    },
    {
      key: 'source',
      label: 'Source',
      options: leadSourceEnum.map(source => ({ value: source, label: source })),
      placeholder: 'All Sources'
    },
    {
      key: 'bdr',
      label: 'BDR',
      options: bdrs.map(bdr => ({ value: bdr, label: bdr })),
      placeholder: 'All BDRs'
    }
  ], [bdrs]);

  // Bulk actions configuration
  const bulkActions: BulkAction<Lead>[] = useMemo(() => [
    {
      label: 'Mark as Fresh',
      icon: <CheckCircle2 className="h-4 w-4 mr-2" />,
      onClick: (selectedRows) => {
        const selectedIds = selectedRows.map(row => row.id);
        bulkUpdateLeads.mutate(
          { ids: selectedIds, status: 'Fresh' },
          {
            onSuccess: () => {
              toast.success(`Updated ${selectedRows.length} leads to Fresh`);
            },
          }
        );
      }
    },
    {
      label: 'Mark as Qualified',
      icon: <CheckCircle2 className="h-4 w-4 mr-2" />,
      onClick: (selectedRows) => {
        const selectedIds = selectedRows.map(row => row.id);
        bulkUpdateLeads.mutate(
          { ids: selectedIds, status: 'Qualified' },
          {
            onSuccess: () => {
              toast.success(`Updated ${selectedRows.length} leads to Qualified`);
            },
          }
        );
      }
    },
    {
      label: 'Convert to Pipeline',
      icon: <Move className="h-4 w-4 mr-2" />,
      onClick: (selectedRows) => {
        if (selectedRows.length === 0) {
          toast.error('Please select at least one lead to convert');
          return;
        }
        setSelectedRowsForDialog(selectedRows);
        setBulkPipelineOpen(true);
      }
    },
    {
      label: 'Convert All to Pipeline',
      icon: <Move className="h-4 w-4 mr-2" />,
      onClick: (selectedRows) => {
        const selectedIds = selectedRows.map(row => row.id);
        bulkConvertLeads.mutate(
          {
            leadIds: selectedIds,
            category: 'Pipeline',
            status: 'Proposal - Media',
          },
          {
            onSuccess: () => {
              toast.success(`Converted ${selectedRows.length} leads to pipeline`);
            },
          }
        );
      }
    },
    {
      label: 'Delete',
      icon: <Trash2 className="h-4 w-4 mr-2" />,
      variant: 'destructive' as const,
      onClick: (selectedRows) => {
        if (selectedRows.length === 0) {
          toast.error('Please select at least one lead to delete');
          return;
        }

        if (confirm(`Are you sure you want to delete ${selectedRows.length} leads?`)) {
          const selectedIds = selectedRows.map(row => row.id);
          bulkDeleteLeads.mutate(
            { ids: selectedIds },
            {
              onSuccess: () => {
                toast.success(`Deleted ${selectedRows.length} leads`);
              },
            }
          );
        }
      }
    }
  ], [bulkUpdateLeads, bulkDeleteLeads, bulkConvertLeads]);

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

  // Export functionality (placeholder - would need actual implementation)
  const exportButton = (
    <Button variant="outline" size="sm">
      <Download className="h-4 w-4 mr-2" />
      Export CSV
    </Button>
  );

  // Additional actions
  const additionalActions = (
    <div className="flex items-center space-x-2">
      <AddBdrDialog onAddBdr={handleAddBdr} />
      <LeadUpdatesDialog
        trigger={
          <Button variant="outline" size="sm">
            <Upload className="h-4 w-4 mr-2" />
            Import Updates
          </Button>
        }
      />
    </div>
  );

  return (
    <>
      <DataTable
        columns={columns}
        data={data}
        filters={filters}
        total={total}
        pageCount={pageCount}
        pageIndex={pageIndex}
        pageSize={pageSize}
        onPaginationChange={onPaginationChange}
        onGlobalFilterChange={onGlobalFilterChange}
        onFilterChange={onFilterChange}
        isLoading={isLoading}
        enableRowSelection={true}
        bulkActions={bulkActions}
        filterConfigs={filterConfigs}
        searchPlaceholder="Search leads..."
        title="Leads Management"
        exportButton={exportButton}
        additionalActions={additionalActions}
        emptyStateMessage="No leads found"
        virtualizeRows
        virtualRowEstimatedHeight={44}
      />

      <BulkPipelineDialog
        isOpen={bulkPipelineOpen}
        onClose={() => {
          setBulkPipelineOpen(false);
          setSelectedRowsForDialog([]);
        }}
        selectedLeads={selectedRowsForDialog}
      />
    </>
  );
}