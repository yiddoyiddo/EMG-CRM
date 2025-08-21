'use client';

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Lead, useLead, useUpdateLead, useCreateActivityLog, useActivityLogs, useDeleteLead } from '@/lib/hooks';
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
import { leadSourceEnum, leadStatusEnum } from '@/lib/validations';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Trash2, ExternalLink, Clock, User, Building2, Mail, Phone, LinkIcon, StickyNote } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { LeadToPipelineDialog } from './lead-to-pipeline-dialog';

interface LeadDetailProps {
  leadId: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function LeadDetail({ leadId, open, onOpenChange }: LeadDetailProps) {
  const { data: lead, isLoading } = useLead(leadId);
  const { mutate: updateLead } = useUpdateLead();
  const { mutate: createActivityLog } = useCreateActivityLog();
  const { mutate: deleteLead } = useDeleteLead();
  const { data: activityData } = useActivityLogs({ 
    leadId, 
    page: 1, 
    pageSize: 20 
  }, {
    enabled: open, // Only fetch when dialog is open
    queryKey: ['activityLogs', { leadId, page: 1, pageSize: 20 }]
  });
  const router = useRouter();
  
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState<Partial<Lead>>({});

  // Initialize form data when lead data is loaded
  React.useEffect(() => {
    if (lead) {
      setFormData({
        name: lead.name,
        title: lead.title,
        company: lead.company,
        bdr: lead.bdr,
        source: lead.source,
        status: lead.status,
        notes: lead.notes,
        email: lead.email,
        phone: lead.phone,
        link: lead.link,
        isLeadGen: lead.isLeadGen,
      });
    }
  }, [lead]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSelectChange = (name: string, value: string | boolean) => {
    setFormData({ ...formData, [name]: value });
  };

  const handleSave = () => {
    if (!lead) return;

    const updatedLead = {
      ...lead,
      ...formData
    };
    
    updateLead(updatedLead, {
      onSuccess: () => {
        setEditMode(false);
        
        // Log the activity
        createActivityLog({
          bdr: lead.bdr || 'System',
          activityType: 'Note_Added',
          description: 'Updated lead details',
          leadId: lead.id,
          notes: 'Lead details updated'
        });
      }
    });
  };

  const handleDeleteLead = () => {
    if (!lead) return;
    
    if (confirm('Are you sure you want to delete this lead? This action cannot be undone.')) {
      deleteLead(lead.id, {
        onSuccess: () => {
          toast.success('Lead deleted successfully');
          onOpenChange(false);
          // Refresh the page to update the leads view
          router.refresh();
        },
        onError: () => {
          toast.error('Failed to delete lead');
        }
      });
    }
  };

  if (isLoading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Loading...</DialogTitle>
          </DialogHeader>
          <div className="h-40 flex items-center justify-center">
            Loading lead details...
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (!lead) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Error</DialogTitle>
          </DialogHeader>
          <div>Lead not found or error loading data.</div>
        </DialogContent>
      </Dialog>
    );
  }

  const activityLogs = activityData?.logs || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-white/70 dark:bg-white/[0.06] backdrop-blur-xl border border-white/20 dark:border-white/10">
        <DialogHeader>
          <DialogTitle className="text-xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <User className="h-6 w-6 text-blue-500" />
              <span>{editMode ? 'Edit ' : ''}{lead.name}</span>
              {lead.inPipeline && (
                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                  In Pipeline
                </Badge>
              )}
            </div>
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
                  <LeadToPipelineDialog lead={lead} />
                  <Button size="sm" onClick={() => setEditMode(true)}>
                    Edit
                  </Button>
                  <Button 
                    variant="destructive" 
                    size="sm" 
                    onClick={handleDeleteLead}
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
            <TabsTrigger value="activity">Activity Log ({activityLogs.length})</TabsTrigger>
          </TabsList>
          
          <TabsContent value="details" className="space-y-6 py-4">
            {/* Contact Information Section */}
            <div className="rounded-lg border bg-card p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <User className="h-5 w-5 text-blue-500" />
                Contact Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name" className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
                    <User className="h-4 w-4" />
                    Name *
                  </Label>
                  {editMode ? (
                    <Input 
                      id="name" 
                      name="name" 
                      value={formData.name || ''} 
                      onChange={handleInputChange} 
                      className="w-full"
                    />
                  ) : (
                    <div className="p-3 border rounded-md bg-gray-50 dark:bg-gray-800 font-medium">
                      {lead.name}
                    </div>
                  )}
                </div>
                
                <div>
                  <Label htmlFor="title" className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
                    <User className="h-4 w-4" />
                    Title
                  </Label>
                  {editMode ? (
                    <Input 
                      id="title" 
                      name="title" 
                      value={formData.title || ''} 
                      onChange={handleInputChange} 
                      className="w-full"
                    />
                  ) : (
                    <div className="p-3 border rounded-md bg-gray-50 dark:bg-gray-800">
                      {lead.title || 'N/A'}
                    </div>
                  )}
                </div>
                
                <div>
                  <Label htmlFor="email" className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
                    <Mail className="h-4 w-4" />
                    Email
                  </Label>
                  {editMode ? (
                    <Input 
                      id="email" 
                      name="email" 
                      type="email"
                      value={formData.email || ''} 
                      onChange={handleInputChange} 
                      className="w-full"
                    />
                  ) : (
                    <div className="p-3 border rounded-md bg-gray-50 dark:bg-gray-800">
                      {lead.email ? (
                        <a href={`mailto:${lead.email}`} className="text-blue-600 hover:underline flex items-center gap-1">
                          {lead.email}
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      ) : 'N/A'}
                    </div>
                  )}
                </div>
                
                <div>
                  <Label htmlFor="phone" className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
                    <Phone className="h-4 w-4" />
                    Phone
                  </Label>
                  {editMode ? (
                    <Input 
                      id="phone" 
                      name="phone" 
                      value={formData.phone || ''} 
                      onChange={handleInputChange} 
                      className="w-full"
                    />
                  ) : (
                    <div className="p-3 border rounded-md bg-gray-50 dark:bg-gray-800">
                      {lead.phone ? (
                        <a href={`tel:${lead.phone}`} className="text-blue-600 hover:underline">
                          {lead.phone}
                        </a>
                      ) : 'N/A'}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Company Information Section */}
            <div className="rounded-lg border bg-card p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Building2 className="h-5 w-5 text-green-500" />
                Company Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="company" className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
                    <Building2 className="h-4 w-4" />
                    Company
                  </Label>
                  {editMode ? (
                    <Input 
                      id="company" 
                      name="company" 
                      value={formData.company || ''} 
                      onChange={handleInputChange} 
                      className="w-full"
                    />
                  ) : (
                    <div className="p-3 border rounded-md bg-gray-50 dark:bg-gray-800">
                      {lead.company || 'N/A'}
                    </div>
                  )}
                </div>
                
                <div>
                  <Label htmlFor="link" className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
                    <LinkIcon className="h-4 w-4" />
                    Website/Link
                  </Label>
                  {editMode ? (
                    <Input 
                      id="link" 
                      name="link" 
                      value={formData.link || ''} 
                      onChange={handleInputChange} 
                      className="w-full"
                    />
                  ) : (
                    <div className="p-3 border rounded-md bg-gray-50 dark:bg-gray-800">
                      {lead.link ? (
                        <a href={lead.link} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline flex items-center gap-1">
                          {lead.link}
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      ) : 'N/A'}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Lead Management Section */}
            <div className="rounded-lg border bg-card p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Clock className="h-5 w-5 text-orange-500" />
                Lead Management
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div>
                  <Label htmlFor="status" className="text-sm font-medium text-gray-700 mb-1 block">Status</Label>
                  {editMode ? (
                    <Select
                      value={formData.status || ''}
                      onValueChange={(value) => handleSelectChange('status', value)}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select Status" />
                      </SelectTrigger>
                      <SelectContent>
                        {leadStatusEnum.map((status) => (
                          <SelectItem key={status} value={status}>
                            {status}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <div className="p-3 border rounded-md bg-gray-50 dark:bg-gray-800">
                      <Badge variant="secondary">{lead.status}</Badge>
                    </div>
                  )}
                </div>
                
                <div>
                  <Label htmlFor="source" className="text-sm font-medium text-gray-700 mb-1 block">Source</Label>
                  {editMode ? (
                    <Select
                      value={formData.source || ''}
                      onValueChange={(value) => handleSelectChange('source', value)}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select Source" />
                      </SelectTrigger>
                      <SelectContent>
                        {leadSourceEnum.map((source) => (
                          <SelectItem key={source} value={source}>
                            {source}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <div className="p-3 border rounded-md bg-gray-50 dark:bg-gray-800">
                      <Badge variant="outline">{lead.source}</Badge>
                    </div>
                  )}
                </div>
                
                <div>
                  <Label htmlFor="bdr" className="text-sm font-medium text-gray-700 mb-1 block">Assigned BDR</Label>
                  <div className="p-3 border rounded-md bg-gray-50 dark:bg-gray-800">
                    <Badge variant="default">{lead.bdr || 'Unassigned'}</Badge>
                  </div>
                </div>
              </div>
              
              {/* Lead Gen Toggle */}
              <div className="flex items-center space-x-3 p-3 rounded-md border bg-blue-50 dark:bg-blue-900/20">
                <div className="flex items-center space-x-2">
                  {editMode ? (
                    <input
                      type="checkbox"
                      id="isLeadGen"
                      checked={Boolean(formData.isLeadGen)}
                      onChange={(e) => handleSelectChange('isLeadGen', e.target.checked)}
                      className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                  ) : (
                    <input
                      type="checkbox"
                      checked={Boolean(lead.isLeadGen)}
                      disabled
                      className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                    />
                  )}
                  <Label htmlFor="isLeadGen" className="text-sm font-medium text-blue-800 dark:text-blue-200">
                    Lead Gen Team Lead
                  </Label>
                </div>
                {lead.isLeadGen && (
                  <Badge variant="secondary" className="bg-blue-100 text-blue-800 border-blue-200">
                    Lead Gen
                  </Badge>
                )}
              </div>
            </div>

            {/* Notes Section */}
            <div className="rounded-lg border bg-card p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <StickyNote className="h-5 w-5 text-purple-500" />
                Notes
              </h3>
              {editMode ? (
                <Textarea 
                  id="notes" 
                  name="notes" 
                  rows={6}
                  value={formData.notes || ''} 
                  onChange={handleInputChange} 
                  placeholder="Add your notes about this lead..."
                  className="w-full"
                />
              ) : (
                <div className="p-4 border rounded-md bg-gray-50 dark:bg-gray-800 min-h-[120px] whitespace-pre-wrap">
                  {lead.notes || 'No notes available'}
                </div>
              )}
            </div>

            {/* Timeline Information */}
            <div className="rounded-lg border bg-card p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Clock className="h-5 w-5 text-gray-500" />
                Timeline
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-1 block">Date Added</Label>
                  <div className="p-3 border rounded-md bg-gray-50 dark:bg-gray-800">
                    {formatDateUK(lead.addedDate)}
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-1 block">Last Updated</Label>
                  <div className="p-3 border rounded-md bg-gray-50 dark:bg-gray-800">
                    {formatDateUK(lead.lastUpdated)}
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="activity" className="py-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Activity History</h3>
                <Badge variant="outline">{activityLogs.length} entries</Badge>
              </div>
              
              {activityLogs.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No activity logs found for this lead.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {activityLogs.map((log) => (
                    <div key={log.id} className="border rounded-lg p-4 bg-card">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="text-xs">
                            {log.activityType.replace('_', ' ')}
                          </Badge>
                          <span className="text-sm text-muted-foreground">
                            by {log.bdr}
                          </span>
                        </div>
                        <div className="text-sm text-right text-muted-foreground">
                          <div>{formatDateUK(log.timestamp)}</div>
                          <div className="text-xs">{new Date(log.timestamp).toLocaleString('en-GB', { hour: '2-digit', minute: '2-digit' })}</div>
                        </div>
                      </div>
                      
                      <p className="text-sm font-medium mb-1">{log.description}</p>
                      
                      {log.notes && (
                        <div className="mt-2 p-2 bg-muted/20 rounded text-sm">
                          {log.notes}
                        </div>
                      )}
                      
                      {(log.previousStatus && log.newStatus) && (
                        <div className="mt-2 text-xs text-muted-foreground">
                          Status changed from <Badge variant="outline" className="mx-1 text-xs">{log.previousStatus}</Badge> to <Badge variant="outline" className="mx-1 text-xs">{log.newStatus}</Badge>
                        </div>
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