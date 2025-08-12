'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Plus } from 'lucide-react';

interface AddBdrDialogProps {
  onAddBdr: (bdr: string) => boolean;
  trigger?: React.ReactNode;
}

export function AddBdrDialog({ onAddBdr, trigger }: AddBdrDialogProps) {
  const [open, setOpen] = useState(false);
  const [newBdr, setNewBdr] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBdr.trim()) return;

    setIsSubmitting(true);
    const success = onAddBdr(newBdr.trim());
    
    if (success) {
      setNewBdr('');
      setOpen(false);
    }
    
    setIsSubmitting(false);
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      setNewBdr('');
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm" className="h-8 px-3 border-blue-300 bg-blue-50 hover:border-blue-400 hover:bg-blue-100 text-blue-700 font-medium">
            <Plus className="h-4 w-4 mr-1" />
            Add BDR
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add New BDR</DialogTitle>
          <DialogDescription>
            Enter the name of the new BDR to add to the system.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <label htmlFor="bdr-name" className="text-sm font-medium">
                BDR Name
              </label>
              <Input
                id="bdr-name"
                value={newBdr}
                onChange={(e) => setNewBdr(e.target.value)}
                placeholder="Enter BDR name..."
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!newBdr.trim() || isSubmitting}
            >
              {isSubmitting ? 'Adding...' : 'Add BDR'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
} 