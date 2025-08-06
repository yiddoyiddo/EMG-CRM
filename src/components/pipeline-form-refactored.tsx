'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Form } from '@/components/ui/form';
import { PipelineItem, useCreatePipelineItem, useUpdatePipelineItem } from '@/lib/hooks';
import { pipelineSchema } from '@/lib/validations';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Separator } from '@/components/ui/separator';
import {
  ContactInfoFields,
  BdrField,
  PipelineCategoryField,
  PipelineStatusField,
  ValueField,
  ProbabilityField,
  NotesField,
} from '@/components/ui/common-form-fields';

interface PipelineFormProps {
  initialData?: PipelineItem;
  onSuccess?: () => void;
  onCancel?: () => void;
  defaultCategory?: string;
  defaultStatus?: string;
  defaultBdr?: string;
}

type FormValues = z.infer<typeof pipelineSchema>;

export function PipelineFormRefactored({
  initialData,
  onSuccess,
  onCancel,
  defaultCategory,
  defaultStatus,
  defaultBdr,
}: PipelineFormProps) {
  const router = useRouter();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(
    initialData?.category || defaultCategory || null
  );

  // Use the appropriate mutation hook based on whether we're creating or updating
  const createPipelineItem = useCreatePipelineItem();
  const updatePipelineItem = useUpdatePipelineItem();

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

  const onSubmit = (values: FormValues) => {
    const submitData = {
      ...values,
      value: Number(values.value),
    };

    if (initialData) {
      // Update existing pipeline item
      updatePipelineItem.mutate(
        { id: initialData.id, ...submitData },
        {
          onSuccess: () => {
            toast.success('Pipeline item updated successfully');
            onSuccess?.();
            router.push('/pipeline');
          },
          onError: (error) => {
            toast.error('Failed to update pipeline item');
            console.error('Error updating pipeline item:', error);
          },
        }
      );
    } else {
      // Create new pipeline item
      createPipelineItem.mutate(
        submitData,
        {
          onSuccess: () => {
            toast.success('Pipeline item created successfully');
            onSuccess?.();
            router.push('/pipeline');
          },
          onError: (error) => {
            toast.error('Failed to create pipeline item');
            console.error('Error creating pipeline item:', error);
          },
        }
      );
    }
  };

  const handleAddBdr = (newBdr: string) => {
    // Update the form field with the new BDR
    form.setValue('bdr', newBdr);
    return true; // Assuming success for now
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Contact Information Section */}
        <div>
          <h3 className="text-lg font-medium mb-4">Contact Information</h3>
          <ContactInfoFields 
            control={form.control}
            nameField="name"
            companyField="company"
            emailField="email"
            phoneField="phone"
            linkField="link"
          />
        </div>

        <Separator />

        {/* Pipeline Management Section */}
        <div>
          <h3 className="text-lg font-medium mb-4">Pipeline Management</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <BdrField
              control={form.control}
              name="bdr"
              label="BDR"
              onAddBdr={handleAddBdr}
              allowNone={false}
            />
            
            <PipelineCategoryField
              control={form.control}
              name="category"
            />
            
            <PipelineStatusField
              control={form.control}
              name="status"
              category={selectedCategory || undefined}
            />

            <ValueField
              control={form.control}
              name="value"
            />

            <ProbabilityField
              control={form.control}
              name="probability"
            />
          </div>
        </div>

        <Separator />

        {/* Notes Section */}
        <div>
          <h3 className="text-lg font-medium mb-4">Additional Information</h3>
          <NotesField
            control={form.control}
            name="notes"
          />
        </div>

        {/* Form Actions */}
        <div className="flex justify-end space-x-2">
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          )}
          <Button 
            type="submit" 
            disabled={createPipelineItem.isPending || updatePipelineItem.isPending}
          >
            {createPipelineItem.isPending || updatePipelineItem.isPending
              ? 'Saving...'
              : initialData 
                ? 'Update Pipeline Item' 
                : 'Create Pipeline Item'
            }
          </Button>
        </div>
      </form>
    </Form>
  );
}