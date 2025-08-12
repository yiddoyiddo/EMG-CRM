'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useCreateSublist } from '@/lib/hooks';
import { pipelineCategoryEnum, pipelineStatusEnum } from '@/lib/validations';
import { Plus, List, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';

interface SublistDialogProps {
  title: string;
  buttonLabel: string;
  buttonVariant?: 'default' | 'outline' | 'secondary' | 'ghost' | 'link' | 'destructive';
  buttonSize?: 'default' | 'sm' | 'lg' | 'icon';
  buttonIcon?: boolean;
  defaultCategory?: string;
  defaultStatus?: string;
  defaultBdr?: string;
  parentId?: number | null;
  onSuccess?: () => void;
  className?: string;
}

export function SublistDialog({
  title,
  buttonLabel,
  buttonVariant = 'default',
  buttonSize = 'default',
  buttonIcon = false,
  defaultCategory = 'prospect',
  defaultStatus = 'new',
  defaultBdr = '',
  parentId = null,
  onSuccess,
  className = ''
}: SublistDialogProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const createSublist = useCreateSublist();

  const handleButtonClick = () => {
    setIsEditing(true);
    setInputValue('');
    // Focus the input after a short delay to ensure it's rendered
    setTimeout(() => {
      inputRef.current?.focus();
    }, 0);
  };

  const handleInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCancel();
    }
  };

  const handleSave = async () => {
    if (!inputValue.trim()) {
      handleCancel();
      return;
    }

    try {
      await createSublist.mutateAsync({
        name: inputValue.trim(),
        category: defaultCategory,
        status: defaultStatus,
        bdr: defaultBdr,
        parentId: parentId
      });

      toast.success('Sublist item created successfully');
      setIsEditing(false);
      setInputValue('');
      onSuccess?.();
    } catch (error) {
      toast.error('Failed to create sublist item');
      console.error('Error creating sublist:', error);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setInputValue('');
  };

  // Handle click outside to cancel
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (inputRef.current && !inputRef.current.contains(event.target as Node)) {
        handleCancel();
      }
    };

    if (isEditing) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [isEditing]);

  if (isEditing) {
    return (
      <div className="inline-flex items-center gap-2">
        <Input
          ref={inputRef}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleInputKeyDown}
          placeholder="Enter sublist item name..."
          className="h-6 px-2 text-xs min-w-[200px]"
          autoFocus
        />
        <Button
          size="sm"
          variant="outline"
          onClick={handleCancel}
          className="h-6 px-2 text-xs"
        >
          Cancel
        </Button>
      </div>
    );
  }

  return (
    <Button
      variant={buttonVariant}
      size={buttonSize}
      onClick={handleButtonClick}
      className={className}
      disabled={createSublist.isPending}
    >
      {buttonIcon ? (
        <Plus className="h-3 w-3" />
      ) : (
        buttonLabel
      )}
    </Button>
  );
} 