"use client"

import { FileText } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "./popover"
import { cn } from "@/lib/utils"

interface NotesPopoverProps {
  notes: string
  className?: string
}

export function NotesPopover({ notes, className }: NotesPopoverProps) {
  if (!notes) return null

  return (
    <Popover>
      <PopoverTrigger className={cn("hover:opacity-70 transition-opacity", className)}>
        <FileText className="h-4 w-4 text-muted-foreground" />
      </PopoverTrigger>
      <PopoverContent className="w-[300px] max-h-[400px] p-4">
        <div className="space-y-2">
          <h4 className="font-medium">Notes</h4>
          <div className="max-h-[300px] overflow-y-auto">
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{notes}</p>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
} 