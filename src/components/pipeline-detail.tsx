'use client';

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { PipelineItem, usePipelineItem, useUpdatePipelineItem, useMovePipelineItem, useCreateActivityLog, useActivityLogs, useDeletePipelineItem } from '@/lib/hooks';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { formatDateUK, formatDateForInput } from '@/lib/date-utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { pipelineCategoryEnum, pipelineStatusEnum } from '@/lib/validations';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface PipelineDetailProps {
  pipelineItemId: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PipelineDetail({ pipelineItemId, open, onOpenChange }: PipelineDetailProps) {
  const { data: pipelineItem, isLoading } = usePipelineItem(pipelineItemId);
  const { mutate: updatePipelineItem } = useUpdatePipelineItem();
  const { mutate: movePipelineItem } = useMovePipelineItem();
  const { mutate: createActivityLog } = useCreateActivityLog();
  const { mutate: deletePipelineItem } = useDeletePipelineItem();
  const { data: activityData } = useActivityLogs({ 
    pipelineItemId, 
    page: 1, 
    pageSize: 10 
  }, {
    enabled: open, // Only fetch when dialog is open
    queryKey: ['activityLogs', { pipelineItemId, page: 1, pageSize: 10 }]
  });
  const router = useRouter();
  
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState<Partial<PipelineItem>>({});
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');

  // Initialize form data when pipeline item data is loaded
  React.useEffect(() => {
    if (pipelineItem) {
      setFormData({
        name: pipelineItem.name,
        title: pipelineItem.title,
        company: pipelineItem.company,
        bdr: pipelineItem.bdr,
        notes: pipelineItem.notes,
        email: pipelineItem.email,
        phone: pipelineItem.phone,
        link: pipelineItem.link,
        expectedCloseDate: pipelineItem.expectedCloseDate 
          ? formatDateForInput(pipelineItem.expectedCloseDate)
          : undefined,
      });
      
      setSelectedCategory(pipelineItem.category);
      setSelectedStatus(pipelineItem.status);
    }
  }, [pipelineItem]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData({ ...formData, [name]: value });
  };

  const handleSave = () => {
    if (!pipelineItem) return;

    const updatedItem = {
      ...pipelineItem,
      ...formData
    };
    
    updatePipelineItem(updatedItem, {
      onSuccess: () => {
        setEditMode(false);
        
        // Log the activity
        createActivityLog({
          bdr: pipelineItem.bdr,
          activityType: 'Note_Added',
          description: 'Updated pipeline item details',
          pipelineItemId: pipelineItem.id,
          notes: 'Details updated'
        });
      }
    });
  };

  const handleMoveItem = () => {
    if (!pipelineItem || selectedCategory === pipelineItem.category && selectedStatus === pipelineItem.status) return;
    
    movePipelineItem({
      id: pipelineItem.id,
      newCategory: selectedCategory,
      newStatus: selectedStatus
    }, {
      onSuccess: () => {
        toast.success(`Item moved to ${selectedStatus}`);
        onOpenChange(false);
      }
    });
  };

  const handleDeleteItem = () => {
    if (!pipelineItem) return;
    
    if (confirm('Are you sure you want to delete this pipeline item? This action cannot be undone.')) {
      deletePipelineItem(pipelineItem.id, {
        onSuccess: () => {
          toast.success('Pipeline item deleted successfully');
          onOpenChange(false);
          // Refresh the page to update the pipeline view
          router.refresh();
        },
        onError: () => {
          toast.error('Failed to delete pipeline item');
        }
      });
    }
  };

  // Handle category change and update available statuses
  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category);
    // Set the status to the first status in the new category
    const statuses = pipelineStatusEnum[category as keyof typeof pipelineStatusEnum];
    if (statuses && statuses.length > 0) {
      setSelectedStatus(statuses[0]);
    }
  };

  if (isLoading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Loading...</DialogTitle>
          </DialogHeader>
          <div className="h-40 flex items-center justify-center">
            Loading pipeline item details...
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (!pipelineItem) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Error</DialogTitle>
          </DialogHeader>
          <div>Pipeline item not found or error loading data.</div>
        </DialogContent>
      </Dialog>
    );
  }

  const activityLogs = activityData?.logs || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl flex items-center justify-between">
            <span>{editMode ? 'Edit ' : ''}{pipelineItem.name}</span>
            <div className="flex space-x-2">
              {editMode ? (
                <>
                  <Button variant="outline" size="sm" onClick={() => setEditMode(false)}>
                    Cancel
                  </Button>
                  <Button size="sm" onClick={handleSave}>
                    Save Changes
                  </Button>
                </>
              ) : (
                <>
                  <Button size="sm" onClick={() => setEditMode(true)}>
                    Edit
                  </Button>
                  <Button 
                    variant="destructive" 
                    size="sm" 
                    onClick={handleDeleteItem}
                    className="flex items-center gap-1"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </Button>
                </>
              )}
            </div>
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="details">
          <TabsList>
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="move">Move</TabsTrigger>
            <TabsTrigger value="activity">Activity Log ({activityLogs.length})</TabsTrigger>
          </TabsList>
          
          <TabsContent value="details" className="space-y-4 py-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Name</Label>
                {editMode ? (
                  <Input 
                    id="name" 
                    name="name" 
                    value={formData.name || ''} 
                    onChange={handleInputChange} 
                  />
                ) : (
                  <div className="p-2 border rounded-md">{pipelineItem.name}</div>
                )}
              </div>
              
              <div>
                <Label htmlFor="title">Title</Label>
                {editMode ? (
                  <Input 
                    id="title" 
                    name="title" 
                    value={formData.title || ''} 
                    onChange={handleInputChange} 
                  />
                ) : (
                  <div className="p-2 border rounded-md">{pipelineItem.title || 'N/A'}</div>
                )}
              </div>
              
              <div>
                <Label htmlFor="company">Company</Label>
                {editMode ? (
                  <Input 
                    id="company" 
                    name="company" 
                    value={formData.company || ''} 
                    onChange={handleInputChange} 
                  />
                ) : (
                  <div className="p-2 border rounded-md">{pipelineItem.company || 'N/A'}</div>
                )}
              </div>
              
              <div>
                <Label htmlFor="bdr">BDR</Label>
                <div className="p-2 border rounded-md">{pipelineItem.bdr}</div>
              </div>
              
              <div>
                <Label htmlFor="category">Category</Label>
                <div className="p-2 border rounded-md">{pipelineItem.category.replace('_', ' ')}</div>
              </div>
              
              <div>
                <Label htmlFor="status">Status</Label>
                <div className="p-2 border rounded-md">{pipelineItem.status}</div>
              </div>
              
              <div>
                <Label htmlFor="expectedCloseDate">Expected Close Date</Label>
                {editMode ? (
                  <Input 
                    id="expectedCloseDate" 
                    name="expectedCloseDate" 
                    type="date" 
                    value={formData.expectedCloseDate?.toString() || ''} 
                    onChange={handleInputChange} 
                  />
                ) : (
                  <div className="p-2 border rounded-md">
                    {pipelineItem.expectedCloseDate 
                      ? formatDateUK(pipelineItem.expectedCloseDate)
                      : 'N/A'}
                  </div>
                )}
              </div>
              
              <div>
                <Label htmlFor="phone">Phone</Label>
                {editMode ? (
                  <Input 
                    id="phone" 
                    name="phone" 
                    value={formData.phone || ''} 
                    onChange={handleInputChange} 
                  />
                ) : (
                  <div className="p-2 border rounded-md">{pipelineItem.phone || 'N/A'}</div>
                )}
              </div>
              
              <div>
                <Label htmlFor="email">Email</Label>
                {editMode ? (
                  <Input 
                    id="email" 
                    name="email" 
                    type="email"
                    value={formData.email || ''} 
                    onChange={handleInputChange} 
                  />
                ) : (
                  <div className="p-2 border rounded-md">{pipelineItem.email || 'N/A'}</div>
                )}
              </div>
              
              <div className="sm:col-span-2">
                <Label htmlFor="link">Link</Label>
                {editMode ? (
                  <Input 
                    id="link" 
                    name="link" 
                    value={formData.link || ''} 
                    onChange={handleInputChange} 
                  />
                ) : (
                  <div className="p-2 border rounded-md">
                    {pipelineItem.link ? (
                      <a href={pipelineItem.link} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                        {pipelineItem.link}
                      </a>
                    ) : 'N/A'}
                  </div>
                )}
              </div>
              
              <div className="sm:col-span-2">
                <Label htmlFor="notes">Notes</Label>
                {editMode ? (
                  <Textarea 
                    id="notes" 
                    name="notes" 
                    rows={5}
                    value={formData.notes || ''} 
                    onChange={handleInputChange} 
                  />
                ) : (
                  <div className="p-2 border rounded-md min-h-[100px] whitespace-pre-wrap">
                    {pipelineItem.notes || 'No notes available'}
                  </div>
                )}
              </div>
              
              <div className="sm:col-span-2">
                <Label>Added Date</Label>
                <div className="p-2 border rounded-md">
                  {formatDateUK(pipelineItem.addedDate)}
                </div>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="move" className="space-y-4 py-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="moveCategory">Select Category</Label>
                <Select
                  value={selectedCategory}
                  onValueChange={handleCategoryChange}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Category" />
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
                <Label htmlFor="moveStatus">Select Status</Label>
                <Select
                  value={selectedStatus}
                  onValueChange={(value) => setSelectedStatus(value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Status" />
                  </SelectTrigger>
                  <SelectContent>
                    {selectedCategory && pipelineStatusEnum[selectedCategory as keyof typeof pipelineStatusEnum]?.map((status) => (
                      <SelectItem key={`${selectedCategory}-${status}`} value={status}>
                        {status}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="mt-4 border rounded-md p-4 bg-muted/20">
              <p className="text-sm mb-2">
                Moving this item will:
              </p>
              <ul className="list-disc list-inside text-sm space-y-1 text-muted-foreground">
                <li>Change its category from <span className="font-medium">{pipelineItem.category}</span> to <span className="font-medium">{selectedCategory}</span></li>
                <li>Change its status from <span className="font-medium">{pipelineItem.status}</span> to <span className="font-medium">{selectedStatus}</span></li>
                <li>Create an activity log entry</li>
                <li>Maintain all other item details</li>
              </ul>
            </div>
            
            <div className="flex justify-end mt-4">
              <Button
                onClick={handleMoveItem}
                disabled={selectedCategory === pipelineItem.category && selectedStatus === pipelineItem.status}
              >
                Move Item
              </Button>
            </div>
          </TabsContent>
          
          <TabsContent value="activity" className="py-4">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Activity History</h3>
              
              {activityLogs.length === 0 ? (
                <p className="text-muted-foreground text-sm">No activity logs found for this item.</p>
              ) : (
                <div className="border rounded-md divide-y">
                  {activityLogs.map((log) => (
                    <div key={log.id} className="p-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium">{log.activityType.replace('_', ' ')}</p>
                          <p className="text-sm text-muted-foreground">{log.description}</p>
                        </div>
                        <div className="text-sm text-right">
                          <p>{formatDateUK(log.timestamp)}</p>
                          <p className="text-muted-foreground">{new Date(log.timestamp).toLocaleString('en-GB', { hour: '2-digit', minute: '2-digit' })}</p>
                        </div>
                      </div>
                      {log.notes && (
                        <p className="mt-2 text-sm bg-muted/20 p-2 rounded">{log.notes}</p>
                      )}
                      {(log.previousCategory && log.newCategory) && (
                        <p className="mt-1 text-xs text-muted-foreground">
                          Moved from {log.previousCategory} to {log.newCategory}
                        </p>
                      )}
                      {log.bdr && (
                        <p className="mt-1 text-xs text-muted-foreground">
                          By: {log.bdr}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
} 