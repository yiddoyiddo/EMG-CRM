'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { PipelineForm } from './pipeline-form';
import { PipelineItem } from '@/lib/hooks';
import { Plus } from 'lucide-react';

interface PipelineDialogProps {
  title: string;
  buttonLabel?: string;
  initialData?: PipelineItem;
  defaultCategory?: string;
  defaultStatus?: string;
  defaultBdr?: string;
  buttonVariant?: 'default' | 'outline' | 'secondary' | 'ghost' | 'link' | 'destructive';
  buttonSize?: 'default' | 'sm' | 'lg' | 'icon';
  buttonIcon?: boolean;
  className?: string;
  onSuccess?: () => void;
}

export function PipelineDialog({
  title,
  buttonLabel = 'Add Item',
  initialData,
  defaultCategory,
  defaultStatus,
  defaultBdr,
  buttonVariant = 'default',
  buttonSize = 'default',
  buttonIcon = false,
  className,
  onSuccess,
}: PipelineDialogProps) {
  const [open, setOpen] = useState(false);

  const handleSuccess = () => {
    setOpen(false);
    onSuccess?.();
  };

  return (
    <>
      <Button
        variant={buttonVariant}
        size={buttonSize}
        onClick={() => setOpen(true)}
        className={className}
      >
        {buttonIcon && <Plus className="h-4 w-4 mr-2" />}
        {buttonLabel}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-6xl max-h-[95vh] overflow-y-auto p-0">
          <DialogHeader className="px-8 pt-8 pb-0">
            <DialogTitle className="sr-only">{title}</DialogTitle>
          </DialogHeader>
          <div className="px-8 pb-8">
            <PipelineForm
              initialData={initialData}
              onSuccess={handleSuccess}
              onCancel={() => setOpen(false)}
              defaultCategory={defaultCategory}
              defaultStatus={defaultStatus}
              defaultBdr={defaultBdr}
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
} 