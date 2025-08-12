'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Form } from '@/components/ui/form';
import { Lead, LeadCreateInput, LeadUpdateInput } from '@/lib/hooks';
import { leadSchema } from '@/lib/validations';
import { Separator } from '@/components/ui/separator';
import {
  ContactInfoFields,
  BdrField,
  LeadSourceField,
  LeadStatusField,
  NotesField,
} from '@/components/ui/common-form-fields';

interface LeadFormProps {
  lead?: Lead;
  onSubmit: (data: LeadCreateInput | LeadUpdateInput) => void;
  onSaveAndAddToPipeline?: (data: LeadCreateInput | LeadUpdateInput) => void;
  isSubmitting?: boolean;
}

type FormData = z.infer<typeof leadSchema>;

export function LeadFormRefactored({ lead, onSubmit, isSubmitting }: LeadFormProps) {
  const isEditing = Boolean(lead);

  // Create form with validation
  const form = useForm<FormData>({
    resolver: zodResolver(leadSchema),
    defaultValues: {
      name: lead?.name || '',
      title: lead?.title || '',
      bdr: (lead?.bdr as string | null) || null,
      company: lead?.company || '',
      source: lead?.source || 'LinkedIn',
      status: lead?.status || 'BDR Followed Up',
      link: lead?.link || '',
      phone: lead?.phone || '',
      notes: lead?.notes || '',
      email: lead?.email || '',
    },
  });

  // Handle form submission
  function handleSubmit(values: FormData) {
    if (isEditing && lead) {
      onSubmit({
        id: lead.id,
        ...values,
      });
    } else {
      onSubmit(values);
    }
  }

  const handleAddBdr = (newBdr: string) => {
    // Update the form field with the new BDR
    form.setValue('bdr', newBdr);
    return true; // Assuming success for now
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        {/* Contact Information Section */}
        <div>
          <h3 className="text-lg font-medium mb-4">Contact Information</h3>
          <ContactInfoFields 
            control={form.control}
            nameField="name"
            titleField="title"
            companyField="company"
            emailField="email"
            phoneField="phone"
            linkField="link"
          />
        </div>

        <Separator />

        {/* Lead Management Section */}
        <div>
          <h3 className="text-lg font-medium mb-4">Lead Management</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <BdrField
              control={form.control}
              name="bdr"
              label="BDR Owner"
              onAddBdr={handleAddBdr}
              allowNone={true}
            />
            
            <LeadSourceField
              control={form.control}
              name="source"
              required={true}
            />
            
            <LeadStatusField
              control={form.control}
              name="status"
              required={true}
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
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting 
              ? 'Saving...' 
              : isEditing 
                ? 'Update Lead' 
                : 'Create Lead'
            }
          </Button>
        </div>
      </form>
    </Form>
  );
}