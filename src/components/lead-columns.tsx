"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Lead, useBdrManager } from "@/lib/hooks";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { format } from "date-fns";
import { createSelectColumn } from "./leads-table";
import { useRouter } from "next/navigation";
import { useDeleteLead } from "@/lib/hooks";
import { toast } from "sonner";
import { ExternalLink, MoreHorizontal, CheckCircle2 } from "lucide-react";
import { NotesPopover } from "@/components/ui/notes-popover";
import { EditableCell } from "@/components/ui/editable-cell";
import { leadSourceEnum, leadStatusEnum } from "@/lib/validations";
import { LeadToPipelineDialog } from "./lead-to-pipeline-dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { LeadUpdatesDialog } from './lead-updates-dialog';

// Custom type for column meta data
interface ColumnMeta {
  priority: 'high' | 'medium' | 'low';
}

export function useLeadColumns(): ColumnDef<Lead, unknown>[] {
  const router = useRouter();
  const { mutate: deleteLead } = useDeleteLead();
  const { bdrs } = useBdrManager();

  function handleDelete(id: number) {
    if (confirm("Are you sure you want to delete this lead?")) {
      deleteLead(id);
    }
  }

  return [
    // Actions column - high priority
    {
      id: "actions",
      cell: ({ row }) => {
        const lead = row.original;

        return (
          <div className="flex items-center">
            <LeadToPipelineDialog lead={lead} />
            <LeadUpdatesDialog lead={lead} />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <span className="sr-only">Open menu</span>
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => router.push(`/leads/${lead.id}/edit`)}>
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleDelete(lead.id)}>
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      },
    },

    // Add checkbox column - highest priority
    {
      ...createSelectColumn<Lead>(),
      meta: { priority: 'high' } as ColumnMeta,
    },

    // Name column - highest priority
    {
      accessorKey: "name",
      header: "Name",
      cell: ({ row }) => (
        <div className="flex items-center space-x-2">
          <EditableCell value={row.getValue("name")} row={row} column={{ id: "name" }} />
          {row.original.notes && <NotesPopover notes={row.original.notes} />}
          {row.original.link && (
            <a 
              href={row.original.link} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-500 hover:text-blue-700 flex-shrink-0"
            >
              <ExternalLink className="h-4 w-4" />
            </a>
          )}
        </div>
      ),
      meta: { priority: 'high' } as ColumnMeta,
    },

    // Company column - medium priority
    {
      accessorKey: "company",
      header: "Company",
      cell: ({ row }) => (
        <div>
          <EditableCell value={row.getValue("company")} row={row} column={{ id: "company" }} />
        </div>
      ),
      meta: { priority: 'medium' } as ColumnMeta,
    },

    // Status column - high priority
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => (
        <div>
          <EditableCell 
            value={row.getValue("status")} 
            row={row} 
            column={{ id: "status" }}
            isSelect={true}
            options={[...leadStatusEnum]}
          />
        </div>
      ),
      meta: { priority: 'high' } as ColumnMeta,
    },

    // BDR column - medium priority
    {
      accessorKey: "bdr",
      header: "BDR",
      cell: ({ row }) => (
        <div>
          <EditableCell 
            value={row.getValue("bdr")} 
            row={row} 
            column={{ id: "bdr" }}
            isSelect={true}
            options={[...bdrs]}
          />
        </div>
      ),
      meta: { priority: 'medium' } as ColumnMeta,
    },

    // Title column - medium priority
    {
      accessorKey: "title",
      header: "Title",
      cell: ({ row }) => (
        <div>
          <EditableCell value={row.getValue("title")} row={row} column={{ id: "title" }} />
        </div>
      ),
      meta: { priority: 'medium' } as ColumnMeta,
    },

    // Source column - medium priority
    {
      accessorKey: "source",
      header: "Source",
      cell: ({ row }) => (
        <div>
          <EditableCell 
            value={row.getValue("source")} 
            row={row} 
            column={{ id: "source" }}
            isSelect={true}
            options={[...leadSourceEnum]}
          />
        </div>
      ),
      meta: { priority: 'medium' } as ColumnMeta,
    },

    // Added Date column - medium priority
    {
      accessorKey: "addedDate",
      header: "Date Added",
      cell: ({ row }) => {
        const date = row.getValue("addedDate") as string;
        return date ? (
          <div className="whitespace-nowrap">{format(new Date(date), "MMM d, yyyy")}</div>
        ) : (
          "-"
        );
      },
      meta: { priority: 'medium' } as ColumnMeta,
    },

    // Email column - low priority
    {
      accessorKey: "email",
      header: "Email",
      cell: ({ row }) => (
        <div>
          <EditableCell value={row.getValue("email")} row={row} column={{ id: "email" }} />
        </div>
      ),
      meta: { priority: 'low' } as ColumnMeta,
    },

    // Last Updated column - medium priority
    {
      accessorKey: "lastUpdated",
      header: "Last Updated",
      cell: ({ row }) => {
        const date = row.getValue("lastUpdated") as string;
        return date ? (
          <div className="whitespace-nowrap">{format(new Date(date), "MMM d, yyyy")}</div>
        ) : (
          "-"
        );
      },
      meta: { priority: 'medium' } as ColumnMeta,
    },

    // Phone column - low priority
    {
      accessorKey: "phone",
      header: "Phone",
      cell: ({ row }) => (
        <div>
          <EditableCell value={row.getValue("phone")} row={row} column={{ id: "phone" }} />
        </div>
      ),
      meta: { priority: 'low' } as ColumnMeta,
    },

    // Pipeline indicator column - highest priority
    {
      id: "pipeline",
      header: "Pipeline",
      cell: ({ row }) => {
        const lead = row.original;
        if (!lead.inPipeline) return null;

        return (
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            <Badge variant="outline" className="whitespace-nowrap">
              {lead.pipelineCategory}
            </Badge>
          </div>
        );
      },
      meta: { priority: 'high' } as ColumnMeta,
    },
  ];
} 