'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useEffect, useCallback, useMemo } from 'react';
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
import { Lead, LeadCreateInput, LeadUpdateInput, useBdrManager } from '@/lib/hooks';
import { leadSchema, leadSourceEnum, leadStatusEnum } from '@/lib/validations';
import { useRouter } from 'next/navigation';
import { AddBdrDialog } from '@/components/ui/add-bdr-dialog';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { useDuplicateDetection } from '@/lib/hooks/use-duplicate-detection';
import { DuplicateWarningDialog } from '@/components/duplicate-warning-dialog';
import { useDebounce } from '@/lib/hooks/use-debounce';

interface LeadFormProps {
  lead?: Lead;
  onSubmit: (data: LeadCreateInput | LeadUpdateInput) => void;
  onSaveAndAddToPipeline?: (data: LeadCreateInput | LeadUpdateInput) => void;
  isSubmitting?: boolean;
}

type FormData = z.infer<typeof leadSchema>;

export function LeadForm({ lead, onSubmit, onSaveAndAddToPipeline, isSubmitting }: LeadFormProps) {
  const router = useRouter();
  const isEditing = Boolean(lead);
  const { bdrs, addBdr } = useBdrManager();
  
  // Duplicate detection
  const {
    isChecking,
    currentWarning,
    isWarningOpen,
    isProcessing,
    checkDuplicates,
    handleProceed,
    handleCancel,
    closeWarning,
    reset: resetDuplicateState,
    hasWarning,
  } = useDuplicateDetection({
    onDecisionMade: (decision, warningId) => {
      console.log(`Duplicate decision: ${decision} for warning ${warningId}`);
    }
  });

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

  // Watch form values for duplicate checking
  const formValues = form.watch();
  
  // Debounced values for duplicate checking
  const debouncedName = useDebounce(formValues.name || '', 500);
  const debouncedEmail = useDebounce(formValues.email || '', 500);
  const debouncedCompany = useDebounce(formValues.company || '', 500);
  const debouncedPhone = useDebounce(formValues.phone || '', 500);
  const debouncedLinkedIn = useDebounce(formValues.link || '', 500);

  // Create duplicate check input
  const duplicateCheckInput = useMemo(() => ({
    name: debouncedName,
    email: debouncedEmail,
    company: debouncedCompany,
    phone: debouncedPhone,
    linkedinUrl: debouncedLinkedIn,
    title: formValues.title || undefined,
  }), [debouncedName, debouncedEmail, debouncedCompany, debouncedPhone, debouncedLinkedIn, formValues.title]);

  // Auto-check for duplicates when form values change (but not when editing existing lead)
  useEffect(() => {
    if (!isEditing && (debouncedName || debouncedEmail || debouncedCompany)) {
      const hasMinimumData = debouncedName.length >= 2 || 
                            debouncedEmail.length >= 5 || 
                            debouncedCompany.length >= 2;
                            
      if (hasMinimumData) {
        checkDuplicates(duplicateCheckInput, 'LEAD_CREATE');
      }
    }
  }, [duplicateCheckInput, isEditing, checkDuplicates, debouncedName, debouncedEmail, debouncedCompany]);

  // Handle form submission with duplicate checking
  const handleSubmitWithDuplicateCheck = useCallback(async (values: FormData) => {
    // Reset any previous duplicate state
    resetDuplicateState();
    
    // If editing, skip duplicate check and submit directly
    if (isEditing && lead) {
      onSubmit({
        id: lead.id,
        ...values,
      });
      return;
    }

    // For new leads, check for duplicates first
    const duplicateResult = await checkDuplicates({
      name: values.name,
      email: values.email || undefined,
      company: values.company || undefined,
      phone: values.phone || undefined,
      linkedinUrl: values.link || undefined,
      title: values.title || undefined,
    }, 'LEAD_CREATE');

    // If no warning or user already handled warning, submit
    if (!duplicateResult?.hasWarning) {
      onSubmit(values);
    }
    // If there's a warning, the dialog will handle the flow
  }, [isEditing, lead, onSubmit, checkDuplicates, resetDuplicateState]);

  // Handle duplicate proceed - submit the form
  const handleDuplicateProceed = useCallback(async (reason?: string) => {
    const success = await handleProceed(reason);
    if (success) {
      // Get current form values and submit
      const currentValues = form.getValues();
      onSubmit(currentValues);
    }
  }, [handleProceed, form, onSubmit]);

  // Handle duplicate cancel - just close dialog
  const handleDuplicateCancel = useCallback(async () => {
    await handleCancel();
    // Form stays as-is, user can modify and try again
  }, [handleCancel]);

  // Handle form submission
  function handleSubmit(values: FormData) {
    handleSubmitWithDuplicateCheck(values);
  }

  const handleAddBdr = (newBdr: string) => {
    const success = addBdr(newBdr);
    if (success) {
      // Update the form field with the new BDR
      form.setValue('bdr', newBdr);
    }
    return success;
  };

  return (
    <>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
          {/* Duplicate checking indicator */}
          {!isEditing && (isChecking || hasWarning) && (
            <div className="mb-4">
              {isChecking && (
                <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                  <span className="text-sm text-blue-700">Checking for duplicates...</span>
                </div>
              )}
              {hasWarning && !isChecking && (
                <div className="flex items-center gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <AlertTriangle className="h-4 w-4 text-yellow-600" />
                  <span className="text-sm text-yellow-700">
                    Potential duplicates detected. Review warning before submitting.
                  </span>
                  <Badge variant="outline" className="ml-auto">
                    {currentWarning?.matches.length} match(es)
                  </Badge>
                </div>
              )}
            </div>
          )}
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Name */}
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Name*</FormLabel>
                <FormControl>
                  <Input placeholder="John Doe" {...field} className="h-10 bg-white/60 dark:bg-white/[0.04] backdrop-blur placeholder:text-muted-foreground/70" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Title */}
          <FormField
            control={form.control}
            name="title"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Title</FormLabel>
                <FormControl>
                  <Input placeholder="CEO" {...field} value={field.value || ''} className="h-10 bg-white/60 dark:bg-white/[0.04] backdrop-blur placeholder:text-muted-foreground/70" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Company */}
          <FormField
            control={form.control}
            name="company"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Company</FormLabel>
                <FormControl>
                  <Input placeholder="Acme Inc." {...field} value={field.value || ''} className="h-10 bg-white/60 dark:bg-white/[0.04] backdrop-blur placeholder:text-muted-foreground/70" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* BDR */}
          <FormField
            control={form.control}
            name="bdr"
            render={({ field }) => (
              <FormItem>
                <FormLabel>BDR Owner</FormLabel>
                <div className="flex gap-2 items-center">
                  <Select
                    onValueChange={(value) => field.onChange(value === "none" ? null : value)}
                    value={field.value || "none"}
                  >
                    <FormControl>
                      <SelectTrigger className="flex-1 h-10 bg-white/60 dark:bg-white/[0.04] backdrop-blur">
                        <SelectValue placeholder="Select a BDR" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
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

          {/* Source */}
          <FormField
            control={form.control}
            name="source"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Source*</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  value={field.value}
                >
                  <FormControl>
                    <SelectTrigger className="h-10 bg-white/60 dark:bg-white/[0.04] backdrop-blur">
                      <SelectValue placeholder="Select a source" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {leadSourceEnum.map((source) => (
                      <SelectItem key={source} value={source}>
                        {source}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Status */}
          <FormField
            control={form.control}
            name="status"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Status*</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  value={field.value}
                >
                  <FormControl>
                    <SelectTrigger className="h-10 bg-white/60 dark:bg-white/[0.04] backdrop-blur">
                      <SelectValue placeholder="Select a status" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {leadStatusEnum.map((status) => (
                      <SelectItem key={status} value={status}>
                        {status}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Email */}
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input
                    placeholder="john@example.com"
                    type="email"
                    {...field}
                    value={field.value || ''}
                    className="h-10 bg-white/60 dark:bg-white/[0.04] backdrop-blur placeholder:text-muted-foreground/70"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Phone */}
          <FormField
            control={form.control}
            name="phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Phone</FormLabel>
                <FormControl>
                  <Input
                    placeholder="+44 7700 900123"
                    {...field}
                    value={field.value || ''}
                    className="h-10 bg-white/60 dark:bg-white/[0.04] backdrop-blur placeholder:text-muted-foreground/70"
                    onChange={(e) => {
                      // lightweight mask: keep digits and + space
                      const raw = e.target.value;
                      const masked = raw.replace(/[^+\d\s]/g, "");
                      field.onChange(masked);
                    }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Link */}
          <FormField
            control={form.control}
            name="link"
            render={({ field }) => (
              <FormItem className="col-span-1 md:col-span-2">
                <FormLabel>LinkedIn Profile</FormLabel>
                <FormControl>
                  <Input placeholder="https://linkedin.com/in/johndoe" {...field} value={field.value || ''} className="h-10 bg-white/60 dark:bg-white/[0.04] backdrop-blur placeholder:text-muted-foreground/70" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Notes */}
          <FormField
            control={form.control}
            name="notes"
            render={({ field }) => (
              <FormItem className="col-span-1 md:col-span-2">
                <FormLabel>Notes</FormLabel>
                <FormControl>
                  <Textarea 
                    placeholder="Additional notes..."
                    className="min-h-[120px] bg-white/60 dark:bg-white/[0.04] backdrop-blur placeholder:text-muted-foreground/70"
                    {...field}
                    value={field.value || ''}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        
        <div className="flex justify-end space-x-2">
          <Button 
            variant="outline" 
            onClick={() => router.push('/leads')} 
            type="button"
            className="h-10"
          >
            Cancel
          </Button>
          {onSaveAndAddToPipeline && (
            <Button
              type="button"
              variant="secondary"
              disabled={isSubmitting}
              className="h-10"
              onClick={form.handleSubmit((values) => {
                if (lead) {
                  onSaveAndAddToPipeline({ id: lead.id, ...values });
                } else {
                  onSaveAndAddToPipeline(values);
                }
              })}
            >
              Save + Add to Pipeline
            </Button>
          )}
          <Button 
            type="submit" 
            disabled={isSubmitting || isProcessing} 
            className="h-10"
          >
            {isSubmitting || isProcessing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {isProcessing ? 'Processing...' : 'Submitting...'}
              </>
            ) : (
              <>
                {isEditing ? 'Update Lead' : 'Create Lead'}
              </>
            )}
          </Button>
        </div>
      </form>
    </Form>

    {/* Duplicate Warning Dialog */}
    {currentWarning && (
      <DuplicateWarningDialog
        isOpen={isWarningOpen}
        onClose={closeWarning}
        onProceed={handleDuplicateProceed}
        onCancel={handleDuplicateCancel}
        warning={currentWarning}
        isProcessing={isProcessing}
      />
    )}
    </>
  );
} 