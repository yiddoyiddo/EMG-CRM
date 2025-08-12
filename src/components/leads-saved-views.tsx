"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export type LeadsView = {
  name: string;
  filters: Record<string, string>;
  columnVisibility: Record<string, boolean>;
};

function loadViews(): LeadsView[] {
  if (typeof window === "undefined") return [];
  const raw = window.localStorage.getItem("leads.views");
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function saveViews(views: LeadsView[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem("leads.views", JSON.stringify(views));
}

export function LeadsSavedViews({
  filters,
  columnVisibility,
  onApply,
}: {
  filters: Record<string, string>;
  columnVisibility: Record<string, boolean>;
  onApply: (view: LeadsView) => void;
}) {
  const [views, setViews] = useState<LeadsView[]>([]);
  const [newName, setNewName] = useState("");

  // Load and seed views after mount (and when columnVisibility becomes available)
  // Avoid seeding a misleading "Beginner" view; Beginner/Advanced is controlled by the toggle button
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const existing = loadViews();
    if (existing.length > 0) {
      // Migration: remove legacy "Beginner" saved view if present
      const filtered = existing.filter(v => v.name !== 'Beginner');
      if (filtered.length !== existing.length) {
        saveViews(filtered);
      }
      setViews(filtered);
      return;
    }
    const hasSeeded = window.localStorage.getItem('leads.viewsSeeded');
    const hasVisibility = columnVisibility && Object.keys(columnVisibility).length > 0;
    if (!hasSeeded && hasVisibility) {
      const starter: LeadsView[] = [
        {
          name: 'Fresh Leads',
          filters: { status: 'Fresh' },
          columnVisibility: Object.fromEntries(
            Object.entries(columnVisibility).map(([k, v]) => [k, Boolean(v)])
          ),
        },
        {
          name: 'Call Booked',
          filters: { status: 'Call Booked' },
          columnVisibility: Object.fromEntries(
            Object.entries(columnVisibility).map(([k, v]) => [k, Boolean(v)])
          ),
        },
      ];
      saveViews(starter);
      window.localStorage.setItem('leads.viewsSeeded', 'true');
      setViews(starter);
    }
  }, [columnVisibility]);

  const saveCurrent = () => {
    if (!newName.trim()) {
      toast.error("Enter a view name");
      return;
    }
    const next: LeadsView = { name: newName.trim(), filters, columnVisibility };
    const updated = [next, ...views.filter((v) => v.name !== next.name)];
    setViews(updated);
    saveViews(updated);
    toast.success("View saved");
    setNewName("");
  };

  const apply = (v: LeadsView) => onApply(v);
  const remove = (name: string) => {
    const updated = views.filter((v) => v.name !== name);
    setViews(updated);
    saveViews(updated);
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex items-center gap-2">
        <Input
          placeholder="Save view as..."
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          className="h-9 w-40"
        />
        <Button variant="outline" className="h-9" onClick={saveCurrent}>
          Save View
        </Button>
      </div>
      {views.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          {views.map((v) => (
            <div key={v.name} className="flex items-center gap-1">
              <Button variant="secondary" size="sm" onClick={() => apply(v)}>
                {v.name}
              </Button>
              <Button variant="ghost" size="icon" onClick={() => remove(v.name)}>
                ×
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}


