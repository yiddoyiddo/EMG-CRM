'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

// Generic API mutation hook
export function useApiMutation<TData = any, TVariables = any>(
  endpoint: string,
  method: 'POST' | 'PUT' | 'DELETE' = 'POST',
  options: {
    invalidateKeys?: string[];
    successMessage?: string;
    errorMessage?: string;
    onSuccess?: (data: TData) => void;
    onError?: (error: Error) => void;
  } = {}
) {
  const queryClient = useQueryClient();

  return useMutation<TData, Error, TVariables>({
    mutationFn: async (variables: TVariables) => {
      const response = await fetch(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: method !== 'DELETE' ? JSON.stringify(variables) : undefined,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return response.json();
    },
    onSuccess: (data) => {
      // Invalidate specified query keys
      if (options.invalidateKeys) {
        options.invalidateKeys.forEach(key => {
          queryClient.invalidateQueries({ queryKey: [key] });
        });
      }

      // Show success message
      if (options.successMessage) {
        toast.success(options.successMessage);
      }

      // Call custom success handler
      options.onSuccess?.(data);
    },
    onError: (error) => {
      console.error('API mutation failed:', error);
      
      // Show error message
      const errorMessage = options.errorMessage || error.message || 'Operation failed';
      toast.error(errorMessage);

      // Call custom error handler
      options.onError?.(error);
    },
  });
}

// Specialized hooks for common operations

// Lead operations
export function useCreateLead() {
  return useApiMutation('/api/leads', 'POST', {
    invalidateKeys: ['leads'],
    successMessage: 'Lead created successfully',
    errorMessage: 'Failed to create lead',
  });
}

export function useUpdateLead() {
  return useApiMutation<any, { id: number; [key: string]: any }>(
    '', // Dynamic endpoint
    'PUT',
    {
      invalidateKeys: ['leads', 'lead'],
      successMessage: 'Lead updated successfully',
      errorMessage: 'Failed to update lead',
    }
  );
}

export function useDeleteLead() {
  return useApiMutation<any, { id: number }>(
    '', // Dynamic endpoint
    'DELETE',
    {
      invalidateKeys: ['leads'],
      successMessage: 'Lead deleted successfully',
      errorMessage: 'Failed to delete lead',
    }
  );
}

// Pipeline operations
export function useCreatePipelineItem() {
  return useApiMutation('/api/pipeline', 'POST', {
    invalidateKeys: ['pipeline'],
    successMessage: 'Pipeline item created successfully',
    errorMessage: 'Failed to create pipeline item',
  });
}

export function useUpdatePipelineItem() {
  return useApiMutation<any, { id: number; [key: string]: any }>(
    '', // Dynamic endpoint
    'PUT',
    {
      invalidateKeys: ['pipeline', 'pipelineItem'],
      successMessage: 'Pipeline item updated successfully',
      errorMessage: 'Failed to update pipeline item',
    }
  );
}

export function useDeletePipelineItem() {
  return useApiMutation<any, { id: number }>(
    '', // Dynamic endpoint
    'DELETE',
    {
      invalidateKeys: ['pipeline'],
      successMessage: 'Pipeline item deleted successfully',
      errorMessage: 'Failed to delete pipeline item',
    }
  );
}

// Activity log operations
export function useCreateActivityLog() {
  return useApiMutation('/api/activity-logs', 'POST', {
    invalidateKeys: ['activityLogs', 'pipeline', 'leads'],
    successMessage: 'Activity logged successfully',
    errorMessage: 'Failed to log activity',
  });
}

export function useBatchCreateActivityLogs() {
  return useApiMutation('/api/activity-logs/batch', 'POST', {
    invalidateKeys: ['activityLogs', 'pipeline', 'leads'],
    successMessage: 'Activities logged successfully',
    errorMessage: 'Failed to log activities',
  });
}

// KPI Target operations
export function useUpdateKpiTargets() {
  return useApiMutation('/api/kpi-targets', 'PUT', {
    invalidateKeys: ['kpiTargets'],
    successMessage: 'KPI targets updated successfully',
    errorMessage: 'Failed to update KPI targets',
  });
}

// Specialized conversion operations
export function useConvertLeadToPipeline() {
  return useApiMutation('/api/pipeline/convert-lead', 'POST', {
    invalidateKeys: ['leads', 'pipeline'],
    successMessage: 'Lead converted to pipeline successfully',
    errorMessage: 'Failed to convert lead to pipeline',
  });
}

export function useConvertAllLeads() {
  return useApiMutation('/api/pipeline/convert-all', 'POST', {
    invalidateKeys: ['leads', 'pipeline'],
    successMessage: 'Leads converted successfully',
    errorMessage: 'Failed to convert leads',
  });
}

// Move operations
export function useMovePipelineItem() {
  return useApiMutation<any, { id: number; newCategory: string; newStatus: string }>(
    '', // Dynamic endpoint
    'PUT',
    {
      invalidateKeys: ['pipeline', 'pipelineItem'],
      successMessage: 'Pipeline item moved successfully',
      errorMessage: 'Failed to move pipeline item',
    }
  );
}

export function useMoveToSublist() {
  return useApiMutation<any, { id: number; sublistId: number | null }>(
    '', // Dynamic endpoint
    'POST',
    {
      invalidateKeys: ['pipeline'],
      successMessage: 'Item moved to sublist successfully',
      errorMessage: 'Failed to move item to sublist',
    }
  );
}

// Sublist operations
export function useCreateSublist() {
  return useApiMutation('/api/pipeline/sublists', 'POST', {
    invalidateKeys: ['pipeline'],
    successMessage: 'Sublist created successfully',
    errorMessage: 'Failed to create sublist',
  });
}

export function useDeleteSublist() {
  return useApiMutation<any, { id: number; moveItemsTo?: number | null }>(
    '', // Dynamic endpoint
    'DELETE',
    {
      invalidateKeys: ['pipeline'],
      successMessage: 'Sublist deleted successfully',
      errorMessage: 'Failed to delete sublist',
    }
  );
}

export function useReorderSublistItems() {
  return useApiMutation<any, { id: number; itemOrder: { id: number; sortOrder: number }[] }>(
    '', // Dynamic endpoint
    'POST',
    {
      invalidateKeys: ['pipeline'],
      successMessage: 'Items reordered successfully',
      errorMessage: 'Failed to reorder items',
    }
  );
}

// Helper function to build dynamic endpoints
export function buildEndpoint(baseEndpoint: string, id?: number | string, action?: string): string {
  let endpoint = baseEndpoint;
  
  if (id !== undefined) {
    endpoint += `/${id}`;
  }
  
  if (action) {
    endpoint += `/${action}`;
  }
  
  return endpoint;
}

// Higher-order function to create ID-based mutations
export function createIdBasedMutation<TVariables extends { id: number }>(
  baseEndpoint: string,
  method: 'PUT' | 'DELETE',
  options: {
    invalidateKeys?: string[];
    successMessage?: string;
    errorMessage?: string;
    action?: string;
  } = {}
) {
  return function() {
    const queryClient = useQueryClient();

    return useMutation<any, Error, TVariables>({
      mutationFn: async (variables: TVariables) => {
        const endpoint = buildEndpoint(baseEndpoint, variables.id, options.action);
        
        const response = await fetch(endpoint, {
          method,
          headers: {
            'Content-Type': 'application/json',
          },
          body: method !== 'DELETE' ? JSON.stringify(variables) : undefined,
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        return response.json();
      },
      onSuccess: () => {
        if (options.invalidateKeys) {
          options.invalidateKeys.forEach(key => {
            queryClient.invalidateQueries({ queryKey: [key] });
          });
        }

        if (options.successMessage) {
          toast.success(options.successMessage);
        }
      },
      onError: (error) => {
        console.error('API mutation failed:', error);
        const errorMessage = options.errorMessage || error.message || 'Operation failed';
        toast.error(errorMessage);
      },
    });
  };
}