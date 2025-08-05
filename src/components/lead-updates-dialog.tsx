'use client';

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { MessageSquare, Send, Clock, User } from 'lucide-react';
import { useActivityLogs, useCreateActivityLog, Lead } from '@/lib/hooks';
import { formatDistanceToNow, format } from 'date-fns';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { ActivityLogsSkeleton } from '@/components/ui/activity-log-skeleton';

interface LeadUpdatesDialogProps {
  lead: Lead;
  trigger?: React.ReactNode;
}

export function LeadUpdatesDialog({ lead, trigger }: LeadUpdatesDialogProps) {
  const [open, setOpen] = useState(false);
  
  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    // Don't trigger any navigation when dialog closes
    if (!newOpen) {
      // Prevent any navigation by stopping event propagation
      const event = new CustomEvent('closeAllDialogs');
      window.dispatchEvent(event);
    }
  };
  const [updateText, setUpdateText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch activity logs for this lead - only when dialog is open
  const { data: activityLogsData, refetch } = useActivityLogs({
    leadId: lead.id,
    page: 1,
    pageSize: 50,
  }, {
    enabled: open, // Only fetch when dialog is open
    queryKey: ['activityLogs', { leadId: lead.id, page: 1, pageSize: 50 }]
  });

  const { mutate: createActivityLog } = useCreateActivityLog();

  // Filter for BDR updates and other relevant activities
  const relevantActivities = activityLogsData?.logs?.filter(log => 
    log.activityType === 'BDR_Update' || 
    log.activityType === 'Note_Added' ||
    log.activityType === 'Status_Change' ||
    log.activityType === 'Lead_Created'
  ) || [];

  const handleSubmitUpdate = async () => {
    if (!updateText.trim()) {
      toast.error('Please enter an update message');
      return;
    }

    setIsSubmitting(true);
    
    createActivityLog({
      bdr: (lead.bdr as any) || 'Dan Reeves',
      activityType: 'BDR_Update',
      description: 'BDR added an update',
      notes: updateText.trim(),
      leadId: lead.id,
    }, {
      onSuccess: () => {
        toast.success('Update added successfully');
        setUpdateText('');
        refetch();
      },
      onError: (error) => {
        toast.error('Failed to add update');
        console.error('Error adding update:', error);
      },
      onSettled: () => {
        setIsSubmitting(false);
      }
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSubmitUpdate();
    }
  };

  const getActivityIcon = (activityType: string) => {
    switch (activityType) {
      case 'BDR_Update':
        return <MessageSquare className="h-4 w-4 text-blue-600" />;
      case 'Status_Change':
        return <Clock className="h-4 w-4 text-orange-600" />;
      case 'Lead_Created':
        return <Clock className="h-4 w-4 text-green-600" />;
      default:
        return <User className="h-4 w-4 text-gray-600" />;
    }
  };

  const getActivityBadgeColor = (activityType: string) => {
    switch (activityType) {
      case 'BDR_Update':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'Status_Change':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
      case 'Lead_Created':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const defaultTrigger = (
    <Button variant="outline" size="sm" className="h-8 px-2">
      <MessageSquare className="h-4 w-4 mr-1" />
      Updates
      {relevantActivities.length > 0 && (
        <Badge variant="secondary" className="ml-2 h-5 text-xs">
          {relevantActivities.length}
        </Badge>
      )}
    </Button>
  );

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <div onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
          setOpen(true);
        }}>
          {trigger || defaultTrigger}
        </div>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Updates for {lead.name}
          </DialogTitle>
          <DialogDescription>
            Add updates and view the timeline for this lead
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 flex-1 min-h-0 overflow-hidden">
          {/* Add Update Section */}
          <div className="space-y-3 flex-shrink-0">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">{lead.bdr || 'Unknown'}</span>
            </div>
            <Textarea
              placeholder="What's the latest update on this lead? (Ctrl/Cmd + Enter to send)"
              value={updateText}
              onChange={(e) => setUpdateText(e.target.value)}
              onKeyDown={handleKeyDown}
              className="min-h-[80px] resize-none"
            />
            <div className="flex justify-end">
              <Button 
                onClick={handleSubmitUpdate}
                disabled={isSubmitting || !updateText.trim()}
                size="sm"
                className="gap-2"
              >
                <Send className="h-4 w-4" />
                {isSubmitting ? 'Adding...' : 'Add Update'}
              </Button>
            </div>
          </div>

          <Separator className="flex-shrink-0" />

          {/* Timeline Section */}
          <div className="flex-1 min-h-0 flex flex-col">
            <h4 className="text-sm font-medium mb-3 flex items-center gap-2 flex-shrink-0">
              <Clock className="h-4 w-4" />
              Timeline ({relevantActivities.length} {relevantActivities.length === 1 ? 'update' : 'updates'})
            </h4>
            <div className="flex-1 min-h-0 overflow-y-auto">
              {!activityLogsData ? (
                <ActivityLogsSkeleton count={3} />
              ) : relevantActivities.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No updates yet</p>
                  <p className="text-xs">Be the first to add an update!</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {relevantActivities.map((activity, index) => (
                    <div key={activity.id} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                          {getActivityIcon(activity.activityType)}
                        </div>
                        {index < relevantActivities.length - 1 && (
                          <div className="mt-2 h-full w-px bg-border" />
                        )}
                      </div>
                      <div className="flex-1 space-y-2 pb-4">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-sm">{activity.bdr}</span>
                          <Badge 
                            variant="secondary" 
                            className={`text-xs ${getActivityBadgeColor(activity.activityType)}`}
                          >
                            {activity.activityType === 'BDR_Update' ? 'Update' : activity.activityType.replace('_', ' ')}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {activity.description}
                        </p>
                        {activity.notes && (
                          <div className="bg-muted/50 rounded-md p-3">
                            <p className="text-sm whitespace-pre-wrap">{activity.notes}</p>
                          </div>
                        )}
                        <div className="text-xs text-muted-foreground">
                          {format(new Date(activity.timestamp), 'PPP p')}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
} 