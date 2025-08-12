'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Lead, useConvertLeadToPipeline } from '@/lib/hooks';
import { ArrowRightCircle } from 'lucide-react';
import { pipelineCategoryEnum, pipelineStatusEnum } from '@/lib/validations';

interface LeadToPipelineDialogProps {
  lead: Lead;
  onSuccess?: () => void;
}

export function LeadToPipelineDialog({
  lead,
  onSuccess,
}: LeadToPipelineDialogProps) {
  const [open, setOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>(pipelineCategoryEnum[0]);
  const [selectedStatus, setSelectedStatus] = useState<string>(pipelineStatusEnum.Pipeline[0]);
  const [error, setError] = useState<string | null>(null);

  const { mutate: convertLeadToPipeline, isPending } = useConvertLeadToPipeline();

  // Update selected status when category changes
  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category);
    const statuses = pipelineStatusEnum[category as keyof typeof pipelineStatusEnum];
    setSelectedStatus(statuses[0]);
    setError(null);
  };

  const handleConvert = () => {
    // Make sure we have a BDR assigned to the lead
    if (!lead.bdr) {
      setError("A BDR must be assigned to this lead before moving it to the pipeline");
      return;
    }

    convertLeadToPipeline(
      {
        leadId: lead.id,
        category: selectedCategory,
        status: selectedStatus,
      },
      {
        onSuccess: () => {
          setOpen(false);
          onSuccess?.();
        },
        onError: (err: any) => {
          setError(err.message || "Failed to move lead to pipeline");
        }
      }
    );
  };

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setOpen(true)}
        className="h-8 px-2"
        disabled={!lead.bdr}
        title={lead.bdr ? "Move to Pipeline" : "Assign a BDR before moving to pipeline"}
      >
        <ArrowRightCircle className="h-4 w-4 mr-1" />
        Pipeline
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Move to Pipeline</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              Select the pipeline category and status for <span className="font-medium">{lead.name}</span>.
            </p>
            
            {error && (
              <div className="bg-destructive/10 text-destructive text-sm p-2 rounded">
                {error}
              </div>
            )}
            
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Category</label>
                <Select 
                  value={selectedCategory} 
                  onValueChange={handleCategoryChange}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select Category" />
                  </SelectTrigger>
                  <SelectContent>
                    {pipelineCategoryEnum.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category.replace(/_/g, ', ')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="text-sm font-medium mb-1 block">Status</label>
                <Select 
                  value={selectedStatus} 
                  onValueChange={setSelectedStatus}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select Status" />
                  </SelectTrigger>
                  <SelectContent>
                    {selectedCategory && 
                      pipelineStatusEnum[selectedCategory as keyof typeof pipelineStatusEnum]?.map((status) => (
                        <SelectItem key={`${selectedCategory}-${status}`} value={status}>
                          {status}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block">Lead Information</label>
                <div className="text-sm bg-muted/50 p-3 rounded">
                  <p><span className="font-medium">BDR:</span> {lead.bdr || "Not assigned"}</p>
                  {lead.company && <p><span className="font-medium">Company:</span> {lead.company}</p>}
                  {lead.email && <p><span className="font-medium">Email:</span> {lead.email}</p>}
                  {lead.phone && <p><span className="font-medium">Phone:</span> {lead.phone}</p>}
                </div>
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
              Cancel
            </Button>
            <Button type="button" onClick={handleConvert} disabled={isPending}>
              {isPending ? "Moving..." : "Move to Pipeline"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
} 