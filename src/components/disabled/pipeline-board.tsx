'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { FileText, MessageSquare, Move, ChevronDown, ChevronRight, Trash2, Plus } from 'lucide-react';

import { PipelineItem, useCreateActivityLog, useBatchActivityLogs, useMovePipelineItem, useMoveItemToSublist, useDeletePipelineItem } from '@/lib/hooks';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface PipelineItemCardProps {
  item: PipelineItem;
  onRefresh?: () => void;
}

const PipelineItemCard = ({ item, onRefresh }: PipelineItemCardProps) => {
  const [phoneCopied, setPhoneCopied] = useState(false);
  const [emailCopied, setEmailCopied] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const [moveOpen, setMoveOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);
  const [selectedMoveCategory, setSelectedMoveCategory] = useState<string>(item.category);
  const [selectedMoveStatus, setSelectedMoveStatus] = useState<string>(item.status);

  const { mutate: createActivityLog } = useCreateActivityLog();
  const { mutate: movePipelineItem } = useMovePipelineItem();
  const { mutate: deletePipelineItem } = useDeletePipelineItem();

  // Close all dialogs when any dialog closes
  const handleDialogClose = () => {
    setDetailOpen(false);
    setShowNotes(false);
    setMoveOpen(false);
  };

  // Prevent detail dialog from opening when clicking inside other dialogs
  const preventDetailOpen = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  // Listen for dialog close events
  useEffect(() => {
    const handleCloseAllDialogs = () => {
      handleDialogClose();
    };

    window.addEventListener('closeAllDialogs', handleCloseAllDialogs);
    return () => {
      window.removeEventListener('closeAllDialogs', handleCloseAllDialogs);
    };
  }, []);

  // Update move selections when item changes
  useEffect(() => {
    setSelectedMoveCategory(item.category);
    setSelectedMoveStatus(item.status);
  }, [item.category, item.status]);
  
  const addedDate = typeof item.addedDate === 'string' 
    ? new Date(item.addedDate) 
    : item.addedDate;
    
  const lastUpdated = typeof item.lastUpdated === 'string' 
    ? new Date(item.lastUpdated) 
    : item.lastUpdated;
  
  const formattedAddedDate = formatDistanceToNow(addedDate, { addSuffix: true });
  const formattedLastUpdated = formatDistanceToNow(lastUpdated, { addSuffix: true });
  
  const copyToClipboard = async (text: string, type: 'phone' | 'email') => {
    try {
      await navigator.clipboard.writeText(text);
      if (type === 'phone') {
        setPhoneCopied(true);
        setTimeout(() => setPhoneCopied(false), 2000);
        toast.success('Phone number copied to clipboard');
      } else {
        setEmailCopied(true);
        setTimeout(() => setEmailCopied(false), 2000);
        toast.success('Email address copied to clipboard');
      }
    } catch (err) {
      toast.error('Failed to copy to clipboard');
    }
  };

  const handleManualUpdate = () => {
    createActivityLog({
      bdr: item.bdr,
      activityType: 'Note_Added',
      description: 'Manually updated last chase date',
      pipelineItemId: item.id,
      notes: 'Lead chased manually'
    }, {
      onSuccess: () => {
        toast.success('Last updated date refreshed');
        onRefresh?.();
      }
    });
  };

  const handleMoveItem = () => {
    if (selectedMoveCategory === item.category && selectedMoveStatus === item.status) {
      setMoveOpen(false);
      return;
    }

    movePipelineItem({
      id: item.id,
      newCategory: selectedMoveCategory,
      newStatus: selectedMoveStatus
    }, {
      onSuccess: () => {
        toast.success(`Moved to ${selectedMoveStatus}`);
        setMoveOpen(false);
        onRefresh?.();
      },
      onError: () => {
        toast.error('Failed to move item');
      }
    });
  };

  const handleDeleteItem = () => {
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

  const handleCategoryChange = (category: string) => {
    setSelectedMoveCategory(category);
    // Set the status to the first status in the new category
    const statuses = pipelineStatusEnum[category as keyof typeof pipelineStatusEnum];
    if (statuses && statuses.length > 0) {
      setSelectedMoveStatus(statuses[0]);
    }
  };

  const hasNotes = item.notes && item.notes.trim() !== '';
  const isSublistContainer = item.isSublist;
  const hasChildren = item.children && item.children.length > 0;
  
  return (
    <>
      {/* Regular Pipeline Item */}
      <div className="mb-2">
        <Card 
          className="cursor-pointer hover:shadow-md transition-shadow"
          onClick={(e) => {
            // Only open detail if we didn't click a button or dialog
            if (!(e.target as HTMLElement).closest('button, [role="dialog"]')) {
              handleDialogClose();
              setDetailOpen(true);
            }
          }}
        >
        <CardContent className="p-3">
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                                 <div onClick={preventDetailOpen}>
                   {hasChildren ? (
                     <div className="flex items-center gap-1">
                       <Button
                         variant="ghost"
                         size="sm"
                         className="h-5 w-5 p-0 hover:bg-muted"
                         onClick={(e) => {
                           e.stopPropagation();
                           setIsExpanded(!isExpanded);
                         }}
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
                       buttonLabel="+ Add subitem"
                       buttonVariant="ghost"
                       buttonSize="default"
                       buttonIcon={false}
                       defaultCategory={item.category}
                       defaultStatus={item.status}
                       defaultBdr={item.bdr}
                       parentId={item.id}
                       onSuccess={onRefresh}
                       className="h-5 px-2 text-xs hover:bg-muted"
                     />
                   )}
                 </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <PipelineEditableCell
                      value={item.name}
                      item={item}
                      field="name"
                      className="font-semibold"
                      placeholder="Name"
                    />
                    {hasChildren && (
                      <div className="flex items-center gap-1">
                        <div className="w-1.5 h-1.5 rounded-full bg-primary"></div>
                        <span className="text-xs text-muted-foreground">
                          {item.children?.length || 0} subitem{item.children && item.children.length !== 1 ? 's' : ''}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <div onClick={preventDetailOpen}>
                  <UpdatesDialog 
                    pipelineItem={item}
                    trigger={
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-6 w-6 p-0"
                      >
                        <MessageSquare className="h-4 w-4" />
                      </Button>
                    }
                  />
                </div>
                {hasNotes && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-6 w-6 p-0" 
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowNotes(!showNotes);
                          }}
                        >
                          <FileText className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>View notes</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
                <div onClick={preventDetailOpen}>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Popover open={moveOpen} onOpenChange={setMoveOpen}>
                          <PopoverTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-6 w-6 p-0"
                              onClick={(e) => {
                                e.stopPropagation();
                                setMoveOpen(true);
                              }}
                            >
                              <Move className="h-4 w-4" />
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
                                  onClick={() => setMoveOpen(false)}
                                >
                                  Cancel
                                </Button>
                                <Button 
                                  size="sm"
                                  onClick={handleMoveItem}
                                  disabled={selectedMoveCategory === item.category && selectedMoveStatus === item.status}
                                >
                                  Move
                                </Button>
                              </div>
                            </div>
                          </PopoverContent>
                        </Popover>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Move to different group</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <div onClick={preventDetailOpen}>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-6 w-6 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteItem();
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Delete item</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
        </Card>
        
        {/* Expanded Sublist Items */}
        {hasChildren && isExpanded && (
          <div className="ml-6 mt-2 space-y-2 border-l-2 border-muted pl-4">
            {item.children!.map((childItem) => (
              <PipelineItemCard 
                key={childItem.id} 
                item={childItem} 
                onRefresh={onRefresh} 
              />
            ))}
            
            {/* Add subitem row for existing sublists */}
            <div className="pt-2">
              <div className="flex items-center gap-2 pl-2">
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
                  className="h-6 px-2 text-xs hover:bg-muted text-muted-foreground hover:text-foreground border border-dashed border-muted-foreground/30 hover:border-muted-foreground/50 rounded"
                />
              </div>
            </div>
          </div>
        )}
      </div>
      
      
      
      {/* Pipeline Item Detail Dialog */}
      <PipelineDetail 
        pipelineItemId={item.id} 
        open={detailOpen} 
        onOpenChange={(open) => {
          setDetailOpen(open);
          if (!open) handleDialogClose();
        }}
      />
    </>
  );
};

interface PipelineBoardProps {
  items: PipelineItem[];
  isLoading?: boolean;
  selectedBdr: string;
  onRefresh?: () => void;
}

export function PipelineBoard({ items, isLoading, selectedBdr, onRefresh }: PipelineBoardProps) {
  const categoryGroups = {
    Pipeline: pipelineStatusEnum.Pipeline,
    Lists_Media_QA: pipelineStatusEnum.Lists_Media_QA,
    Declined_Rescheduled: pipelineStatusEnum.Declined_Rescheduled,
    Calls: pipelineStatusEnum.Calls,
  };
  
  // Filter items by the selected BDR
  const filteredItems = items.filter(item => item.bdr === selectedBdr);
  
  // Get all pipeline item IDs for batch activity logs
  const pipelineItemIds = filteredItems.map(item => item.id);
  
  // Fetch batch activity logs for all pipeline items
  const { data: batchActivityData } = useBatchActivityLogs(pipelineItemIds);
  
  // Group items by category and status
  const groupedItems: Record<string, Record<string, PipelineItem[]>> = {};
  
  pipelineCategoryEnum.forEach(category => {
    groupedItems[category] = {};
    
    categoryGroups[category].forEach(status => {
      groupedItems[category][status] = filteredItems.filter(
        item => item.category === category && item.status === status
      );
    });
  });
  
  const renderSkeletonCards = (count: number) => {
    return Array(count)
      .fill(0)
      .map((_, i) => (
        <div key={i} className="mb-2">
          <Skeleton className="h-24 w-full" />
        </div>
      ));
  };
  
  const renderColumn = (category: string, status: string, items: PipelineItem[]) => {
    return (
      <div key={status} className="min-w-[250px] w-[250px] flex-shrink-0">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-medium">{status} ({items.length})</h3>
          <PipelineDialog
            title={`Add ${status} Item`}
            buttonLabel="+"
            buttonVariant="outline"
            buttonSize="icon"
            buttonIcon={false}
            defaultCategory={category}
            defaultStatus={status}
            defaultBdr={selectedBdr}
            onSuccess={onRefresh}
            className="h-7 w-7"
          />
        </div>
        <div className="rounded-lg border bg-background/50 p-2 min-h-[200px]">
          {isLoading ? (
            renderSkeletonCards(3)
          ) : items.length > 0 ? (
            items.map((item) => <PipelineItemCard key={item.id} item={item} onRefresh={onRefresh} />)
          ) : (
            <div className="flex flex-col items-center justify-center h-24 text-sm text-muted-foreground gap-2">
              <span>No items</span>
              <PipelineDialog
                title={`Add ${status} Item`}
                buttonLabel="Add Lead"
                buttonVariant="outline"
                buttonSize="sm"
                buttonIcon={false}
                defaultCategory={category}
                defaultStatus={status}
                defaultBdr={selectedBdr}
                onSuccess={onRefresh}
                className="text-xs"
              />
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderCallDateColumn = () => {
    const callItems = filteredItems.filter(item => item.category === 'Calls');
    
    return (
      <div className="min-w-[250px] w-[250px] flex-shrink-0">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-medium">Call Dates ({callItems.length})</h3>
        </div>
        <div className="rounded-lg border bg-background/50 p-2 min-h-[200px]">
          {isLoading ? (
            renderSkeletonCards(3)
          ) : callItems.length > 0 ? (
            callItems.map((item) => (
              <Card key={item.id} className="mb-2 cursor-pointer hover:shadow-md transition-shadow">
                <CardContent className="p-3">
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-sm">{item.name}</div>
                      </div>
                    </div>
                    
                    {item.company && (
                      <div className="text-sm text-muted-foreground">
                        {item.company}
                      </div>
                    )}
                    
                    <div className="text-sm">
                      <PipelineEditableCell
                        value={item.callDate || ''}
                        item={item}
                        field="callDate"
                        placeholder="Set call date"
                        isDate={true}
                      />
                    </div>
                    
                    <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                      <span>{item.status}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <div className="flex flex-col items-center justify-center h-24 text-sm text-muted-foreground gap-2">
              <span>No call items</span>
              <PipelineDialog
                title="Add Call Item"
                buttonLabel="Add Call"
                buttonVariant="outline"
                buttonSize="sm"
                buttonIcon={false}
                defaultCategory="Calls"
                defaultStatus="Scheduled"
                defaultBdr={selectedBdr}
                onSuccess={onRefresh}
                className="text-xs"
              />
            </div>
          )}
        </div>
      </div>
    );
  };
  
  return (
    <div className="space-y-8">
      {/* Floating Add New Lead Button */}
      <div className="sticky top-4 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b pb-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Pipeline Board</h1>
            <p className="text-sm text-muted-foreground">
              Managing pipeline for {selectedBdr}
            </p>
          </div>
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
        </div>
      </div>

      {pipelineCategoryEnum.map((category) => (
        <div key={category} className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">
              {category.replace(/_/g, ', ')}
            </h2>
            <PipelineDialog
              title={`Add ${category.replace(/_/g, ' ')} Item`}
              buttonLabel="Add Item"
              buttonVariant="default"
              buttonIcon={true}
              defaultCategory={category}
              defaultStatus={categoryGroups[category][0]}
              defaultBdr={selectedBdr}
              onSuccess={onRefresh}
            />
          </div>
          <div className="flex gap-4 overflow-x-auto pb-4">
            {categoryGroups[category].map((status) =>
              renderColumn(category, status, groupedItems[category][status])
            )}
            {category === 'Calls' && renderCallDateColumn()}
          </div>
        </div>
      ))}
      
      {/* Floating Action Button for Quick Add */}
      <div className="fixed bottom-6 right-6 z-50">
        <PipelineDialog
          title="Add New Lead"
          buttonLabel=""
          buttonVariant="default"
          buttonSize="icon"
          buttonIcon={true}
          defaultCategory="Pipeline"
          defaultStatus="New"
          defaultBdr={selectedBdr}
          onSuccess={onRefresh}
          className="h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-shadow"
        />
      </div>
    </div>
  );
} 