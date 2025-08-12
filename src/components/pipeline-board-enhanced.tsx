'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { FileText, MessageSquare, Move, ChevronDown, ChevronRight, Trash2, Plus, Clock, ExternalLink, BookOpen } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

import { PipelineItem, useCreateActivityLog, useBatchActivityLogs, useMovePipelineItem, useMoveItemToSublist, useDeletePipelineItem, useActivityLogs } from '@/lib/hooks';
import { formatDistanceToNow } from 'date-fns';
import { pipelineCategoryEnum, pipelineStatusEnum } from '@/lib/validations';
import { PipelineDialog } from './pipeline-dialog';
import { PipelineDetail } from './pipeline-detail';
import { PipelineEditableCell } from './ui/pipeline-editable-cell';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { toast } from 'sonner';
import { 
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { UpdatesDialog } from './updates-dialog';
import { SublistDialog } from './sublist-dialog';
import { NotesPopover } from './ui/notes-popover';
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useRouter } from 'next/navigation';

interface PipelineBoardEnhancedProps {
  items: PipelineItem[];
  isLoading?: boolean;
  selectedBdr: string;
  onRefresh?: () => void;
  simpleMode?: boolean;
}

interface GroupedSection {
  id: string;
  label: string;
  icon: string;
  color: string;
  categories: string[];
  statuses: string[];
}

export function PipelineBoardEnhanced({ items, isLoading, selectedBdr, onRefresh, simpleMode = true }: PipelineBoardEnhancedProps) {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['Pipeline', 'Lists_Media_QA', 'Calls', 'Declined_Rescheduled']));
  const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set());
  const [detailOpen, setDetailOpen] = useState<number | null>(null);
  const [moveOpen, setMoveOpen] = useState<number | null>(null);
  const [selectedMoveCategory, setSelectedMoveCategory] = useState<string>('');
  const [selectedMoveStatus, setSelectedMoveStatus] = useState<string>('');
  const [showActivityLog, setShowActivityLog] = useState<number | null>(null);

  const router = useRouter();
  const { mutate: movePipelineItem } = useMovePipelineItem();
  const { mutate: deletePipelineItem } = useDeletePipelineItem();
  const { mutate: createActivityLog } = useCreateActivityLog();

  // Fetch activity logs for the selected item
  const { data: activityLogsData } = useActivityLogs({
    pipelineItemId: showActivityLog || undefined,
    pageSize: 50,
  });

  // Define the grouped sections with proper labels and ordering
  const groupedSections: GroupedSection[] = [
    {
      id: 'Pipeline',
      label: 'Pipeline (Agreements & Proposals)',
      icon: '📋',
      categories: ['Pipeline'],
      statuses: ['Proposal - Media', 'Proposal - Profile', 'Agreement - Media', 'Agreement - Profile', 'Partner List Pending'],
      color: 'bg-blue-50 dark:bg-blue-950/30 border-l-blue-500 dark:border-l-blue-400'
    },
    {
      id: 'Lists_Media_QA',
      label: 'Lists, Media Sales & Q&A',
      icon: '📊',
      categories: ['Lists_Media_QA'],
      statuses: ['Partner List Sent', 'List Out', 'List Out - Not Sold', 'Media Sales', 'Q&A', 'Free Q&A Offered', 'Sold'],
      color: 'bg-green-50 dark:bg-green-950/30 border-l-green-500 dark:border-l-green-400'
    },
    {
      id: 'Calls',
      label: 'Calls',
      icon: '📞',
      categories: ['Calls'],
      statuses: ['Call Proposed', 'Call Booked', 'Call Conducted'],
      color: 'bg-purple-50 dark:bg-purple-950/30 border-l-purple-500 dark:border-l-purple-400'
    },
    {
      id: 'Declined_Rescheduled',
      label: 'Declined & Rescheduled',
      icon: '⏸️',
      categories: ['Declined_Rescheduled'],
      statuses: ['Declined_Rescheduled', 'Rescheduled', 'Lost'],
      color: 'bg-orange-50 dark:bg-orange-950/30 border-l-orange-500 dark:border-l-orange-400'
    }
  ];
  
  // Filter items by the selected BDR
  const filteredItems = items.filter(item => item.bdr === selectedBdr);
  
  // Group and sort items by sections and statuses
  const groupedAndSortedItems: Record<string, PipelineItem[]> = {};
  
  groupedSections.forEach(section => {
    const sectionItems = filteredItems.filter(
      item => section.categories.includes(item.category)
    );
    
    // Sort by status order within section, then by lastUpdated (most recent first)
    groupedAndSortedItems[section.id] = sectionItems.sort((a, b) => {
      // First sort by status order
      const statusOrderA = section.statuses.indexOf(a.status);
      const statusOrderB = section.statuses.indexOf(b.status);
      
      if (statusOrderA !== statusOrderB) {
        return statusOrderA - statusOrderB;
      }
      
      // Then sort by lastUpdated within same status
      const dateA = new Date(a.lastUpdated || a.addedDate || 0);
      const dateB = new Date(b.lastUpdated || b.addedDate || 0);
      return dateB.getTime() - dateA.getTime();
    });
  });

  const toggleSection = (sectionId: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(sectionId)) {
      newExpanded.delete(sectionId);
    } else {
      newExpanded.add(sectionId);
    }
    setExpandedSections(newExpanded);
  };

  const toggleExpanded = (itemId: number) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(itemId)) {
      newExpanded.delete(itemId);
    } else {
      newExpanded.add(itemId);
    }
    setExpandedItems(newExpanded);
  };

  const handleItemClick = (id: number) => {
    router.push(`/pipeline/${id}`);
  };

  const handleMoveItem = (item: PipelineItem) => {
    if (selectedMoveCategory === item.category && selectedMoveStatus === item.status) {
      setMoveOpen(null);
      return;
    }

    movePipelineItem({
      id: item.id,
      newCategory: selectedMoveCategory,
      newStatus: selectedMoveStatus
    }, {
      onSuccess: () => {
        toast.success(`Moved to ${selectedMoveStatus}`);
        setMoveOpen(null);
        onRefresh?.();
      },
      onError: () => {
        toast.error('Failed to move item');
      }
    });
  };

  function getNextStep(item: PipelineItem): { category: string; status: string; label: string } | null {
    const { category, status } = item;
    if (category === 'Calls') {
      if (status === 'Call Proposed') return { category, status: 'Call Booked', label: 'Book call' };
      if (status === 'Call Booked') return { category, status: 'Call Conducted', label: 'Conducted' };
    }
    if (category === 'Pipeline') {
      if (status === 'Proposal - Profile') return { category, status: 'Agreement - Profile', label: 'Send agreement (Profile)' };
      if (status === 'Proposal - Media') return { category, status: 'Agreement - Media', label: 'Send agreement (Media)' };
      if (status === 'Partner List Pending') return { category: 'Lists_Media_QA', status: 'Partner List Sent', label: 'Send partner list' };
    }
    if (category === 'Lists_Media_QA') {
      if (status === 'Partner List Sent') return { category, status: 'List Out', label: 'Mark list out' };
      if (status === 'List Out') return { category, status: 'Media Sales', label: 'Move to media sales' };
      if (status === 'Media Sales') return { category, status: 'Sold', label: 'Mark sold' };
    }
    return null;
  }

  function handleQuickMove(item: PipelineItem) {
    const next = getNextStep(item);
    if (!next) return;
    movePipelineItem({ id: item.id, newCategory: next.category, newStatus: next.status }, {
      onSuccess: () => {
        toast.success(`Moved to ${next.status}`);
        onRefresh?.();
      },
      onError: () => toast.error('Failed to move item'),
    });
  }

  function handleQuickLogCall(item: PipelineItem) {
    createActivityLog({
      bdr: item.bdr,
      activityType: 'Call_Completed',
      description: 'Call completed',
      pipelineItemId: item.id,
    }, {
      onSuccess: () => {
        toast.success('Logged call');
        onRefresh?.();
      },
      onError: () => toast.error('Failed to log call'),
    });
  }

  async function handlePushToEditorial(item: PipelineItem) {
    try {
      const response = await fetch('/api/editorial/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pipelineItemId: item.id }),
      });

      const result = await response.json();

      if (response.ok) {
        toast.success(`"${item.name}" pushed to editorial board`);
        onRefresh?.();
      } else if (response.status === 409) {
        toast.warning(`"${item.name}" is already in editorial board`);
      } else {
        throw new Error(result.error || 'Failed to push to editorial board');
      }
    } catch (error) {
      console.error('Error pushing to editorial board:', error);
      toast.error('Failed to push to editorial board');
    }
  }

  const handleCategoryChange = (category: string) => {
    setSelectedMoveCategory(category);
    const statuses = pipelineStatusEnum[category as keyof typeof pipelineStatusEnum];
    if (statuses && statuses.length > 0) {
      setSelectedMoveStatus(statuses[0]);
    }
  };

  const openMoveDialog = (item: PipelineItem) => {
    setSelectedMoveCategory(item.category);
    setSelectedMoveStatus(item.status);
    setMoveOpen(item.id);
  };

  const handleDeleteItem = (e: React.MouseEvent, item: PipelineItem) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this pipeline item? This action cannot be undone.')) {
      deletePipelineItem(item.id, {
        onSuccess: () => {
          toast.success('Pipeline item deleted successfully');
          onRefresh?.();
        },
        onError: () => {
          toast.error('Failed to delete pipeline item');
        }
      });
    }
  };

  // Recursive function to render items and their children
  const renderItemsRecursively = (itemList: PipelineItem[], level: number = 0): React.ReactElement[] => {
    const elements: React.ReactElement[] = [];
    
    itemList.forEach((item) => {
      const hasChildren = item.children && item.children.length > 0;
      const isExpanded = expandedItems.has(item.id);
      
      elements.push(
        <TableRow
          key={item.id}
          className="cursor-pointer hover:bg-muted/50 h-12 border-l-2"
          style={{
            borderLeftColor: 
              item.status === 'Call Booked' ? '#16a34a' :
              item.status === 'Call Proposed' ? '#f59e0b' :
              item.status === 'Sold' ? '#059669' :
              item.status.includes('Agreement') ? '#3b82f6' :
              item.status.includes('Proposal') ? '#8b5cf6' :
              item.status.includes('Declined') ? '#ef4444' :
              item.status.includes('Rescheduled') ? '#f97316' :
              '#6b7280'
          }}
          onClick={() => handleItemClick(item.id)}
        >
          <TableCell className="py-2">
            <div className="flex items-center gap-2" style={{ paddingLeft: `${level * 20}px` }}>
              <div onClick={(e) => e.stopPropagation()}>
                {hasChildren ? (
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-4 w-4 p-0 hover:bg-muted"
                      onClick={() => toggleExpanded(item.id)}
                    >
                      {isExpanded ? (
                        <ChevronDown className="h-3 w-3" />
                      ) : (
                        <ChevronRight className="h-3 w-3" />
                      )}
                    </Button>
                  </div>
                ) : (
                  <SublistDialog
                    title="Add Sublist Item"
                    buttonLabel="+"
                    buttonVariant="ghost"
                    buttonSize="sm"
                    buttonIcon={true}
                    defaultCategory={item.category}
                    defaultStatus={item.status}
                    defaultBdr={item.bdr}
                    parentId={item.id}
                    onSuccess={onRefresh}
                    className="h-4 w-4 p-0 hover:bg-muted"
                  />
                )}
              </div>
              <PipelineEditableCell
                value={item.name}
                item={item}
                field="name"
                placeholder="Name"
              />
              {hasChildren && (
                <div className="flex items-center gap-1 ml-2">
                  <div className="w-1 h-1 rounded-full bg-primary"></div>
                  <span className="text-xs text-muted-foreground">
                    {item.children?.length || 0} subitem{item.children && item.children.length !== 1 ? 's' : ''}
                  </span>
                </div>
              )}
            </div>
          </TableCell>
          <TableCell className="py-2">
            <PipelineEditableCell
              value={item.company}
              item={item}
              field="company"
              placeholder="Company"
            />
          </TableCell>
          {!simpleMode && (
          <TableCell className="py-2">
            <PipelineEditableCell
              value={item.title}
              item={item}
              field="title"
              placeholder="Title"
            />
          </TableCell>
          )}
          <TableCell className="py-2">
            <div className="flex items-center gap-2">
              <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                item.status === 'Call Booked' ? 'bg-green-100 text-green-800' :
                item.status === 'Call Proposed' ? 'bg-yellow-100 text-yellow-800' :
                item.status === 'Sold' ? 'bg-emerald-100 text-emerald-800' :
                item.status.includes('Agreement') ? 'bg-blue-100 text-blue-800' :
                item.status.includes('Proposal') ? 'bg-purple-100 text-purple-800' :
                item.status.includes('Declined') ? 'bg-red-100 text-red-800' :
                item.status.includes('Rescheduled') ? 'bg-orange-100 text-orange-800' :
                'bg-muted text-muted-foreground'
              }`}>
                {item.status}
              </div>
              {simpleMode && getNextStep(item) && (
                <div className="inline-flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Next:</span>
                  <span className="text-xs font-medium">
                    {getNextStep(item)!.status}
                  </span>
                </div>
              )}
            </div>
          </TableCell>
          <TableCell className="py-2">
            <PipelineEditableCell
              value={item.callDate || ''}
              item={item}
              field="callDate"
              placeholder="Set call date"
              isDate={true}
            />
          </TableCell>
          {!simpleMode && (
          <TableCell className="py-2" onClick={(e) => e.stopPropagation()}>
            <Popover open={showActivityLog === item.id} onOpenChange={(open) => !open && setShowActivityLog(null)}>
              <PopoverTrigger asChild>
                <div 
                  className="cursor-pointer hover:bg-muted/50 p-1 rounded"
                  onClick={() => setShowActivityLog(item.id)}
                >
                  {item.latestActivityLog ? (
                    <div className="flex flex-col gap-0.5">
                      <span className="text-xs font-medium">
                        {item.latestActivityLog.activityType === 'BDR_Update' ? 'Update' : 
                         item.latestActivityLog.activityType.replace('_', ' ')}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {item.latestActivityLog.notes ? 
                          item.latestActivityLog.notes.length > 30 ? 
                            `${item.latestActivityLog.notes.substring(0, 30)}...` : 
                            item.latestActivityLog.notes
                          : item.latestActivityLog.description
                        }
                      </span>
                      <span className="text-xs text-muted-foreground">
                        by {item.latestActivityLog.bdr} {formatDistanceToNow(new Date(item.latestActivityLog.timestamp), { addSuffix: true })}
                      </span>
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground">No updates</span>
                  )}
                </div>
              </PopoverTrigger>
              <PopoverContent className="w-96" side="right">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      Activity History
                    </h4>
                  </div>
                  <ScrollArea className="h-[300px]">
                    <div className="space-y-4">
                      {activityLogsData?.logs.map((log) => (
                        <div key={log.id} className="space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">
                              {log.activityType === 'BDR_Update' ? 'Update' : 
                               log.activityType.replace('_', ' ')}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(log.timestamp), { addSuffix: true })}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {log.notes || log.description}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            by {log.bdr}
                          </p>
                          {(log.previousStatus !== log.newStatus || log.previousCategory !== log.newCategory) && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {log.previousCategory && log.newCategory && (
                                <>Moved from {log.previousCategory} to {log.newCategory}<br /></>
                              )}
                              {log.previousStatus && log.newStatus && (
                                <>Status changed from {log.previousStatus} to {log.newStatus}</>
                              )}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              </PopoverContent>
            </Popover>
          </TableCell>
          )}
          {!simpleMode && (
          <TableCell className="py-2">
            {item.email && (
              <a 
                href={`mailto:${item.email}`}
                onClick={(e) => e.stopPropagation()}
                className="text-blue-500 hover:text-blue-700 transition-colors text-xs"
              >
                {item.email}
              </a>
            )}
          </TableCell>
          )}
          {!simpleMode && (
          <TableCell className="py-2">
            {item.phone && (
              <a 
                href={`tel:${item.phone}`}
                onClick={(e) => e.stopPropagation()}
                className="text-blue-500 hover:text-blue-700 transition-colors text-xs"
              >
                {item.phone}
              </a>
            )}
          </TableCell>
          )}
          <TableCell className="py-2">
            <PipelineEditableCell
              value={item.notes}
              item={item}
              field="notes"
              isTextarea={true}
              placeholder="Add notes..."
            />
          </TableCell>
          <TableCell className="py-2">
            <div className="flex items-center space-x-1" onClick={e => e.stopPropagation()}>
              <UpdatesDialog 
                pipelineItem={item}
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
              
              {!simpleMode && (
              <Popover open={moveOpen === item.id} onOpenChange={(open) => !open && setMoveOpen(null)}>
                <PopoverTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="h-6 px-2 text-xs"
                    onClick={(e) => {
                      e.stopPropagation();
                      openMoveDialog(item);
                    }}
                  >
                    <Move className="h-3 w-3 mr-1" />
                    Move
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80 p-4" side="top" align="end">
                  <div className="space-y-4">
                    <h4 className="font-medium">Move to different group</h4>
                    
                    <div className="space-y-3">
                      <div>
                        <label className="text-sm font-medium">Category</label>
                        <Select
                          value={selectedMoveCategory}
                          onValueChange={handleCategoryChange}
                        >
                          <SelectTrigger className="mt-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {pipelineCategoryEnum.map((category) => (
                              <SelectItem key={category} value={category}>
                                {category.replace('_', ' ')}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div>
                        <label className="text-sm font-medium">Status</label>
                        <Select
                          value={selectedMoveStatus}
                          onValueChange={(value) => setSelectedMoveStatus(value)}
                        >
                          <SelectTrigger className="mt-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {selectedMoveCategory && pipelineStatusEnum[selectedMoveCategory as keyof typeof pipelineStatusEnum]?.map((status) => (
                              <SelectItem key={`${selectedMoveCategory}-${status}`} value={status}>
                                {status}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    
                    <div className="text-xs text-muted-foreground bg-muted/20 p-2 rounded">
                      Moving from <span className="font-medium">{item.category}</span> ({item.status}) to <span className="font-medium">{selectedMoveCategory}</span> ({selectedMoveStatus})
                    </div>
                    
                    <div className="flex justify-end gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setMoveOpen(null)}
                      >
                        Cancel
                      </Button>
                      <Button 
                        size="sm"
                        onClick={() => handleMoveItem(item)}
                        disabled={selectedMoveCategory === item.category && selectedMoveStatus === item.status}
                      >
                        Move
                      </Button>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
              )}
              
              {!simpleMode && item.notes && <NotesPopover notes={item.notes} />}
              {!simpleMode && item.link && (
                <a 
                  href={item.link} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-500 hover:text-blue-700 transition-colors"
                >
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}
              {simpleMode && getNextStep(item) && (
                <Button size="sm" className="h-6 px-2 text-xs" onClick={() => handleQuickMove(item)}>
                  Move: {getNextStep(item)!.status}
                </Button>
              )}
              {simpleMode && (
                <Button variant="outline" size="sm" className="h-6 px-2 text-xs" onClick={() => handleQuickLogCall(item)}>
                  Log Call
                </Button>
              )}
              <Button 
                variant="outline" 
                size="sm" 
                className="h-6 px-2 text-xs bg-purple-50 hover:bg-purple-100 text-purple-700 border-purple-200" 
                onClick={() => handlePushToEditorial(item)}
                title="Push to Editorial Board"
              >
                <BookOpen className="h-3 w-3 mr-1" />
                Editorial
              </Button>
              {!simpleMode && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-6 px-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={(e) => handleDeleteItem(e, item)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              )}
            </div>
          </TableCell>
        </TableRow>
      );

      // Add children if expanded
      if (hasChildren && isExpanded && item.children) {
        elements.push(...renderItemsRecursively(item.children, level + 1));
        
        // Add "Add subitem" row after the children
        elements.push(
          <TableRow key={`add-subitem-${item.id}`} className="hover:bg-muted/50 h-10">
            <TableCell className="py-1">
              <div className="flex items-center gap-2" style={{ paddingLeft: `${(level + 1) * 20}px` }}>
                <div className="w-2 h-2 rounded-full bg-muted-foreground/30"></div>
                <SublistDialog
                  title="Add More Sublist Items"
                  buttonLabel="+ Add subitem"
                  buttonVariant="ghost"
                  buttonSize="default"
                  buttonIcon={false}
                  defaultCategory={item.category}
                  defaultStatus={item.status}
                  defaultBdr={item.bdr}
                  parentId={item.id}
                  onSuccess={onRefresh}
                  className="h-5 px-2 text-xs hover:bg-muted text-muted-foreground hover:text-foreground border border-dashed border-muted-foreground/30 hover:border-muted-foreground/50 rounded"
                />
              </div>
            </TableCell>
            <TableCell className="py-1"></TableCell>
            {!simpleMode && <TableCell className="py-1"></TableCell>}
            <TableCell className="py-1"></TableCell>
            <TableCell className="py-1"></TableCell>
            {!simpleMode && <TableCell className="py-1"></TableCell>}
            {!simpleMode && <TableCell className="py-1"></TableCell>}
            {!simpleMode && <TableCell className="py-1"></TableCell>}
            <TableCell className="py-1"></TableCell>
            <TableCell className="py-1"></TableCell>
          </TableRow>
        );
      }
    });

    return elements;
  };

  const renderSkeletonRows = (count: number) => {
    return Array(count)
      .fill(0)
      .map((_, i) => (
        <TableRow key={i}>
          <TableCell><Skeleton className="h-4 w-32" /></TableCell>
          <TableCell><Skeleton className="h-4 w-24" /></TableCell>
          {!simpleMode && <TableCell><Skeleton className="h-4 w-20" /></TableCell>}
          <TableCell><Skeleton className="h-4 w-20" /></TableCell>
          <TableCell><Skeleton className="h-4 w-16" /></TableCell>
          {!simpleMode && <TableCell><Skeleton className="h-4 w-32" /></TableCell>}
          {!simpleMode && <TableCell><Skeleton className="h-4 w-24" /></TableCell>}
          {!simpleMode && <TableCell><Skeleton className="h-4 w-20" /></TableCell>}
          <TableCell><Skeleton className="h-4 w-32" /></TableCell>
          <TableCell><Skeleton className="h-4 w-24" /></TableCell>
        </TableRow>
      ));
  };
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="sticky top-4 z-10 border-b pb-4 bg-white/40 dark:bg-white/[0.03] backdrop-blur-xl supports-[backdrop-filter]:bg-white/30">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Enhanced Pipeline Board</h1>
            <p className="text-sm text-muted-foreground">
              Managing pipeline for {selectedBdr} • Grouped by workflow stages
            </p>
          </div>
          <PipelineDialog
            title="Add New Lead"
            buttonLabel="Add New Lead"
            buttonVariant="default"
            buttonIcon={true}
            defaultCategory="Pipeline"
            defaultStatus="Proposal - Profile"
            defaultBdr={selectedBdr}
            onSuccess={onRefresh}
            className="shadow-[0_15px_40px_-20px_rgba(0,0,0,0.35)]"
          />
        </div>
      </div>

      {/* Grouped Sections */}
      {groupedSections.map((section) => {
        const sectionItems = groupedAndSortedItems[section.id] || [];
        const isExpanded = expandedSections.has(section.id);
        
        return (
          <div key={section.id} className="space-y-0">
            {/* Section Header */}
            <div 
              className={`p-4 rounded-t-lg cursor-pointer hover:bg-opacity-80 transition-colors border-l-4 ${section.color}`}
              onClick={() => toggleSection(section.id)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                  >
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </Button>
                  <span className="text-xl">{section.icon}</span>
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">
                      {section.label}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {sectionItems.length} items
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                  <PipelineDialog
                    title={`Add ${section.label} Item`}
                    buttonLabel="Add Item"
                    buttonVariant="outline"
                    buttonIcon={true}
                    defaultCategory={section.categories[0]}
                    defaultStatus={section.statuses[0]}
                    defaultBdr={selectedBdr}
                    onSuccess={onRefresh}
                  />
                </div>
              </div>
            </div>

            {/* Section Table */}
            {isExpanded && (
              <div className="rounded-b-xl border border-t-0 overflow-hidden bg-white/40 dark:bg-white/[0.03] backdrop-blur">
                <Table>
                  <TableHeader>
                    <TableRow className="h-10 bg-white/60 dark:bg-white/[0.06]">
                      <TableHead className="w-[200px]">Name</TableHead>
                      <TableHead className="w-[150px]">Company</TableHead>
                      {!simpleMode && <TableHead className="w-[150px]">Title</TableHead>}
                      <TableHead className="w-[120px]">Status</TableHead>
                      <TableHead className="w-[100px]">Call Date</TableHead>
                      {!simpleMode && <TableHead className="w-[150px]">Last Update</TableHead>}
                      {!simpleMode && <TableHead className="w-[120px]">Email</TableHead>}
                      {!simpleMode && <TableHead className="w-[120px]">Number</TableHead>}
                      <TableHead className="w-[200px]">Notes</TableHead>
                      <TableHead className="w-[160px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      renderSkeletonRows(3)
                    ) : sectionItems.length > 0 ? (
                      renderItemsRecursively(sectionItems)
                    ) : (
                      <TableRow>
                        <TableCell colSpan={simpleMode ? 6 : 10} className="text-center py-8 text-muted-foreground">
                          <div className="flex flex-col items-center gap-2">
                            <span>No items in this section</span>
                            <PipelineDialog
                              title={`Add ${section.label} Item`}
                              buttonLabel="Add First Item"
                              buttonVariant="outline"
                              buttonSize="sm"
                              buttonIcon={false}
                              defaultCategory={section.categories[0]}
                              defaultStatus={section.statuses[0]}
                              defaultBdr={selectedBdr}
                              onSuccess={onRefresh}
                              className="text-xs"
                            />
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        );
      })}
      
      {/* Pipeline Item Detail Dialog */}
      <PipelineDetail 
        pipelineItemId={detailOpen || 0} 
        open={!!detailOpen} 
        onOpenChange={(open) => {
          setDetailOpen(open ? detailOpen : null);
        }}
      />
      
      {/* Floating Action Button for Quick Add */}
      <div className="fixed bottom-6 right-6 z-50">
        <PipelineDialog
          title="Add New Lead"
          buttonLabel=""
          buttonVariant="default"
          buttonSize="icon"
          buttonIcon={true}
          defaultCategory="Pipeline"
          defaultStatus="Proposal - Profile"
          defaultBdr={selectedBdr}
          onSuccess={onRefresh}
          className="h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-shadow"
        />
      </div>
    </div>
  );
}