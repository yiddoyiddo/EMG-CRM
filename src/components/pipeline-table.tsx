'use client';

import { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { PipelineItem, useMovePipelineItem, useActivityLogs, useDeletePipelineItem } from '@/lib/hooks';
import { allPipelineStatusValues, pipelineCategoryEnum, pipelineStatusEnum } from '@/lib/validations';
import { formatDistanceToNow } from 'date-fns';
import { useRouter } from 'next/navigation';
import { Filter, ExternalLink, MessageSquare, Move, Clock, ChevronDown, ChevronRight, Trash2, Plus } from 'lucide-react';
import { NotesPopover } from '@/components/ui/notes-popover';
import { UpdatesDialog } from '@/components/updates-dialog';
import { SublistDialog } from '@/components/sublist-dialog';
import { PipelineEditableCell } from '@/components/ui/pipeline-editable-cell';
import { PipelineDialog } from '@/components/pipeline-dialog';
import { 
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from 'sonner';

interface PipelineTableProps {
  items: PipelineItem[];
  onRefresh?: () => void;
  selectedBdr?: string;
}

export function PipelineTable({ items, onRefresh, selectedBdr }: PipelineTableProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [moveOpen, setMoveOpen] = useState<number | null>(null);
  const [selectedMoveCategory, setSelectedMoveCategory] = useState<string>('');
  const [selectedMoveStatus, setSelectedMoveStatus] = useState<string>('');
  const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set());
  const router = useRouter();
  const { mutate: movePipelineItem } = useMovePipelineItem();
  const { mutate: deletePipelineItem } = useDeletePipelineItem();
  const [showActivityLog, setShowActivityLog] = useState<number | null>(null);

  // Fetch activity logs for the selected item
  const { data: activityLogsData } = useActivityLogs({
    pipelineItemId: showActivityLog || undefined,
    pageSize: 50,
  });

  // Function to toggle item expansion
  const toggleExpanded = (itemId: number) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(itemId)) {
      newExpanded.delete(itemId);
    } else {
      newExpanded.add(itemId);
    }
    setExpandedItems(newExpanded);
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
                        className="cursor-pointer hover:bg-muted/50 h-12"
                        onClick={() => handleItemClick(item.id)}
          style={{ paddingLeft: `${level * 20}px` }}
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
                        <TableCell className="py-2">
                          <PipelineEditableCell
                            value={item.title}
                            item={item}
                            field="title"
                            placeholder="Title"
                          />
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
                            
                            {item.notes && <NotesPopover notes={item.notes} />}
                            {item.link && (
                              <a 
                                href={item.link} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-blue-500 hover:text-blue-700 transition-colors"
                              >
                                <ExternalLink className="h-3 w-3" />
                              </a>
                            )}
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-6 px-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                              onClick={(e) => handleDeleteItem(e, item)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
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
            <TableCell className="py-1"></TableCell>
            <TableCell className="py-1"></TableCell>
            <TableCell className="py-1"></TableCell>
            <TableCell className="py-1"></TableCell>
            <TableCell className="py-1"></TableCell>
            <TableCell className="py-1"></TableCell>
            <TableCell className="py-1"></TableCell>
          </TableRow>
        );
      }
    });

    return elements;
  };

  // Group items by status
  const itemsByStatus = allPipelineStatusValues.reduce<Record<string, PipelineItem[]>>(
    (acc, status) => {
      acc[status] = items.filter(item => 
        item.status === status &&
        (searchQuery === '' || 
          item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.company?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.title?.toLowerCase().includes(searchQuery.toLowerCase())
        )
      );
      return acc;
    },
    {} as Record<string, PipelineItem[]>
  );

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

  const handleCategoryChange = (category: string) => {
    setSelectedMoveCategory(category);
    // Set the status to the first status in the new category
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

  return (
    <div className="space-y-8">
      {/* Search Bar and Add New Lead */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Input
            placeholder="Search pipeline..."
            className="max-w-xs"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <Button 
            variant="outline" 
            size="icon" 
            className="h-10 w-10"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="h-4 w-4" />
          </Button>
        </div>
        
        {/* Add New Lead Button */}
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

      {/* Pipeline Sections */}
      {allPipelineStatusValues.map(status => {
        const statusItems = itemsByStatus[status] || [];
        if (statusItems.length === 0) return null;

        return (
          <div key={status} className="space-y-4">
            <Card>
              <CardHeader className="py-3">
                <CardTitle className="text-lg font-semibold flex items-center justify-between">
                  <span>{status}</span>
                  <div className="flex items-center gap-4">
                    <div className="text-xs text-muted-foreground">
                      {statusItems.length} items
                    </div>
                  </div>
                </CardTitle>
              </CardHeader>
            </Card>

            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow className="h-10">
                    <TableHead className="w-[200px]">Name</TableHead>
                    <TableHead className="w-[150px]">Company</TableHead>
                    <TableHead className="w-[150px]">Title</TableHead>
                    <TableHead className="w-[100px]">Call Date</TableHead>
                    <TableHead className="w-[150px]">Last Update</TableHead>
                    <TableHead className="w-[120px]">Email</TableHead>
                    <TableHead className="w-[120px]">Number</TableHead>
                    <TableHead className="w-[200px]">Notes</TableHead>
                    <TableHead className="w-[180px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {renderItemsRecursively(statusItems)}
                </TableBody>
              </Table>
            </div>
          </div>
        );
      })}
    </div>
  );
} 