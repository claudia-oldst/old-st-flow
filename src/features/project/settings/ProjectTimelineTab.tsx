import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DialogFooter } from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import type { Project } from "@/lib/types";
import {
  LIFECYCLE_STATUSES, LIFECYCLE_DOT, LIFECYCLE_PILL,
  LIFECYCLE_FIELD_LABELS, REQUIRED_FIELDS,
  type LifecycleStatus, type LifecycleDates,
  lifecycleCardDate, missingRequiredField,
} from "./lifecycle";

interface Props {
  project: Project;
  canEdit: boolean;
  onSave: (patch: Partial<Project>) => Promise<void>;
  onClose: () => void;
}

const DATE_FIELDS: (keyof LifecycleDates)[] = [
  "start_date", "development_start_date", "handover_date",
  "closing_window_date", "pause_date", "closed_date",
];

const REASON_FIELDS: (keyof LifecycleDates)[] = ["pause_reason", "closed_reason"];

export function ProjectTimelineTab({ project, canEdit, onSave, onClose }: Props) {
  const [status, setStatus] = useState<LifecycleStatus>(project.lifecycle_status);
  const [dates, setDates] = useState<LifecycleDates>(() => extractDates(project));
  const [saving, setSaving] = useState(false);

  const required = REQUIRED_FIELDS[status];
  const missing = missingRequiredField(status, dates);

  const setField = (k: keyof LifecycleDates, v: string | null) =>
    setDates((d) => ({ ...d, [k]: v || null }));

  const handleSave = async () => {
    const miss = missingRequiredField(status, dates);
    if (miss) {
      toast.error(`${LIFECYCLE_FIELD_LABELS[miss]} is required for ${status}`);
      return;
    }
    setSaving(true);
    await onSave({ lifecycle_status: status, ...dates });
    setSaving(false);
  };

  return (
    <div className="space-y-5 mt-4">
      <div className="space-y-1.5">
        <Label>Lifecycle status</Label>
        <Select value={status} onValueChange={(v) => setStatus(v as LifecycleStatus)} disabled={!canEdit}>
          <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
          <SelectContent>
            {LIFECYCLE_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                <span className="inline-flex items-center gap-2">
                  <span className={`h-2 w-2 rounded-full ${LIFECYCLE_DOT[s]}`} />
                  {s}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="text-[10px] text-dimmer">
          Current status:{" "}
          <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] ring-1 ${LIFECYCLE_PILL[status]}`}>
            {status}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {DATE_FIELDS.map((f) => (
          <div key={f} className="space-y-1.5">
            <Label htmlFor={`lc-${f}`}>
              {LIFECYCLE_FIELD_LABELS[f]}
              {required.includes(f) && <span className="text-primary ml-1">*</span>}
            </Label>
            <Input
              id={`lc-${f}`}
              type="date"
              value={dates[f] ?? ""}
              onChange={(e) => setField(f, e.target.value || null)}
              disabled={!canEdit}
            />
          </div>
        ))}
      </div>

      <div className="space-y-3">
        {REASON_FIELDS.map((f) => {
          const showReason = status === "On Hold" || status === "Closed Lost" || (dates[f] ?? "").length > 0;
          if (!showReason) return null;
          return (
            <div key={f} className="space-y-1.5">
              <Label htmlFor={`lc-${f}`}>
                {LIFECYCLE_FIELD_LABELS[f]}
                {required.includes(f) && <span className="text-primary ml-1">*</span>}
              </Label>
              <Textarea
                id={`lc-${f}`}
                value={dates[f] ?? ""}
                onChange={(e) => setField(f, e.target.value || null)}
                disabled={!canEdit}
                rows={2}
                placeholder={f === "pause_reason" ? "Why is this project on hold?" : "Why was this project closed?"}
              />
            </div>
          );
        })}
      </div>

      {missing && canEdit && (
        <div className="text-xs text-primary">
          {LIFECYCLE_FIELD_LABELS[missing]} is required for {status}.
        </div>
      )}

      {canEdit && (
        <DialogFooter className="pt-2">
          <Button variant="ghost" onClick={onClose}>Close</Button>
          <Button onClick={handleSave} disabled={saving || !!missing}>Save timeline</Button>
        </DialogFooter>
      )}
    </div>
  );
}

function extractDates(p: Project): LifecycleDates {
  return {
    start_date: p.start_date ?? null,
    development_start_date: p.development_start_date ?? null,
    handover_date: p.handover_date ?? null,
    closing_window_date: p.closing_window_date ?? null,
    pause_date: p.pause_date ?? null,
    pause_reason: p.pause_reason ?? null,
    closed_date: p.closed_date ?? null,
    closed_reason: p.closed_reason ?? null,
  };
}

export { lifecycleCardDate };
