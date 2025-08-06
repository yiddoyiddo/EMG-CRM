'use client';

import React from 'react';
import { Control, FieldPath, FieldValues } from 'react-hook-form';
import {
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
import { AddBdrDialog } from '@/components/ui/add-bdr-dialog';
import { useBdrManager } from '@/lib/hooks';
import { leadSourceEnum, leadStatusEnum, pipelineCategoryEnum, pipelineStatusEnum, allPipelineStatusValues } from '@/lib/validations';

// Generic form field props
interface BaseFieldProps<TFieldValues extends FieldValues = FieldValues> {
  control: Control<TFieldValues>;
  name: FieldPath<TFieldValues>;
  label: string;
  required?: boolean;
  className?: string;
}

// Name field component
export function NameField<TFieldValues extends FieldValues = FieldValues>({
  control,
  name,
  label = "Name",
  required = true,
  className,
}: BaseFieldProps<TFieldValues>) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className={className}>
          <FormLabel>{label}{required && '*'}</FormLabel>
          <FormControl>
            <Input placeholder="John Doe" {...field} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

// Title field component
export function TitleField<TFieldValues extends FieldValues = FieldValues>({
  control,
  name,
  label = "Title",
  className,
}: BaseFieldProps<TFieldValues>) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className={className}>
          <FormLabel>{label}</FormLabel>
          <FormControl>
            <Input placeholder="CEO" {...field} value={field.value || ''} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

// Company field component
export function CompanyField<TFieldValues extends FieldValues = FieldValues>({
  control,
  name,
  label = "Company",
  className,
}: BaseFieldProps<TFieldValues>) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className={className}>
          <FormLabel>{label}</FormLabel>
          <FormControl>
            <Input placeholder="Acme Inc." {...field} value={field.value || ''} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

// Email field component
export function EmailField<TFieldValues extends FieldValues = FieldValues>({
  control,
  name,
  label = "Email",
  className,
}: BaseFieldProps<TFieldValues>) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className={className}>
          <FormLabel>{label}</FormLabel>
          <FormControl>
            <Input 
              type="email" 
              placeholder="john@example.com" 
              {...field} 
              value={field.value || ''} 
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

// Phone field component
export function PhoneField<TFieldValues extends FieldValues = FieldValues>({
  control,
  name,
  label = "Phone",
  className,
}: BaseFieldProps<TFieldValues>) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className={className}>
          <FormLabel>{label}</FormLabel>
          <FormControl>
            <Input 
              type="tel" 
              placeholder="+44 123 456 7890" 
              {...field} 
              value={field.value || ''} 
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

// Link/URL field component
export function LinkField<TFieldValues extends FieldValues = FieldValues>({
  control,
  name,
  label = "Link",
  className,
}: BaseFieldProps<TFieldValues>) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className={className}>
          <FormLabel>{label}</FormLabel>
          <FormControl>
            <Input 
              type="url" 
              placeholder="https://linkedin.com/in/..." 
              {...field} 
              value={field.value || ''} 
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

// Notes field component
export function NotesField<TFieldValues extends FieldValues = FieldValues>({
  control,
  name,
  label = "Notes",
  className,
}: BaseFieldProps<TFieldValues>) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className={className}>
          <FormLabel>{label}</FormLabel>
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
  );
}

// BDR field component with add functionality
interface BdrFieldProps<TFieldValues extends FieldValues = FieldValues> extends BaseFieldProps<TFieldValues> {
  onAddBdr?: (newBdr: string) => boolean;
  allowNone?: boolean;
}

export function BdrField<TFieldValues extends FieldValues = FieldValues>({
  control,
  name,
  label = "BDR",
  className,
  onAddBdr,
  allowNone = true,
}: BdrFieldProps<TFieldValues>) {
  const { bdrs, addBdr } = useBdrManager();

  const handleAddBdr = (newBdr: string) => {
    if (onAddBdr) {
      return onAddBdr(newBdr);
    }
    return addBdr(newBdr);
  };

  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className={className}>
          <FormLabel>{label}</FormLabel>
          <div className="flex gap-2 items-center">
            <Select
              onValueChange={(value) => field.onChange(value === "none" ? null : value)}
              value={field.value || "none"}
            >
              <FormControl>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Select a BDR" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {allowNone && <SelectItem value="none">None</SelectItem>}
                {bdrs.map((bdr) => (
                  <SelectItem key={bdr} value={bdr}>
                    {bdr}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <AddBdrDialog onAddBdr={handleAddBdr} />
          </div>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

// Lead source field component
export function LeadSourceField<TFieldValues extends FieldValues = FieldValues>({
  control,
  name,
  label = "Source",
  required = true,
  className,
}: BaseFieldProps<TFieldValues>) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className={className}>
          <FormLabel>{label}{required && '*'}</FormLabel>
          <Select onValueChange={field.onChange} value={field.value}>
            <FormControl>
              <SelectTrigger>
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
  );
}

// Lead status field component
export function LeadStatusField<TFieldValues extends FieldValues = FieldValues>({
  control,
  name,
  label = "Status",
  required = true,
  className,
}: BaseFieldProps<TFieldValues>) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className={className}>
          <FormLabel>{label}{required && '*'}</FormLabel>
          <Select onValueChange={field.onChange} value={field.value}>
            <FormControl>
              <SelectTrigger>
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
  );
}

// Pipeline category field component
export function PipelineCategoryField<TFieldValues extends FieldValues = FieldValues>({
  control,
  name,
  label = "Category",
  className,
}: BaseFieldProps<TFieldValues>) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className={className}>
          <FormLabel>{label}</FormLabel>
          <Select 
            onValueChange={field.onChange} 
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
  );
}

// Pipeline status field component
interface PipelineStatusFieldProps<TFieldValues extends FieldValues = FieldValues> extends BaseFieldProps<TFieldValues> {
  category?: string;
}

export function PipelineStatusField<TFieldValues extends FieldValues = FieldValues>({
  control,
  name,
  label = "Status",
  category,
  className,
}: PipelineStatusFieldProps<TFieldValues>) {
  const availableStatuses = category && pipelineStatusEnum[category as keyof typeof pipelineStatusEnum] 
    ? pipelineStatusEnum[category as keyof typeof pipelineStatusEnum]
    : allPipelineStatusValues;

  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className={className}>
          <FormLabel>{label}</FormLabel>
          <Select 
            onValueChange={field.onChange} 
            value={field.value}
          >
            <FormControl>
              <SelectTrigger>
                <SelectValue placeholder="Select Status" />
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              {availableStatuses.map((status) => (
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
  );
}

// Value field component for pipeline items
export function ValueField<TFieldValues extends FieldValues = FieldValues>({
  control,
  name,
  label = "Value (£)",
  className,
}: BaseFieldProps<TFieldValues>) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className={className}>
          <FormLabel>{label}</FormLabel>
          <FormControl>
            <Input 
              type="number" 
              placeholder="0" 
              {...field} 
              onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : 0)}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

// Probability field component for pipeline items
export function ProbabilityField<TFieldValues extends FieldValues = FieldValues>({
  control,
  name,
  label = "Probability (%)",
  className,
}: BaseFieldProps<TFieldValues>) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className={className}>
          <FormLabel>{label}</FormLabel>
          <FormControl>
            <Input 
              type="number" 
              min="0" 
              max="100" 
              placeholder="50" 
              {...field} 
              onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : null)}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

// Combined contact info fields component
interface ContactInfoFieldsProps<TFieldValues extends FieldValues = FieldValues> {
  control: Control<TFieldValues>;
  nameField?: FieldPath<TFieldValues>;
  titleField?: FieldPath<TFieldValues>;
  companyField?: FieldPath<TFieldValues>;
  emailField?: FieldPath<TFieldValues>;
  phoneField?: FieldPath<TFieldValues>;
  linkField?: FieldPath<TFieldValues>;
  className?: string;
}

export function ContactInfoFields<TFieldValues extends FieldValues = FieldValues>({
  control,
  nameField = 'name' as FieldPath<TFieldValues>,
  titleField = 'title' as FieldPath<TFieldValues>,
  companyField = 'company' as FieldPath<TFieldValues>,
  emailField = 'email' as FieldPath<TFieldValues>,
  phoneField = 'phone' as FieldPath<TFieldValues>,
  linkField = 'link' as FieldPath<TFieldValues>,
  className,
}: ContactInfoFieldsProps<TFieldValues>) {
  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 ${className || ''}`}>
      <NameField control={control} name={nameField} label="Name" />
      <TitleField control={control} name={titleField} label="Title" />
      <CompanyField control={control} name={companyField} label="Company" />
      <EmailField control={control} name={emailField} label="Email" />
      <PhoneField control={control} name={phoneField} label="Phone" />
      <LinkField control={control} name={linkField} label="Link" />
    </div>
  );
}