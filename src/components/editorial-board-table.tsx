'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { CalendarIcon, ExternalLink, Mail, Phone, Plus, Search, Trash2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';

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

interface EditorialBoardTableProps {
  items: EditorialBoardItem[];
  isLoading?: boolean;
  onRefresh: () => void;
  selectedBdr?: string;
  onBdrChange?: (bdr: string) => void;
  availableBdrs?: Array<{ id: string; name: string }>;
}

const statusConfig = {
  'LIST_OUT_QA_INTERVIEW_PROPOSED': { label: 'List Out/Q&A/Interview Proposed', color: 'bg-yellow-100 text-yellow-800' },
  'INTERVIEW_SCHEDULED': { label: 'Interview Scheduled', color: 'bg-blue-100 text-blue-800' },
  'INTERVIEW_COMPLETED': { label: 'Interview Completed', color: 'bg-purple-100 text-purple-800' },
  'QA_SUBMITTED': { label: 'Q&A Submitted', color: 'bg-orange-100 text-orange-800' },
  'QA_APPROVED': { label: 'Q&A Approved', color: 'bg-green-100 text-green-800' },
  'PUBLISHED': { label: 'Published', color: 'bg-emerald-100 text-emerald-800' },
  'DECLINED': { label: 'Declined', color: 'bg-red-100 text-red-800' },
};

export function EditorialBoardTable({ 
  items, 
  isLoading, 
  onRefresh, 
  selectedBdr, 
  onBdrChange, 
  availableBdrs 
}: EditorialBoardTableProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newItem, setNewItem] = useState<Partial<EditorialBoardItem>>({
    name: '',
    title: '',
    company: '',
    email: '',
    phone: '',
    status: 'LIST_OUT_QA_INTERVIEW_PROPOSED',
    notes: '',
    link: '',
    bdrId: selectedBdr || '',
  });

  const filteredItems = items.filter(item => {
    const matchesSearch = !searchQuery || 
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.company && item.company.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (item.email && item.email.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const handleAddItem = async () => {
    try {
      const response = await fetch('/api/editorial', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newItem),
      });

      if (!response.ok) {
        throw new Error('Failed to create editorial item');
      }

      toast.success('Editorial item created successfully');
      setIsAddDialogOpen(false);
      setNewItem({
        name: '',
        title: '',
        company: '',
        email: '',
        phone: '',
        status: 'LIST_OUT_QA_INTERVIEW_PROPOSED',
        notes: '',
        link: '',
        bdrId: selectedBdr || '',
      });
      onRefresh();
    } catch (error) {
      console.error('Error creating editorial item:', error);
      toast.error('Failed to create editorial item');
    }
  };

  const handleDeleteItem = async (id: number) => {
    if (!confirm('Are you sure you want to delete this editorial item?')) {
      return;
    }

    try {
      const response = await fetch(`/api/editorial/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete editorial item');
      }

      toast.success('Editorial item deleted successfully');
      onRefresh();
    } catch (error) {
      console.error('Error deleting editorial item:', error);
      toast.error('Failed to delete editorial item');
    }
  };

  const handleStatusUpdate = async (id: number, newStatus: string) => {
    try {
      const response = await fetch(`/api/editorial/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        throw new Error('Failed to update status');
      }

      toast.success('Status updated successfully');
      onRefresh();
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Failed to update status');
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                📝 Editorial Board
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Manage leads for list out, Q&A, and interview opportunities
              </p>
            </div>
            
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Editorial Item
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Add Editorial Item</DialogTitle>
                  <DialogDescription>
                    Create a new editorial board entry for a lead.
                  </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="name">Name *</Label>
                    <Input
                      id="name"
                      placeholder="Contact name"
                      value={newItem.name || ''}
                      onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="title">Title</Label>
                    <Input
                      id="title"
                      placeholder="Job title"
                      value={newItem.title || ''}
                      onChange={(e) => setNewItem({ ...newItem, title: e.target.value })}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="company">Company</Label>
                    <Input
                      id="company"
                      placeholder="Company name"
                      value={newItem.company || ''}
                      onChange={(e) => setNewItem({ ...newItem, company: e.target.value })}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="Email address"
                      value={newItem.email || ''}
                      onChange={(e) => setNewItem({ ...newItem, email: e.target.value })}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="status">Status</Label>
                    <Select
                      value={newItem.status}
                      onValueChange={(value) => setNewItem({ ...newItem, status: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(statusConfig).map(([key, config]) => (
                          <SelectItem key={key} value={key}>
                            {config.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {availableBdrs && (
                    <div>
                      <Label htmlFor="bdr">BDR</Label>
                      <Select
                        value={newItem.bdrId}
                        onValueChange={(value) => setNewItem({ ...newItem, bdrId: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select BDR" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableBdrs.map((bdr) => (
                            <SelectItem key={bdr.id} value={bdr.id}>
                              {bdr.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  
                  <div>
                    <Label htmlFor="notes">Notes</Label>
                    <Textarea
                      id="notes"
                      placeholder="Additional notes..."
                      value={newItem.notes || ''}
                      onChange={(e) => setNewItem({ ...newItem, notes: e.target.value })}
                      rows={3}
                    />
                  </div>
                  
                  <div className="flex gap-2 pt-4">
                    <Button onClick={handleAddItem} disabled={!newItem.name}>
                      Create Item
                    </Button>
                    <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Search by name, company, or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {Object.entries(statusConfig).map(([key, config]) => (
                  <SelectItem key={key} value={key}>
                    {config.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {availableBdrs && onBdrChange && (
              <Select value={selectedBdr || 'all'} onValueChange={onBdrChange}>
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All BDRs</SelectItem>
                  {availableBdrs.map((bdr) => (
                    <SelectItem key={bdr.id} value={bdr.id}>
                      {bdr.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>BDR</TableHead>
                  <TableHead>Last Updated</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      Loading editorial items...
                    </TableCell>
                  </TableRow>
                ) : filteredItems.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      {searchQuery || statusFilter !== 'all' 
                        ? 'No editorial items match your filters'
                        : 'No editorial items found'
                      }
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredItems.map((item) => (
                    <TableRow key={item.id} className="hover:bg-muted/50">
                      <TableCell>
                        <div>
                          <div className="font-medium">{item.name}</div>
                          {item.title && (
                            <div className="text-sm text-muted-foreground">{item.title}</div>
                          )}
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        <div>
                          <div>{item.company || 'Not specified'}</div>
                          {(item.lead || item.pipelineItem) && (
                            <div className="text-xs text-muted-foreground">
                              {item.lead && `Lead: ${item.lead.name}`}
                              {item.pipelineItem && `Pipeline: ${item.pipelineItem.name}`}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        <Select
                          value={item.status}
                          onValueChange={(value) => handleStatusUpdate(item.id, value)}
                        >
                          <SelectTrigger className="w-auto border-0 p-0 h-auto">
                            <Badge className={statusConfig[item.status as keyof typeof statusConfig]?.color}>
                              {statusConfig[item.status as keyof typeof statusConfig]?.label}
                            </Badge>
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(statusConfig).map(([key, config]) => (
                              <SelectItem key={key} value={key}>
                                {config.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      
                      <TableCell>
                        <div className="text-sm">
                          {item.bdr.name}
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        <div className="text-sm text-muted-foreground">
                          {formatDistanceToNow(new Date(item.lastUpdated), { addSuffix: true })}
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        <div className="flex gap-2">
                          {item.email && (
                            <a href={`mailto:${item.email}`} className="text-blue-500 hover:text-blue-700">
                              <Mail className="h-4 w-4" />
                            </a>
                          )}
                          {item.phone && (
                            <a href={`tel:${item.phone}`} className="text-blue-500 hover:text-blue-700">
                              <Phone className="h-4 w-4" />
                            </a>
                          )}
                          {item.link && (
                            <a href={item.link} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:text-blue-700">
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          )}
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteItem(item.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          
          <div className="flex items-center justify-between pt-4">
            <div className="text-sm text-muted-foreground">
              Showing {filteredItems.length} of {items.length} editorial items
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}