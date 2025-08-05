'use client';

import { useState, useEffect, useRef } from "react";
import { Input } from "./input";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./select";
import { useUpdateLead } from "@/lib/hooks";
import { Check, X, PenSquare } from "lucide-react";
import { Button } from "./button";
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./tooltip";

interface EditableCellProps {
  value: string;
  row: { original: Record<string, unknown> };
  column: {
    id: string;
  };
  isSelect?: boolean;
  options?: string[];
}

export function EditableCell({
  value: initialValue,
  row,
  column,
  isSelect = false,
  options = [],
}: EditableCellProps) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(initialValue);
  const { mutate: updateLead, isPending } = useUpdateLead();
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [editing]);

  const onSave = () => {
    if (initialValue === value) {
      setEditing(false);
      return;
    }
    
    const leadId = row.original.id;
    
    // Create update data with just the ID and the field being changed
    const updateData = { 
      id: leadId,
      [column.id]: value === "" ? null : value, // Handle empty strings as null
    };
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    updateLead(updateData as any);
    setEditing(false);
  };

  const onCancel = () => {
    setEditing(false);
    setValue(initialValue);
  };

  if (editing) {
    return (
      <div className="flex items-center gap-1">
        {isSelect ? (
          <Select 
            value={value || ""} 
            onValueChange={(val) => setValue(val)}
            onOpenChange={(open) => {
              if (!open) {
                // When dropdown closes, check if we should save
                if (value !== initialValue) {
                  onSave();
                }
              }
            }}
          >
            <SelectTrigger className="h-8 min-w-[120px]">
              <SelectValue placeholder="Select..." />
            </SelectTrigger>
            <SelectContent>
              {options.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <Input
            ref={inputRef}
            value={value || ""}
            onChange={(e) => setValue(e.target.value)}
            className="h-8 w-full max-w-[200px]"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter") onSave();
              if (e.key === "Escape") onCancel();
            }}
            onBlur={() => {
              if (value !== initialValue) {
                onSave();
              } else {
                onCancel();
              }
            }}
          />
        )}
        <div className="flex gap-1">
          <Button 
            size="icon" 
            variant="ghost" 
            className="h-7 w-7" 
            onClick={onSave}
            disabled={isPending}
          >
            <Check className="h-4 w-4" />
          </Button>
          <Button 
            size="icon" 
            variant="ghost" 
            className="h-7 w-7" 
            onClick={onCancel}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div 
            className={`
              group flex items-center gap-1 p-1 -m-1 rounded
              hover:bg-muted/40 cursor-pointer truncate
              ${column.id === 'name' ? 'font-medium' : ''}
            `}
            onClick={() => setEditing(true)}
          >
            <span>{value || "-"}</span>
            <PenSquare className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>Click to edit</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
} 