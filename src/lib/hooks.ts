'use client';

import { useQuery, useMutation, useQueryClient, UseQueryOptions, keepPreviousData } from '@tanstack/react-query';
import { toast } from 'sonner';
import { 
  leadFilterSchema, 
  leadSourceEnum, 
  leadStatusEnum,
  pipelineFilterSchema,
  pipelineCategoryEnum,
  allPipelineStatusValues,
  leadBdrEnum,
  activityTypeEnum
} from './validations';
import { z } from 'zod';
import { useState, useEffect } from 'react';

// Types
export type Lead = {
  id: number;
  name: string;
  title?: string | null;
  addedDate: string | Date;
  lastUpdated: string | Date;
  bdr?: string | null;
  company?: string | null;
  source: typeof leadSourceEnum[number];
  status: typeof leadStatusEnum[number];
  link?: string | null;
  phone?: string | null;
  notes?: string | null;
  email?: string | null;
  inPipeline?: boolean;
  pipelineCategory?: string | null;
  isLeadGen?: boolean;
}

export type PipelineItem = {
  id: number;
  name: string;
  title?: string | null;
  addedDate: string | Date;
  lastUpdated: string | Date;
  bdr: typeof leadBdrEnum[number];
  company?: string | null;
  category: typeof pipelineCategoryEnum[number];
  status: string; // One of the statuses from pipelineStatusEnum
  value?: number | null;
  probability?: number | null;
  expectedCloseDate?: string | Date | null;
  callDate?: string | Date | null;
  link?: string | null;
  phone?: string | null;
  notes?: string | null;
  email?: string | null;
  leadId?: number | null;
  // Sublist functionality fields
  parentId?: number | null;
  parent?: PipelineItem | null;
  children?: PipelineItem[];
  isSublist?: boolean;
  sublistName?: string | null;
  sortOrder?: number | null;
  latestActivityLog?: {
    id: number;
    timestamp: string | Date;
    bdr: string;
    activityType: string;
    description: string;
    notes?: string | null;
  } | null;
  activityLogs?: ActivityLog[];
}

export type ActivityLog = {
  id: number;
  timestamp: string | Date;
  bdr: typeof leadBdrEnum[number];
  activityType: typeof activityTypeEnum[number];
  description: string;
  scheduledDate?: string | Date | null;
  completedDate?: string | Date | null;
  notes?: string | null;
  leadId?: number | null;
  lead?: {
    id: number;
    name: string;
    company?: string | null;
  } | null;
  pipelineItemId?: number | null;
  pipelineItem?: {
    id: number;
    name: string;
    company?: string | null;
    category: string;
    status: string;
  } | null;
  previousStatus?: string | null;
  newStatus?: string | null;
  previousCategory?: string | null;
  newCategory?: string | null;
}

export type LeadFilter = z.infer<typeof leadFilterSchema>;
export type PipelineFilter = z.infer<typeof pipelineFilterSchema>;

export type LeadCreateInput = Omit<Lead, 'id' | 'addedDate'>;
export type LeadUpdateInput = Omit<Lead, 'addedDate'>;

export type PipelineItemCreateInput = Omit<PipelineItem, 'id' | 'addedDate'>;
export type PipelineItemUpdateInput = Omit<PipelineItem, 'addedDate'>;

export type ActivityLogCreateInput = {
  bdr: typeof leadBdrEnum[number];
  activityType: typeof activityTypeEnum[number];
  description: string;
  scheduledDate?: Date | string | null;
  completedDate?: Date | string | null;
  notes?: string | null;
  leadId?: number | null;
  pipelineItemId?: number | null;
  previousStatus?: string | null;
  newStatus?: string | null;
  previousCategory?: string | null;
  newCategory?: string | null;
};

export type LeadsResponse = {
  leads: Lead[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export type PipelineItemsResponse = {
  items: PipelineItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export type ActivityLogsResponse = {
  logs: ActivityLog[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// Templates Types
export type Template = {
  id: string;
  title: string;
  content: string;
  type: string;
  tags: string[];
  isArchived: boolean;
  categoryId?: string | null;
  createdAt: string | Date;
  updatedAt: string | Date;
};

export type TemplatesResponse = {
  items: Template[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

// Helper function to get base URL
function getBaseUrl() {
  if (typeof window !== 'undefined') {
    // browser should use relative path
    return '';
  }
  
  if (process.env.VERCEL_URL) {
    // reference for vercel.com
    return `https://${process.env.VERCEL_URL}`;
  }

  if (process.env.RENDER_INTERNAL_HOSTNAME) {
    // reference for render.com
    return `http://${process.env.RENDER_INTERNAL_HOSTNAME}:${process.env.PORT}`;
  }

  // assume localhost
  return `http://localhost:${process.env.PORT ?? 3000}`;
}
// Templates API
async function fetchTemplates(params: { search?: string; type?: string; categoryId?: string | null; includeArchived?: boolean; page?: number; pageSize?: number; }): Promise<TemplatesResponse> {
  const sp = new URLSearchParams();
  if (params.search) sp.set('search', params.search);
  if (params.type) sp.set('type', params.type);
  if (params.categoryId) sp.set('categoryId', params.categoryId);
  if (params.includeArchived) sp.set('includeArchived', '1');
  if (params.page) sp.set('page', String(params.page));
  if (params.pageSize) sp.set('pageSize', String(params.pageSize));
  const resp = await fetch(`${getBaseUrl()}/api/templates?${sp.toString()}`);
  if (!resp.ok) throw new Error('Failed to fetch templates');
  return resp.json();
}

export function useTemplates(params: { search?: string; type?: string; categoryId?: string | null; includeArchived?: boolean; page?: number; pageSize?: number; }) {
  return useQuery({
    queryKey: ['templates', params],
    queryFn: () => fetchTemplates(params),
    placeholderData: keepPreviousData,
  });
}


// API Functions for Leads
async function fetchLeads(filters: LeadFilter): Promise<LeadsResponse> {
  const params = new URLSearchParams();
  
  if (filters.search) params.append('search', filters.search);
  if (filters.status) params.append('status', filters.status);
  if (filters.source) params.append('source', filters.source);
  if (filters.bdr) params.append('bdr', filters.bdr);
  params.append('page', filters.page.toString());
  params.append('pageSize', filters.pageSize.toString());
  
  const response = await fetch(`${getBaseUrl()}/api/leads?${params.toString()}`);
  
  if (!response.ok) {
    throw new Error('Failed to fetch leads');
  }
  
  return response.json();
}

async function fetchLead(id: number): Promise<Lead> {
  const response = await fetch(`${getBaseUrl()}/api/leads/${id}`);
  
  if (!response.ok) {
    throw new Error('Failed to fetch lead');
  }
  
  return response.json();
}

async function createLead(data: LeadCreateInput): Promise<Lead> {
  const response = await fetch(`${getBaseUrl()}/api/leads`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to create lead');
  }
  
  return response.json();
}

async function updateLead(data: LeadUpdateInput): Promise<Lead> {
  const response = await fetch(`${getBaseUrl()}/api/leads/${data.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to update lead');
  }
  
  return response.json();
}

async function deleteLead(id: number): Promise<void> {
  const response = await fetch(`${getBaseUrl()}/api/leads/${id}`, {
    method: 'DELETE',
  });
  
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to delete lead');
  }
}

async function bulkUpdateLeads(ids: number[], status: typeof leadStatusEnum[number]): Promise<void> {
  const response = await fetch(`${getBaseUrl()}/api/leads/bulk-update`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ids, status }),
  });
  
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to update leads');
  }
}

// API Functions for Pipeline Items
async function fetchPipelineItems(filters: PipelineFilter): Promise<PipelineItemsResponse> {
  const params = new URLSearchParams();
  
  if (filters.search) params.append('search', filters.search);
  if (filters.category) params.append('category', filters.category);
  if (filters.status) params.append('status', filters.status);
  if (filters.bdr) params.append('bdr', filters.bdr);
  params.append('page', filters.page.toString());
  params.append('pageSize', filters.pageSize.toString());
  
  const response = await fetch(`${getBaseUrl()}/api/pipeline?${params.toString()}`);
  
  if (!response.ok) {
    throw new Error('Failed to fetch pipeline items');
  }
  
  return response.json();
}

async function fetchPipelineItem(id: number): Promise<PipelineItem> {
  const response = await fetch(`${getBaseUrl()}/api/pipeline/${id}`);
  
  if (!response.ok) {
    throw new Error('Failed to fetch pipeline item');
  }
  
  return response.json();
}

async function createPipelineItem(data: PipelineItemCreateInput): Promise<PipelineItem> {
  const response = await fetch(`${getBaseUrl()}/api/pipeline`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to create pipeline item');
  }
  
  return response.json();
}

async function updatePipelineItem(data: PipelineItemUpdateInput): Promise<PipelineItem> {
  const response = await fetch(`${getBaseUrl()}/api/pipeline/${data.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to update pipeline item');
  }
  
  return response.json();
}

async function deletePipelineItem(id: number): Promise<void> {
  const response = await fetch(`${getBaseUrl()}/api/pipeline/${id}`, {
    method: 'DELETE',
  });
  
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to delete pipeline item');
  }
}

async function movePipelineItem(id: number, newCategory: string, newStatus: string): Promise<PipelineItem> {
  const response = await fetch(`${getBaseUrl()}/api/pipeline/${id}/move`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ newCategory, newStatus }),
  });
  
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to move pipeline item');
  }
  
  return response.json();
}

async function convertLeadToPipeline(leadId: number, category: string, status: string): Promise<PipelineItem> {
  const response = await fetch(`${getBaseUrl()}/api/pipeline/convert-lead`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ leadId, category, status }),
  });
  
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to convert lead to pipeline item');
  }
  
  return response.json();
}

// Sublist API Functions
async function createSublist(data: {
  name: string;
  category: string;
  status: string;
  bdr: string;
  parentId?: number | null;
  sortOrder?: number | null;
}): Promise<PipelineItem> {
  const response = await fetch(`${getBaseUrl()}/api/pipeline/sublists`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...data,
      isSublist: true,
      sublistName: data.name,
    }),
  });
  
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to create sublist');
  }
  
  return response.json();
}

async function moveItemToSublist(itemId: number, sublistId: number | null, sortOrder?: number): Promise<PipelineItem> {
  const response = await fetch(`${getBaseUrl()}/api/pipeline/${itemId}/move-to-sublist`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sublistId, sortOrder }),
  });
  
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to move item to sublist');
  }
  
  return response.json();
}

async function deleteSublist(sublistId: number, moveItemsTo?: number | null): Promise<void> {
  const response = await fetch(`${getBaseUrl()}/api/pipeline/sublists/${sublistId}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ moveItemsTo }),
  });
  
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to delete sublist');
  }
}

async function reorderSublistItems(sublistId: number, itemOrder: { id: number; sortOrder: number }[]): Promise<void> {
  const response = await fetch(`${getBaseUrl()}/api/pipeline/sublists/${sublistId}/reorder`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ itemOrder }),
  });
  
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to reorder sublist items');
  }
}

// API Functions for Activity Logs
async function fetchActivityLogs(params: {
  bdr?: string;
  activityType?: string;
  fromDate?: Date | string;
  toDate?: Date | string;
  leadId?: number;
  pipelineItemId?: number;
  page?: number;
  pageSize?: number;
}): Promise<ActivityLogsResponse> {
  const searchParams = new URLSearchParams();
  
  if (params.bdr) searchParams.append('bdr', params.bdr);
  if (params.activityType) searchParams.append('activityType', params.activityType);
  if (params.fromDate) searchParams.append('fromDate', params.fromDate.toString());
  if (params.toDate) searchParams.append('toDate', params.toDate.toString());
  if (params.leadId) searchParams.append('leadId', params.leadId.toString());
  if (params.pipelineItemId) searchParams.append('pipelineItemId', params.pipelineItemId.toString());
  
  searchParams.append('page', (params.page || 1).toString());
  searchParams.append('pageSize', (params.pageSize || 20).toString());
  
  const response = await fetch(`${getBaseUrl()}/api/activity-logs?${searchParams.toString()}`);
  
  if (!response.ok) {
    throw new Error('Failed to fetch activity logs');
  }
  
  return response.json();
}

async function createActivityLog(data: ActivityLogCreateInput): Promise<ActivityLog> {
  const response = await fetch(`${getBaseUrl()}/api/activity-logs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to create activity log');
  }
  
  return response.json();
}

// Batch activity logs function
async function fetchBatchActivityLogs(pipelineItemIds: number[]): Promise<{ groupedLogs: Record<number, ActivityLog[]> }> {
  if (pipelineItemIds.length === 0) {
    return { groupedLogs: {} };
  }
  
  const searchParams = new URLSearchParams();
  searchParams.append('pipelineItemIds', pipelineItemIds.join(','));
  
  const response = await fetch(`${getBaseUrl()}/api/activity-logs/batch?${searchParams.toString()}`);
  
  if (!response.ok) {
    throw new Error('Failed to fetch batch activity logs');
  }
  
  return response.json();
}

// React Query Hooks for Leads
export function useLeads(filters: LeadFilter, options?: UseQueryOptions<LeadsResponse>) {
  // Create a more specific query key that includes all filter parameters
  const queryKey = [
    'leads', 
    filters.page,
    filters.pageSize,
    filters.search || '',
    filters.status || '',
    filters.source || '',
    filters.bdr || ''
  ];
  
  return useQuery({
    queryKey,
    queryFn: () => fetchLeads(filters),
    placeholderData: keepPreviousData,
    ...options,
  });
}

export function useLead(id: number) {
  return useQuery({
    queryKey: ['lead', id],
    queryFn: () => fetchLead(id),
    enabled: Boolean(id),
  });
}

export function useCreateLead() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: createLead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      toast.success('Lead created successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useUpdateLead() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: updateLead,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['lead', data.id] });
      toast.success('Lead updated successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useDeleteLead() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: deleteLead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      toast.success('Lead deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useBulkUpdateLeads() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ ids, status }: { ids: number[], status: typeof leadStatusEnum[number] }) => 
      bulkUpdateLeads(ids, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      toast.success('Leads updated successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

// React Query Hooks for Pipeline
export function usePipelineItems(filters: PipelineFilter, options?: UseQueryOptions<PipelineItemsResponse>) {
  return useQuery({
    queryKey: ['pipeline', filters],
    queryFn: () => fetchPipelineItems(filters),
    placeholderData: keepPreviousData,
    ...options,
  });
}

export function usePipelineItem(id: number) {
  return useQuery({
    queryKey: ['pipelineItem', id],
    queryFn: () => fetchPipelineItem(id),
    enabled: Boolean(id),
  });
}

export function useCreatePipelineItem() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: createPipelineItem,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pipeline'] });
      toast.success('Pipeline item created successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useUpdatePipelineItem() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: updatePipelineItem,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['pipeline'] });
      queryClient.invalidateQueries({ queryKey: ['pipelineItem', data.id] });
      toast.success('Pipeline item updated successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useDeletePipelineItem() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: deletePipelineItem,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pipeline'] });
      toast.success('Pipeline item deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useMovePipelineItem() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, newCategory, newStatus }: { id: number, newCategory: string, newStatus: string }) => 
      movePipelineItem(id, newCategory, newStatus),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pipeline'] });
      toast.success('Pipeline item moved successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useConvertLeadToPipeline() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ leadId, category, status }: { leadId: number, category: string, status: string }) => 
      convertLeadToPipeline(leadId, category, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pipeline'] });
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      toast.success('Lead converted to pipeline item successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

// React Query Hooks for Activity Logs
export function useActivityLogs(params: {
  bdr?: string;
  activityType?: string;
  fromDate?: Date | string;
  toDate?: Date | string;
  leadId?: number;
  pipelineItemId?: number;
  page?: number;
  pageSize?: number;
}, options?: UseQueryOptions<ActivityLogsResponse>) {
  return useQuery({
    queryKey: ['activityLogs', params],
    queryFn: () => fetchActivityLogs(params),
    enabled: Boolean(params.bdr || params.activityType || params.leadId || params.pipelineItemId || params.fromDate || params.toDate),
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
    ...options,
  });
}

export function useBatchActivityLogs(pipelineItemIds: number[]) {
  return useQuery({
    queryKey: ['batchActivityLogs', pipelineItemIds],
    queryFn: () => fetchBatchActivityLogs(pipelineItemIds),
    enabled: pipelineItemIds.length > 0,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
  });
}

export function useCreateActivityLog() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: createActivityLog,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activityLogs'] });
      queryClient.invalidateQueries({ queryKey: ['batchActivityLogs'] });
      queryClient.invalidateQueries({ queryKey: ['pipeline'] });
      // Success message handled by the component using this hook
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to log activity');
    },
  });
}

// Sublist Hooks
export function useCreateSublist() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: createSublist,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pipeline'] });
      toast.success('Sublist created successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to create sublist: ${error.message}`);
    },
  });
}

export function useMoveItemToSublist() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ itemId, sublistId, sortOrder }: { itemId: number; sublistId: number | null; sortOrder?: number }) =>
      moveItemToSublist(itemId, sublistId, sortOrder),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pipeline'] });
      queryClient.invalidateQueries({ queryKey: ['activityLogs'] });
      toast.success('Item moved to sublist successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to move item to sublist: ${error.message}`);
    },
  });
}

export function useDeleteSublist() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ sublistId, moveItemsTo }: { sublistId: number; moveItemsTo?: number | null }) =>
      deleteSublist(sublistId, moveItemsTo),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pipeline'] });
      toast.success('Sublist deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete sublist: ${error.message}`);
    },
  });
}

export function useReorderSublistItems() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ sublistId, itemOrder }: { sublistId: number; itemOrder: { id: number; sortOrder: number }[] }) =>
      reorderSublistItems(sublistId, itemOrder),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pipeline'] });
    },
    onError: (error: Error) => {
      toast.error(`Failed to reorder sublist items: ${error.message}`);
    },
  });
} 

// Custom hook for managing BDRs
export function useBdrManager(currentUserName?: string | null) {
  const [bdrs, setBdrs] = useState<string[]>(Array.from(leadBdrEnum));
  const [isAddingBdr, setIsAddingBdr] = useState(false);

  const addBdr = (newBdr: string) => {
    if (newBdr.trim() && !bdrs.includes(newBdr)) {
      setBdrs([...bdrs, newBdr]);
      toast.success(`BDR "${newBdr}" added successfully`);
      return true;
    } else if (bdrs.includes(newBdr)) {
      toast.error(`BDR "${newBdr}" already exists`);
      return false;
    } else {
      toast.error('Please enter a valid BDR name');
      return false;
    }
  };

  // Helper function to get default BDR based on current user
  const getDefaultBdr = () => {
    if (currentUserName && bdrs.includes(currentUserName)) {
      return currentUserName;
    }
    return bdrs[0] || '';
  };

  return {
    bdrs,
    addBdr,
    isAddingBdr,
    setIsAddingBdr,
    getDefaultBdr
  };
} 