'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

// Generic bulk operation hook
export function useBulkOperation<TData = any>(
  endpoint: string,
  method: 'PUT' | 'POST' | 'DELETE' = 'PUT',
  invalidateKeys: string[] = []
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error(`Failed to perform bulk operation: ${response.statusText}`);
      }

      return response.json();
    },
    onSuccess: () => {
      // Invalidate specified query keys
      invalidateKeys.forEach(key => {
        queryClient.invalidateQueries({ queryKey: [key] });
      });
    },
    onError: (error: Error) => {
      console.error('Bulk operation failed:', error);
      toast.error(error.message || 'Operation failed');
    },
  });
}

// Specific hooks for leads
export function useBulkUpdateLeads() {
  return useBulkOperation('/api/leads/bulk-update', 'PUT', ['leads']);
}

export function useBulkDeleteLeads() {
  return useBulkOperation('/api/leads/bulk-delete', 'DELETE', ['leads']);
}

export function useBulkConvertLeads() {
  return useBulkOperation('/api/pipeline/convert-all', 'POST', ['leads', 'pipeline']);
}

// Specific hooks for pipeline items
export function useBulkUpdatePipeline() {
  return useBulkOperation('/api/pipeline/bulk-update', 'PUT', ['pipeline']);
}

export function useBulkDeletePipeline() {
  return useBulkOperation('/api/pipeline/bulk-delete', 'DELETE', ['pipeline']);
}

// Helper functions for common bulk operations
export const createBulkStatusAction = (
  status: string,
  mutationHook: () => ReturnType<typeof useBulkOperation>
) => {
  return (selectedRows: any[]) => {
    if (selectedRows.length === 0) {
      toast.error('Please select at least one item to update');
      return;
    }

    const { mutate } = mutationHook();
    const selectedIds = selectedRows.map(row => row.id);
    
    mutate(
      { ids: selectedIds, status },
      {
        onSuccess: () => {
          toast.success(`Updated ${selectedRows.length} items to ${status}`);
        },
      }
    );
  };
};

export const createBulkDeleteAction = (
  mutationHook: () => ReturnType<typeof useBulkOperation>,
  itemType: string = 'items'
) => {
  return (selectedRows: any[]) => {
    if (selectedRows.length === 0) {
      toast.error(`Please select at least one ${itemType.slice(0, -1)} to delete`);
      return;
    }

    if (confirm(`Are you sure you want to delete ${selectedRows.length} ${itemType}?`)) {
      const { mutate } = mutationHook();
      const selectedIds = selectedRows.map(row => row.id);
      
      mutate(
        { ids: selectedIds },
        {
          onSuccess: () => {
            toast.success(`Deleted ${selectedRows.length} ${itemType}`);
          },
        }
      );
    }
  };
};

export const createBulkConvertAction = (
  mutationHook: () => ReturnType<typeof useBulkOperation>,
  defaultCategory: string = 'Pipeline',
  defaultStatus: string = 'Proposal - Media'
) => {
  return (selectedRows: any[]) => {
    if (selectedRows.length === 0) {
      toast.error('Please select at least one lead to convert');
      return;
    }

    const { mutate } = mutationHook();
    const selectedIds = selectedRows.map(row => row.id);
    
    mutate(
      {
        leadIds: selectedIds,
        category: defaultCategory,
        status: defaultStatus,
      },
      {
        onSuccess: () => {
          toast.success(`Converted ${selectedRows.length} leads to pipeline`);
        },
      }
    );
  };
};