'use client';

import React, { useState, useMemo } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { Filter, ExternalLink, MessageSquare, Move, Clock, Plus, Trash2 } from 'lucide-react';
import { PipelineItem, useMovePipelineItem, useDeletePipelineItem } from '@/lib/hooks';
import { pipelineCategoryEnum, allPipelineStatusValues } from '@/lib/validations';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { UpdatesDialog } from '@/components/updates-dialog';
import { SublistDialog } from '@/components/sublist-dialog';
import { PipelineDialog } from '@/components/pipeline-dialog';
import { DataTable, FilterConfig, BulkAction } from '@/components/ui/data-table';
import { useBulkUpdatePipeline, useBulkDeletePipeline } from '@/lib/bulk-operations';
import { Button } from '@/components/ui/button';

interface PipelineTableProps {
  items: PipelineItem[];
  onRefresh?: () => void;
  selectedBdr?: string;
}

export function PipelineTableRefactored({ items, onRefresh, selectedBdr }: PipelineTableProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const router = useRouter();
  const { mutate: movePipelineItem } = useMovePipelineItem();
  const { mutate: deletePipelineItem } = useDeletePipelineItem();
  
  // Bulk operation hooks
  const bulkUpdatePipeline = useBulkUpdatePipeline();
  const bulkDeletePipeline = useBulkDeletePipeline();

  // Filter configurations
  const filterConfigs: FilterConfig[] = useMemo(() => [
    {
      key: 'category',
      label: 'Category',
      options: pipelineCategoryEnum.map(category => ({ 
        value: category, 
        label: category.replace('_', ' ') 
      })),
      placeholder: 'All Categories'
    },
    {
      key: 'status',
      label: 'Status',
      options: allPipelineStatusValues.map(status => ({ value: status, label: status })),
      placeholder: 'All Statuses'
    },
    {
      key: 'bdr',
      label: 'BDR',
      options: [...new Set(items.map(item => item.bdr).filter(Boolean))].map(bdr => ({ 
        value: bdr, 
        label: bdr 
      })),
      placeholder: 'All BDRs'
    }
  ], [items]);

  // Bulk actions configuration
  const bulkActions: BulkAction<PipelineItem>[] = useMemo(() => [
    {
      label: 'Move to Pipeline',
      icon: <Move className="h-4 w-4 mr-2" />,
      onClick: (selectedRows) => {
        // For simplicity, move all to a default Pipeline status
        // In a real implementation, you'd want a dialog to select target status
        const selectedIds = selectedRows.map(row => row.id);
        selectedRows.forEach(item => {
          movePipelineItem({
            id: item.id,
            newCategory: 'Pipeline',
            newStatus: 'Proposal - Media'
          }, {
            onSuccess: () => {
              toast.success(`Moved ${selectedRows.length} items to Pipeline`);
              onRefresh?.();
            },
            onError: () => {
              toast.error('Failed to move items');
            }
          });
        });
      }
    },
    {
      label: 'Delete Selected',
      icon: <Trash2 className="h-4 w-4 mr-2" />,
      variant: 'destructive' as const,
      onClick: (selectedRows) => {
        if (selectedRows.length === 0) {
          toast.error('Please select at least one item to delete');
          return;
        }

        if (confirm(`Are you sure you want to delete ${selectedRows.length} pipeline items? This action cannot be undone.`)) {
          selectedRows.forEach(item => {
            deletePipelineItem(item.id, {
              onSuccess: () => {
                toast.success('Pipeline items deleted successfully');
                onRefresh?.();
              },
              onError: () => {
                toast.error('Failed to delete pipeline items');
              }
            });
          });
        }
      }
    }
  ], [movePipelineItem, deletePipelineItem, onRefresh]);

  // Filter items based on search query
  const filteredItems = useMemo(() => {
    if (!searchQuery) return items;
    
    return items.filter(item => 
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.company?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.bdr?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.email?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [items, searchQuery]);

  // Convert to flat table data (this loses the hierarchical structure)
  // For a full implementation, you'd need custom row rendering in DataTable
  const tableData = useMemo(() => {
    const flattenItems = (items: PipelineItem[], level = 0): (PipelineItem & { level: number })[] => {
      const result: (PipelineItem & { level: number })[] = [];
      
      items.forEach(item => {
        result.push({ ...item, level });
        if (item.children && item.children.length > 0) {
          result.push(...flattenItems(item.children, level + 1));
        }
      });
      
      return result;
    };
    
    return flattenItems(filteredItems);
  }, [filteredItems]);

  // Mock pagination props (in real implementation, these would come from parent)
  const mockFilters = {
    search: searchQuery,
    category: 'all',
    status: 'all',
    bdr: 'all'
  };

  const handleRowClick = (row: any) => {
    router.push(`/pipeline/${row.original.id}`);
  };

  // Additional actions
  const additionalActions = (
    <PipelineDialog
      title="Add New Lead"
      buttonLabel="Add New Lead"
      buttonVariant="default"
      buttonIcon={true}
      defaultCategory="Pipeline"
      defaultStatus="New"
      defaultBdr={selectedBdr}
      onSuccess={onRefresh}
      className="shadow-lg"
    />
  );

  // Create mock columns for demonstration
  // In a real implementation, you'd define proper columns with all the pipeline-specific functionality
  const columns: ColumnDef<PipelineItem & { level: number }>[] = useMemo(() => [
    {
      accessorKey: 'name',
      header: 'Name',
      cell: ({ row }) => (
        <div style={{ paddingLeft: `${row.original.level * 20}px` }} className="flex items-center gap-2">
          <span>{row.original.name}</span>
          {row.original.company && (
            <span className="text-sm text-muted-foreground">({row.original.company})</span>
          )}
        </div>
      ),
    },
    {
      accessorKey: 'category',
      header: 'Category',
      cell: ({ row }) => row.original.category.replace('_', ' '),
    },
    {
      accessorKey: 'status',
      header: 'Status',
    },
    {
      accessorKey: 'bdr',
      header: 'BDR',
    },
    {
      accessorKey: 'value',
      header: 'Value',
      cell: ({ row }) => row.original.value ? `£${row.original.value.toLocaleString()}` : '-',
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => (
        <div className="flex items-center space-x-1" onClick={e => e.stopPropagation()}>
          <UpdatesDialog 
            pipelineItem={row.original}
            trigger={
              <Button 
                variant="outline" 
                size="sm" 
                className="h-6 px-2 text-xs"
              >
                <MessageSquare className="h-3 w-3 mr-1" />
                Updates
              </Button>
            }
          />
          <Button 
            variant="outline" 
            size="sm" 
            className="h-6 px-2 text-xs"
            onClick={(e) => {
              e.stopPropagation();
              // Handle move action - in real implementation, this would open a move dialog
              console.log('Move item:', row.original);
            }}
          >
            <Move className="h-3 w-3 mr-1" />
            Move
          </Button>
        </div>
      ),
    },
  ], []);

  return (
    <div className="space-y-4">
      <DataTable
        columns={columns}
        data={tableData}
        filters={mockFilters}
        total={tableData.length}
        pageCount={1}
        pageIndex={0}
        pageSize={50}
        onPaginationChange={() => {}}
        onGlobalFilterChange={setSearchQuery}
        onFilterChange={() => {}}
        isLoading={false}
        enableRowSelection={true}
        bulkActions={bulkActions}
        filterConfigs={filterConfigs}
        searchPlaceholder="Search pipeline..."
        title="Pipeline Management"
        additionalActions={additionalActions}
        emptyStateMessage="No pipeline items found"
        onRowClick={handleRowClick}
        getRowId={(row) => row.id.toString()}
      />
      
      <div className="text-sm text-muted-foreground">
        Note: This refactored version shows a flattened view. The original hierarchical structure 
        with expandable sublists would require custom row rendering in the DataTable component.
      </div>
    </div>
  );
}