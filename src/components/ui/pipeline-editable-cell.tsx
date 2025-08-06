'use client';

import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Check, X, Edit, CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import { PipelineItem, useUpdatePipelineItem, useCreateActivityLog } from '@/lib/hooks';
import { toast } from 'sonner';
import { formatDateUKShort, formatDateForInput } from '@/lib/date-utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

interface PipelineEditableCellProps {
  value: any;
  item: PipelineItem;
  field: keyof PipelineItem;
  isSelect?: boolean;
  isTextarea?: boolean;
  isNumber?: boolean;
  isDate?: boolean;
  options?: readonly string[];
  className?: string;
  placeholder?: string;
}

// Simple custom calendar component
const SimpleCalendar = ({ selected, onSelect }: { selected?: Date; onSelect: (date: Date) => void }) => {
  const [currentDate, setCurrentDate] = useState(selected || new Date());
  
  const today = new Date();
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startDate = new Date(firstDay);
  startDate.setDate(startDate.getDate() - firstDay.getDay());
  
  const days = [];
  const current = new Date(startDate);
  
  // Generate 42 days (6 weeks)
  for (let i = 0; i < 42; i++) {
    days.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }
  
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  
  const dayNames = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
  
  const goToPrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };
  
  const goToNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };
  
  return (
    <div className="p-3 w-64">
      {/* Header */}
      <div className="flex justify-center items-center mb-4 relative">
        <Button
          variant="outline"
          size="sm"
          className="absolute left-0 h-7 w-7 p-0"
          onClick={goToPrevMonth}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="text-sm font-medium">
          {monthNames[month]} {year}
        </div>
        <Button
          variant="outline"
          size="sm"
          className="absolute right-0 h-7 w-7 p-0"
          onClick={goToNextMonth}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
      
      {/* Day headers */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {dayNames.map((day) => (
          <div key={day} className="text-center text-xs font-medium text-muted-foreground p-2">
            {day}
          </div>
        ))}
      </div>
      
      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {days.map((day, index) => {
          const isToday = day.toDateString() === today.toDateString();
          const isSelected = selected && day.toDateString() === selected.toDateString();
          const isCurrentMonth = day.getMonth() === month;
          
          return (
            <Button
              key={index}
              variant="ghost"
              className={cn(
                "h-8 w-8 p-0 text-xs",
                isToday && "bg-accent text-accent-foreground",
                isSelected && "bg-primary text-primary-foreground",
                !isCurrentMonth && "text-muted-foreground opacity-50"
              )}
              onClick={() => onSelect(day)}
            >
              {day.getDate()}
            </Button>
          );
        })}
      </div>
    </div>
  );
};

export function PipelineEditableCell({
  value,
  item,
  field,
  isSelect = false,
  isTextarea = false,
  isNumber = false,
  isDate = false,
  options = [],
  className = '',
  placeholder = '',
}: PipelineEditableCellProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [tempValue, setTempValue] = useState(value || '');
  const { mutate: updatePipelineItem } = useUpdatePipelineItem();
  const { mutate: createActivityLog } = useCreateActivityLog();

  useEffect(() => {
    setTempValue(value || '');
  }, [value]);

  const handleSave = () => {
    if (tempValue === value) {
      setIsEditing(false);
      return;
    }

    let processedValue = tempValue;
    if (isDate && tempValue) {
      // Convert date string to ISO string for storage
      processedValue = new Date(tempValue).toISOString();
    } else if (isNumber) {
      processedValue = Number(tempValue) || null;
    } else {
      processedValue = tempValue || null;
    }

    const updatedItem = {
      ...item,
      [field]: processedValue,
    };

    updatePipelineItem(updatedItem, {
      onSuccess: () => {
        setIsEditing(false);
        
        // Log the activity
        createActivityLog({
          bdr: item.bdr,
          activityType: 'Note_Added',
          description: `Updated ${field}: ${value || 'empty'} → ${tempValue || 'empty'}`,
          pipelineItemId: item.id,
          notes: `Field ${field} updated`
        });
      },
      onError: (error) => {
        toast.error(`Failed to update ${field}`);
        setTempValue(value || '');
      }
    });
  };

  const handleCancel = () => {
    setTempValue(value || '');
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isTextarea) {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  if (isEditing) {
    return (
      <div className={`flex items-center gap-1 ${className}`} onClick={(e) => e.stopPropagation()}>
        {isSelect ? (
          <Select value={tempValue} onValueChange={setTempValue}>
            <SelectTrigger className="h-6 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {options.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : isTextarea ? (
          <Textarea
            value={tempValue}
            onChange={(e) => setTempValue(e.target.value)}
            onKeyDown={handleKeyDown}
            className="min-h-[40px] text-xs"
            autoFocus
          />
        ) : (
          <Input
            type={isNumber ? 'number' : 'text'}
            value={tempValue}
            onChange={(e) => setTempValue(e.target.value)}
            onKeyDown={handleKeyDown}
            className="h-6 text-xs"
            placeholder={placeholder}
            autoFocus
          />
        )}
        <Button
          variant="ghost"
          size="sm"
          className="h-5 w-5 p-0"
          onClick={handleSave}
        >
          <Check className="h-3 w-3" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-5 w-5 p-0"
          onClick={handleCancel}
        >
          <X className="h-3 w-3" />
        </Button>
      </div>
    );
  }

  return (
    <div
      className={`group cursor-pointer hover:bg-muted/50 rounded px-1 py-0.5 flex items-center gap-1 ${className}`}
      onClick={(e) => e.stopPropagation()}
    >
      {isDate ? (
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              className={cn(
                "h-auto p-0 text-xs justify-start text-left font-normal hover:bg-transparent",
                !value && "text-muted-foreground"
              )}
            >
              {value ? (
                formatDateUKShort(value)
              ) : (
                <span>{placeholder || 'Click to set date'}</span>
              )}
              <Edit className="h-3 w-3 opacity-0 group-hover:opacity-50 transition-opacity ml-1" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start" onClick={(e) => e.stopPropagation()}>
            <SimpleCalendar
              selected={value ? new Date(value) : undefined}
              onSelect={(date) => {
                if (date) {
                  const dateString = date.toISOString();
                  setTempValue(dateString);
                  // Update the item directly without going through the editing state
                  const updatedItem = {
                    ...item,
                    [field]: dateString,
                  };
                  updatePipelineItem(updatedItem, {
                    onSuccess: () => {
                      // Log the activity
                      createActivityLog({
                        bdr: item.bdr,
                        activityType: 'Note_Added',
                        description: `Updated ${field}: ${value || 'empty'} → ${dateString}`,
                        pipelineItemId: item.id,
                        notes: `Field ${field} updated`
                      });
                    },
                    onError: (error) => {
                      toast.error(`Failed to update ${field}`);
                    }
                  });
                }
              }}
            />
          </PopoverContent>
        </Popover>
      ) : (
        <div
          onClick={(e) => {
            e.stopPropagation();
            setIsEditing(true);
          }}
        >
          <span className="text-xs truncate">
            {value || placeholder || 'Click to edit'}
          </span>
          <Edit className="h-3 w-3 opacity-0 group-hover:opacity-50 transition-opacity" />
        </div>
      )}
    </div>
  );
} 