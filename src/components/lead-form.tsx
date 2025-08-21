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
import { Checkbox } from '@/components/ui/checkbox';
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
import { AlertTriangle, Loader2, CalendarIcon, Clock, User, Building2, Phone, Mail, FileText } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
      callDate: lead?.callDate ? new Date(lead.callDate) : null,
      isLeadGen: lead?.isLeadGen || false,
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
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-10">
          {/* Duplicate checking indicator */}
          {!isEditing && (isChecking || hasWarning) && (
            <div className="mb-6">
              {isChecking && (
                <div className="flex items-center gap-2 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                  <span className="text-sm text-blue-700">Checking for duplicates...</span>
                </div>
              )}
              {hasWarning && !isChecking && (
                <div className="flex items-center gap-2 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
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

          {/* Basic Information Section */}
          <Card className="shadow-sm border-gray-200">
            <CardHeader className="pb-6">
              <div className="flex items-center gap-2">
                <User className="h-5 w-5 text-blue-600" />
                <CardTitle className="text-xl font-semibold text-gray-900">Basic Information</CardTitle>
              </div>
              <CardDescription className="text-gray-600">
                Essential contact and identification details for the lead
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-8">
                {/* Name */}
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium text-gray-700 flex items-center gap-2">
                        <User className="h-4 w-4" />
                        Full Name*
                      </FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="e.g. John Smith" 
                          className="h-12 border-gray-300 focus:border-blue-500 focus:ring-blue-500" 
                          {...field} 
                        />
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
                      <FormLabel className="text-sm font-medium text-gray-700">
                        Job Title
                      </FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="e.g. CEO, Marketing Director" 
                          className="h-12 border-gray-300 focus:border-blue-500 focus:ring-blue-500" 
                          {...field} 
                          value={field.value || ''} 
                        />
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
                      <FormLabel className="text-sm font-medium text-gray-700 flex items-center gap-2">
                        <Building2 className="h-4 w-4" />
                        Company
                      </FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="e.g. Acme Corporation" 
                          className="h-12 border-gray-300 focus:border-blue-500 focus:ring-blue-500" 
                          {...field} 
                          value={field.value || ''} 
                        />
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
                      <FormLabel className="text-sm font-medium text-gray-700">
                        Business Development Representative
                      </FormLabel>
                      <div className="flex gap-3">
                        <Select
                          onValueChange={(value) => field.onChange(value === "none" ? null : value)}
                          value={field.value || "none"}
                        >
                          <FormControl>
                            <SelectTrigger className="flex-1 h-12 border-gray-300 focus:border-blue-500 focus:ring-blue-500">
                              <SelectValue placeholder="Select assigned BDR" />
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
                      <FormLabel className="text-sm font-medium text-gray-700">
                        Lead Source*
                      </FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger className="h-12 border-gray-300 focus:border-blue-500 focus:ring-blue-500">
                            <SelectValue placeholder="Select lead source" />
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
                      <FormLabel className="text-sm font-medium text-gray-700">
                        Current Status*
                      </FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger className="h-12 border-gray-300 focus:border-blue-500 focus:ring-blue-500">
                            <SelectValue placeholder="Select current status" />
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

                {/* Call Date */}
                <FormField
                  control={form.control}
                  name="callDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium text-gray-700 flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        Scheduled Call Date
                      </FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full h-12 justify-start text-left font-normal border-gray-300 hover:border-gray-400 focus:border-blue-500 focus:ring-blue-500",
                                !field.value && "text-gray-500"
                              )}
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {field.value ? (
                                format(field.value, "EEEE, MMMM do, yyyy")
                              ) : (
                                <span>Select a call date</span>
                              )}
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-2 shadow-lg border" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value || undefined}
                            onSelect={field.onChange}
                            disabled={(date) =>
                              date < new Date(new Date().setHours(0, 0, 0, 0))
                            }
                            initialFocus
                            className="rounded-lg"
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* Contact Information Section */}
          <Card className="shadow-sm border-gray-200">
            <CardHeader className="pb-6">
              <div className="flex items-center gap-2">
                <Phone className="h-5 w-5 text-purple-600" />
                <CardTitle className="text-xl font-semibold text-gray-900">Contact Information</CardTitle>
              </div>
              <CardDescription className="text-gray-600">
                How to reach this lead
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Email */}
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium text-gray-700 flex items-center gap-2">
                        <Mail className="h-4 w-4" />
                        Email Address
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="john.smith@company.com"
                          className="h-12 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                          {...field}
                          value={field.value || ''}
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
                      <FormLabel className="text-sm font-medium text-gray-700 flex items-center gap-2">
                        <Phone className="h-4 w-4" />
                        Phone Number
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="+44 20 1234 5678"
                          className="h-12 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                          {...field}
                          value={field.value || ''}
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
              </div>

              {/* LinkedIn Profile */}
              <FormField
                control={form.control}
                name="link"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium text-gray-700">
                      LinkedIn Profile
                    </FormLabel>
                    <FormControl>
                      <Input 
                        type="url"
                        placeholder="https://linkedin.com/in/johnsmith" 
                        className="h-12 border-gray-300 focus:border-blue-500 focus:ring-blue-500" 
                        {...field} 
                        value={field.value || ''} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Additional Information Section */}
          <Card className="shadow-sm border-gray-200">
            <CardHeader className="pb-6">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-orange-600" />
                <CardTitle className="text-xl font-semibold text-gray-900">Additional Information</CardTitle>
              </div>
              <CardDescription className="text-gray-600">
                Any additional notes or relevant details
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Lead Gen Checkbox */}
              <FormField
                control={form.control}
                name="isLeadGen"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 bg-blue-50 dark:bg-blue-900/20">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        className="mt-0.5"
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel className="text-sm font-medium text-blue-800 dark:text-blue-200">
                        Lead Gen Team Lead
                      </FormLabel>
                      <p className="text-xs text-blue-600 dark:text-blue-300">
                        Check this box if this lead was generated by the Lead Gen team
                      </p>
                    </div>
                  </FormItem>
                )}
              />

              {/* Notes */}
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium text-gray-700">
                      Notes & Comments
                    </FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Add any relevant notes, call summaries, next steps, or important details about this lead..."
                        className="min-h-[120px] border-gray-300 focus:border-blue-500 focus:ring-blue-500 resize-none"
                        {...field}
                        value={field.value || ''}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>
          
          {/* Action Buttons */}
          <div className="flex justify-end space-x-4 pt-8 border-t bg-gray-50 -mx-8 px-8 py-6 mt-8">
            <Button 
              variant="outline" 
              size="lg"
              onClick={() => router.push('/leads')} 
              type="button"
              className="min-w-[120px] h-12 font-medium"
            >
              Cancel
            </Button>
            {onSaveAndAddToPipeline && (
              <Button
                type="button"
                variant="secondary"
                size="lg"
                disabled={isSubmitting}
                className="min-w-[180px] h-12 font-medium"
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
              size="lg"
              disabled={isSubmitting || isProcessing} 
              className="min-w-[160px] h-12 font-medium bg-blue-600 hover:bg-blue-700 focus:ring-blue-500"
            >
              {isSubmitting || isProcessing ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  {isProcessing ? 'Processing...' : 'Submitting...'}
                </div>
              ) : (
                isEditing ? 'Update Lead' : 'Create Lead'
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