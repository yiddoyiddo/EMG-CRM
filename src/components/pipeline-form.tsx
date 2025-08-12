'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { PipelineItem, useBdrManager } from '@/lib/hooks';
import { 
  pipelineSchema, 
  pipelineCategoryEnum, 
  pipelineStatusEnum 
} from '@/lib/validations';
import { useRouter } from 'next/navigation';
import { AddBdrDialog } from '@/components/ui/add-bdr-dialog';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';

interface PipelineFormProps {
  initialData?: PipelineItem;
  onSuccess?: () => void;
  onCancel?: () => void;
  defaultCategory?: string;
  defaultStatus?: string;
  defaultBdr?: string;
}

type FormValues = z.infer<typeof pipelineSchema>;

export function PipelineForm({
  initialData,
  onSuccess,
  onCancel,
  defaultCategory,
  defaultStatus,
  defaultBdr,
}: PipelineFormProps) {
  const router = useRouter();
  const { bdrs, addBdr } = useBdrManager();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(
    initialData?.category || defaultCategory || null
  );
  const [duplicateInfo, setDuplicateInfo] = useState<{
    error: string;
    details: string;
    duplicateId: number;
    duplicateBdr: string;
    formValues: FormValues;
  } | null>(null);
  const [showDuplicateDialog, setShowDuplicateDialog] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(pipelineSchema),
    defaultValues: {
      name: initialData?.name || '',
      company: initialData?.company || '',
      bdr: initialData?.bdr || defaultBdr || '',
      category: initialData?.category || defaultCategory || 'Pipeline',
      status: initialData?.status || defaultStatus || 'Proposal - Media',
      value: initialData?.value || 0,
      notes: initialData?.notes || '',
      link: initialData?.link || '',
      phone: initialData?.phone || '',
      email: initialData?.email || '',
    },
  });

  // Watch category changes to update available statuses
  const watchedCategory = form.watch('category');
  useEffect(() => {
    setSelectedCategory(watchedCategory);
  }, [watchedCategory]);

  const onSubmit = async (values: FormValues) => {
    const submitData = {
      ...values,
      value: Number(values.value),
    };
    

    if (initialData) {
      // Update existing pipeline item
      try {
        const response = await fetch(`/api/pipeline/${initialData.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(submitData),
        });
        
        if (response.ok) {
          toast.success('Pipeline item updated successfully');
          onSuccess?.();
          router.push('/pipeline');
        } else {
          const error = await response.json();
          toast.error(error.error || 'Failed to update pipeline item');
        }
      } catch (error) {
        console.error('Error updating pipeline item:', error);
        toast.error('Failed to update pipeline item');
      }
    } else {
      // Create new pipeline item
      try {
        const response = await fetch('/api/pipeline', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(submitData),
        });
        
        if (response.ok) {
          toast.success('Pipeline item created successfully');
          onSuccess?.();
          router.push('/pipeline');
        } else if (response.status === 409) {
          // Handle duplicate detection
          const duplicateError = await response.json();
          if (duplicateError.type === 'DUPLICATE_LEAD') {
            setDuplicateInfo({
              error: duplicateError.error,
              details: duplicateError.details,
              duplicateId: duplicateError.duplicateId,
              duplicateBdr: duplicateError.duplicateBdr,
              formValues: values
            });
            setShowDuplicateDialog(true);
          } else {
            toast.error(duplicateError.error || 'Failed to create pipeline item');
          }
        } else {
          const error = await response.json();
          toast.error(error.error || 'Failed to create pipeline item');
        }
      } catch (error) {
        console.error('Error creating pipeline item:', error);
        toast.error('Failed to create pipeline item');
      }
    }
  };

  const handleAddBdr = (newBdr: string) => {
    const success = addBdr(newBdr);
    if (success) {
      // Update the form field with the new BDR
      form.setValue('bdr', newBdr);
    }
    return success;
  };

  const handleForceCreate = async () => {
    if (!duplicateInfo) return;
    
    try {
      const response = await fetch('/api/pipeline?force=true', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...duplicateInfo.formValues,
          value: Number(duplicateInfo.formValues.value),
        }),
      });
      
      if (response.ok) {
        toast.success('Pipeline item created successfully (duplicate allowed)');
        setShowDuplicateDialog(false);
        setDuplicateInfo(null);
        onSuccess?.();
        router.push('/pipeline');
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to create pipeline item');
      }
    } catch (error) {
      console.error('Error force creating pipeline item:', error);
      toast.error('Failed to create pipeline item');
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Name*</FormLabel>
                <FormControl>
                  <Input placeholder="John Doe" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="company"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Company</FormLabel>
                <FormControl>
                  <Input placeholder="Acme Inc." {...field} value={field.value || ''} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="bdr"
            render={({ field }) => (
              <FormItem>
                <FormLabel>BDR</FormLabel>
                <div className="flex gap-2">
                  <Select 
                    onValueChange={field.onChange} 
                    defaultValue={field.value}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Select BDR" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {bdrs.map((bdr) => (
                        <SelectItem key={bdr} value={bdr}>
                          {bdr}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <AddBdrDialog 
                    onAddBdr={handleAddBdr}
                  />
                </div>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="category"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Category</FormLabel>
                <Select 
                  onValueChange={field.onChange} 
                  defaultValue={field.value}
                  value={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select Category" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {pipelineCategoryEnum.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category.replace(/_/g, ', ')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="status"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Status</FormLabel>
                <Select 
                  onValueChange={field.onChange} 
                  defaultValue={field.value}
                  value={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select Status" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {selectedCategory && 
                      pipelineStatusEnum[selectedCategory as keyof typeof pipelineStatusEnum]?.map((status) => (
                        <SelectItem key={`${selectedCategory}-${status}`} value={status}>
                          {status}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <FormField
            control={form.control}
            name="value"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Deal Value ($)</FormLabel>
                <FormControl>
                  <Input type="number" placeholder="0.00" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Phone</FormLabel>
                <FormControl>
                  <Input placeholder="+1234567890" {...field} value={field.value || ''} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input placeholder="john@example.com" {...field} value={field.value || ''} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="link"
          render={({ field }) => (
            <FormItem>
              <FormLabel>LinkedIn Profile</FormLabel>
              <FormControl>
                <Input placeholder="https://linkedin.com/in/johndoe" {...field} value={field.value || ''} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notes</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Additional notes..."
                  className="min-h-[100px]"
                  {...field}
                  value={field.value || ''}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end space-x-2">
          <Button 
            variant="outline" 
            onClick={() => {
              onCancel?.();
              router.push('/pipeline');
            }} 
            type="button"
          >
            Cancel
          </Button>
          <Button type="submit">
            {initialData ? 'Update Pipeline Item' : 'Create Pipeline Item'}
          </Button>
        </div>
      </form>

      {/* Duplicate Detection Dialog */}
      <ConfirmDialog
        open={showDuplicateDialog}
        title="Duplicate Lead Detected"
        description={`${duplicateInfo?.details}\n\nDo you want to continue and create this as a duplicate entry, or would you like to cancel and review the existing lead?`}
        confirmLabel="Create Anyway"
        cancelLabel="Cancel"
        onConfirm={handleForceCreate}
        onOpenChange={(open) => {
          setShowDuplicateDialog(open);
          if (!open) {
            setDuplicateInfo(null);
          }
        }}
      />
    </Form>
  );
} 