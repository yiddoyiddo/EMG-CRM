'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';

interface BulkPipelineDialogProps {
  isOpen: boolean;
  onClose: () => void;
  selectedLeads: { id: number; bdr: string | null }[];
  onConvert: () => Promise<void>;
}

export function BulkPipelineDialog({
  isOpen,
  onClose,
  selectedLeads,
  onConvert,
}: BulkPipelineDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Group leads by BDR
  const leadsByBdr = selectedLeads.reduce<Record<string, number>>((acc, lead) => {
    if (lead.bdr) {
      acc[lead.bdr] = (acc[lead.bdr] || 0) + 1;
    }
    return acc;
  }, {});

  const unassignedCount = selectedLeads.filter(lead => !lead.bdr).length;

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);
      await onConvert();
      toast.success('Leads converted successfully');
      onClose();
    } catch (error) {
      toast.error('Failed to convert leads');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Convert Leads to Pipeline</DialogTitle>
          <div className="text-sm text-muted-foreground">
            {Object.entries(leadsByBdr).map(([bdr, count]) => (
              <div key={bdr}>
                {count} lead{count > 1 ? 's' : ''} for {bdr}
              </div>
            ))}
            {unassignedCount > 0 && (
              <div className="text-red-500">
                Warning: {unassignedCount} lead{unassignedCount > 1 ? 's' : ''} without BDR assignment
              </div>
            )}
          </div>
        </DialogHeader>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={isSubmitting || unassignedCount > 0}
          >
            Convert
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 