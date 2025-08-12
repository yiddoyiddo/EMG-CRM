import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

export interface EditorialBoardItem {
  id: number;
  name: string;
  title?: string;
  company?: string;
  email?: string;
  phone?: string;
  addedDate: string;
  lastUpdated: string;
  bdrId: string;
  status: string;
  notes?: string;
  link?: string;
  interviewDate?: string;
  qaSubmissionDate?: string;
  qaApprovedDate?: string;
  publicationDate?: string;
  publicationLink?: string;
  leadId?: number;
  pipelineItemId?: number;
  bdr: {
    name: string;
    email: string;
  };
  lead?: {
    name: string;
    company: string;
  };
  pipelineItem?: {
    name: string;
    company: string;
  };
}

interface EditorialResponse {
  items: EditorialBoardItem[];
  pagination: {
    page: number;
    pageSize: number;
    totalCount: number;
    totalPages: number;
  };
}

// Hook to fetch editorial board items
export function useEditorialItems(params?: {
  bdr?: string;
  status?: string;
  page?: number;
  pageSize?: number;
}) {
  const queryParams = new URLSearchParams();
  if (params?.bdr) queryParams.append('bdr', params.bdr);
  if (params?.status) queryParams.append('status', params.status);
  if (params?.page) queryParams.append('page', params.page.toString());
  if (params?.pageSize) queryParams.append('pageSize', params.pageSize.toString());

  return useQuery<EditorialResponse>({
    queryKey: ['editorial-items', params],
    queryFn: async () => {
      const response = await fetch(`/api/editorial?${queryParams}`);
      if (!response.ok) {
        throw new Error('Failed to fetch editorial items');
      }
      return response.json();
    }
  });
}

// Hook to create editorial board item
export function useCreateEditorialItem() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: Partial<EditorialBoardItem>) => {
      const response = await fetch('/api/editorial', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create editorial item');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['editorial-items'] });
      toast.success('Editorial item created successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    }
  });
}

// Hook to update editorial board item
export function useUpdateEditorialItem() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<EditorialBoardItem> }) => {
      const response = await fetch(`/api/editorial/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update editorial item');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['editorial-items'] });
      toast.success('Editorial item updated successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    }
  });
}

// Hook to delete editorial board item
export function useDeleteEditorialItem() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/editorial/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete editorial item');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['editorial-items'] });
      toast.success('Editorial item deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    }
  });
}

// Hook to sync pipeline item to editorial board
export function useSyncToEditorial() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (pipelineItemId: number) => {
      const response = await fetch('/api/editorial/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pipelineItemId }),
      });

      const result = await response.json();

      if (response.status === 409) {
        toast.warning('Item already exists in editorial board');
        return result;
      }

      if (!response.ok) {
        throw new Error(result.error || 'Failed to sync to editorial board');
      }

      return result;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['editorial-items'] });
      queryClient.invalidateQueries({ queryKey: ['pipeline-items'] });
      if (data.success) {
        toast.success(data.message);
      }
    },
    onError: (error: Error) => {
      toast.error(error.message);
    }
  });
}

// Hook to auto-sync eligible pipeline items
export function useAutoSyncFromPipeline() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/editorial/sync', {
        method: 'PUT',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to auto-sync from pipeline');
      }

      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['editorial-items'] });
      queryClient.invalidateQueries({ queryKey: ['pipeline-items'] });
      if (data.syncedCount > 0) {
        toast.success(`Auto-synced ${data.syncedCount} items from pipeline`);
      } else {
        toast.info('No eligible pipeline items to sync');
      }
    },
    onError: (error: Error) => {
      toast.error(error.message);
    }
  });
}