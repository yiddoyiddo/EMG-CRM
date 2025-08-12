'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Lead, useUpdateLead, useDeleteLead } from '@/lib/hooks';
import { leadStatusEnum } from '@/lib/validations';
import { format } from 'date-fns';
import { useRouter } from 'next/navigation';
import { ExternalLink, Trash2 } from 'lucide-react';
import { NotesPopover } from '@/components/ui/notes-popover';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface KanbanViewProps {
  leads: Lead[];
}

export function KanbanView({ leads }: KanbanViewProps) {
  const [draggingId, setDraggingId] = useState<number | null>(null);
  const { mutate: updateLead } = useUpdateLead();
  const { mutate: deleteLead } = useDeleteLead();
  const router = useRouter();

  // Group leads by status
  const leadsByStatus = leadStatusEnum.reduce<Record<string, Lead[]>>(
    (acc, status) => {
      acc[status] = leads.filter(lead => lead.status === status);
      return acc;
    },
    {} as Record<string, Lead[]>
  );

  // Handlers for drag and drop
  const handleDragStart = (id: number) => {
    setDraggingId(id);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, status: string) => {
    e.preventDefault();
    
    if (draggingId === null) return;
    
    const lead = leads.find(l => l.id === draggingId);
    if (!lead || lead.status === status) return;
    
    // Update the lead status
    updateLead({
      ...lead,
      status: status as typeof leadStatusEnum[number]
    });
    
    setDraggingId(null);
  };

  const handleLeadClick = (id: number) => {
    router.push(`/leads/${id}`);
  };

  const handleDeleteLead = (e: React.MouseEvent, lead: Lead) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this lead? This action cannot be undone.')) {
      deleteLead(lead.id, {
        onSuccess: () => {
          toast.success('Lead deleted successfully');
          router.refresh();
        },
        onError: () => {
          toast.error('Failed to delete lead');
        }
      });
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {leadStatusEnum.map(status => (
        <div 
          key={status}
          className="flex flex-col"
          onDragOver={handleDragOver}
          onDrop={(e) => handleDrop(e, status)}
        >
          <div className="bg-card rounded-lg p-4 mb-4 shadow-sm border">
            <h3 className="text-lg font-semibold">{status}</h3>
            <p className="text-muted-foreground text-sm mt-1">
              {leadsByStatus[status]?.length || 0} leads
            </p>
          </div>
          
          <div className="space-y-4 min-h-[200px]">
            {leadsByStatus[status]?.map(lead => (
              <Card 
                key={lead.id}
                draggable
                onDragStart={() => handleDragStart(lead.id)}
                onClick={() => handleLeadClick(lead.id)}
                className="cursor-pointer hover:shadow-md transition-all duration-200 hover:translate-y-[-2px]"
              >
                <CardHeader className="p-4 pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base font-medium">{lead.name}</CardTitle>
                    <div className="flex items-center space-x-2">
                      {lead.notes && <NotesPopover notes={lead.notes} />}
                      {lead.link && (
                        <a 
                          href={lead.link} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-500 hover:text-blue-700 transition-colors"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={(e) => handleDeleteLead(e, lead)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-4 pt-0 space-y-2">
                  {lead.company && (
                    <div className="text-sm text-muted-foreground flex items-center gap-1">
                      <span className="font-medium">Company:</span> {lead.company}
                    </div>
                  )}
                  {lead.title && (
                    <div className="text-sm text-muted-foreground flex items-center gap-1">
                      <span className="font-medium">Title:</span> {lead.title}
                    </div>
                  )}
                  <div className="text-xs text-muted-foreground flex items-center gap-1">
                    <span className="font-medium">Added:</span> {format(new Date(lead.addedDate), 'MMM d, yyyy')}
                  </div>
                  {lead.bdr && (
                    <div className="text-xs font-medium flex items-center gap-1 mt-2 bg-primary/10 text-primary rounded-full px-2 py-1 w-fit">
                      <span>BDR:</span> {lead.bdr}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
            {leadsByStatus[status]?.length === 0 && (
              <div className="text-center text-muted-foreground text-sm p-4 border border-dashed rounded-lg">
                No leads in this status
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
} 