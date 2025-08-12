"use client";

import { useActivityLogs, useCreateActivityLog } from "@/lib/hooks";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { activityTypeEnum, leadBdrEnum } from "@/lib/validations";
import { formatDateUK } from "@/lib/date-utils";
import { useState } from "react";
import { toast } from "sonner";

export function LeadActivityTimeline({ leadId }: { leadId: number }) {
  const { data, isLoading } = useActivityLogs({ leadId, page: 1, pageSize: 20 });
  const { mutate: createLog, isPending } = useCreateActivityLog();
  const [activityType, setActivityType] = useState<string>(activityTypeEnum[0]);
  const [description, setDescription] = useState("");
  const [notes, setNotes] = useState("");

  const onAdd = () => {
    if (!description.trim()) {
      toast.error("Please enter a description");
      return;
    }
    createLog(
      {
        bdr: leadBdrEnum[0],
        activityType: activityType as any,
        description,
        notes,
        leadId,
      },
      {
        onSuccess: () => {
          setDescription("");
          setNotes("");
          toast.success("Activity added");
        },
      }
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Activity</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-4 grid gap-2 sm:grid-cols-3">
          <Select value={activityType} onValueChange={setActivityType}>
            <SelectTrigger>
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              {activityTypeEnum.map((t) => (
                <SelectItem key={t} value={t}>{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            placeholder="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <div className="flex justify-end">
            <Button onClick={onAdd} disabled={isPending}>Add</Button>
          </div>
          <div className="sm:col-span-3">
            <Textarea
              placeholder="Notes (optional)"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </div>
        <div className="space-y-3">
          {isLoading ? (
            <div>Loading activity...</div>
          ) : (
            data?.logs.map((log) => (
              <div key={log.id} className="rounded-md border p-3">
                <div className="flex items-center justify-between">
                  <div className="font-medium">{log.activityType}</div>
                  <div className="text-xs text-muted-foreground">{formatDateUK(log.timestamp)}</div>
                </div>
                <div className="text-sm">{log.description}</div>
                {log.notes && <div className="text-sm text-muted-foreground whitespace-pre-wrap">{log.notes}</div>}
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}


