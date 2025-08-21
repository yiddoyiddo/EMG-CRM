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
  FormDescription,
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
import { CalendarIcon, Building2, User, Phone, Mail, DollarSign, FileText, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

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
      category: (initialData?.category || defaultCategory || 'Pipeline') as any,
      status: initialData?.status || defaultStatus || 'Proposal - Media',
      value: initialData?.value || 0,
      notes: initialData?.notes || '',
      link: initialData?.link || '',
      phone: initialData?.phone || '',
      email: initialData?.email || '',
      callDate: initialData?.callDate ? new Date(initialData.callDate) : null,
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
    <div className="w-full max-w-5xl mx-auto">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          {/* Header */}
          <div className="text-center pb-6 border-b">
            <h2 className="text-3xl font-bold tracking-tight text-gray-900">
              {initialData ? 'Update Pipeline Item' : 'Create New Pipeline Item'}
            </h2>
            <p className="text-gray-600 mt-2">
              {initialData ? 'Update the details below to modify this pipeline item' : 'Fill in the details below to add a new lead to your pipeline'}
            </p>
          </div>

          {/* Basic Information Section */}
          <Card className="shadow-sm">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-2">
                <User className="h-5 w-5 text-blue-600" />
                <CardTitle className="text-xl font-semibold text-gray-900">Basic Information</CardTitle>
              </div>
              <CardDescription>
                Essential contact and identification details for the lead
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
                          className="h-11 border-gray-300 focus:border-blue-500 focus:ring-blue-500" 
                          {...field} 
                        />
                      </FormControl>
                      <FormDescription className="text-xs text-gray-500">
                        Enter the lead's full name
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

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
                          className="h-11 border-gray-300 focus:border-blue-500 focus:ring-blue-500" 
                          {...field} 
                          value={field.value || ''} 
                        />
                      </FormControl>
                      <FormDescription className="text-xs text-gray-500">
                        Company or organization name
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="bdr"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium text-gray-700">
                        Business Development Representative*
                      </FormLabel>
                      <div className="flex gap-3">
                        <Select 
                          onValueChange={field.onChange} 
                          defaultValue={field.value || ''}
                          value={field.value || ''}
                        >
                          <FormControl>
                            <SelectTrigger className="flex-1 h-11 border-gray-300 focus:border-blue-500 focus:ring-blue-500">
                              <SelectValue placeholder="Select assigned BDR" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {bdrs.map((bdr) => (
                              <SelectItem key={bdr} value={bdr} className="py-2">
                                {bdr}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <AddBdrDialog 
                          onAddBdr={handleAddBdr}
                        />
                      </div>
                      <FormDescription className="text-xs text-gray-500">
                        Who is responsible for this lead?
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium text-gray-700">
                        Pipeline Category*
                      </FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        defaultValue={field.value || ''}
                        value={field.value || ''}
                      >
                        <FormControl>
                          <SelectTrigger className="h-11 border-gray-300 focus:border-blue-500 focus:ring-blue-500">
                            <SelectValue placeholder="Select pipeline category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {pipelineCategoryEnum.map((category) => (
                            <SelectItem key={category} value={category} className="py-2">
                              {category.replace(/_/g, ', ')}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription className="text-xs text-gray-500">
                        Which stage of the sales process?
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* Pipeline Details Section */}
          <Card className="shadow-sm">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-green-600" />
                <CardTitle className="text-xl font-semibold text-gray-900">Pipeline Details</CardTitle>
              </div>
              <CardDescription>
                Current status and deal information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
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
                        defaultValue={field.value || ''}
                        value={field.value || ''}
                      >
                        <FormControl>
                          <SelectTrigger className="h-11 border-gray-300 focus:border-blue-500 focus:ring-blue-500">
                            <SelectValue placeholder="Select current status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {selectedCategory && 
                            pipelineStatusEnum[selectedCategory as keyof typeof pipelineStatusEnum]?.map((status) => (
                              <SelectItem key={`${selectedCategory}-${status}`} value={status} className="py-2">
                                {status}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                      <FormDescription className="text-xs text-gray-500">
                        Current stage within the selected category
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="value"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium text-gray-700 flex items-center gap-2">
                        <DollarSign className="h-4 w-4" />
                        Deal Value ($)
                      </FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          placeholder="0.00" 
                          className="h-11 border-gray-300 focus:border-blue-500 focus:ring-blue-500" 
                          {...field} 
                          value={field.value || ''}
                          onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : null)}
                        />
                      </FormControl>
                      <FormDescription className="text-xs text-gray-500">
                        Potential revenue from this deal
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

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
                                "w-full h-11 justify-start text-left font-normal border-gray-300 hover:border-gray-400 focus:border-blue-500 focus:ring-blue-500",
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
                        <PopoverContent className="w-auto p-0 shadow-lg border" align="start">
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
                      <FormDescription className="text-xs text-gray-500">
                        When is the next scheduled call?
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* Contact Information Section */}
          <Card className="shadow-sm">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-2">
                <Phone className="h-5 w-5 text-purple-600" />
                <CardTitle className="text-xl font-semibold text-gray-900">Contact Information</CardTitle>
              </div>
              <CardDescription>
                How to reach this lead
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
                          className="h-11 border-gray-300 focus:border-blue-500 focus:ring-blue-500" 
                          {...field} 
                          value={field.value || ''} 
                        />
                      </FormControl>
                      <FormDescription className="text-xs text-gray-500">
                        Include country code if international
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

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
                          className="h-11 border-gray-300 focus:border-blue-500 focus:ring-blue-500" 
                          {...field} 
                          value={field.value || ''} 
                        />
                      </FormControl>
                      <FormDescription className="text-xs text-gray-500">
                        Primary email for communication
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

              </div>
              
              <div className="grid grid-cols-1 gap-6">
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
                          className="h-11 border-gray-300 focus:border-blue-500 focus:ring-blue-500" 
                          {...field} 
                          value={field.value || ''} 
                        />
                      </FormControl>
                      <FormDescription className="text-xs text-gray-500">
                        Full LinkedIn profile URL
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* Additional Information Section */}
          <Card className="shadow-sm">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-orange-600" />
                <CardTitle className="text-xl font-semibold text-gray-900">Additional Information</CardTitle>
              </div>
              <CardDescription>
                Any additional notes or relevant details
              </CardDescription>
            </CardHeader>
            <CardContent>
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
                    <FormDescription className="text-xs text-gray-500">
                      This information will help track the lead's progress and history
                    </FormDescription>
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
              onClick={() => {
                onCancel?.();
                router.push('/pipeline');
              }} 
              type="button"
              className="min-w-[120px] h-11 font-medium"
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              size="lg"
              className="min-w-[160px] h-11 font-medium bg-blue-600 hover:bg-blue-700 focus:ring-blue-500"
              disabled={form.formState.isSubmitting}
            >
              {form.formState.isSubmitting ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  {initialData ? 'Updating...' : 'Creating...'}
                </div>
              ) : (
                initialData ? 'Update Pipeline Item' : 'Create Pipeline Item'
              )}
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
    </div>
  );
} 