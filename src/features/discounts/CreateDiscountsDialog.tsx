import { useEffect, useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EpicSelect } from "@/features/epics/EpicSelect";
import { useEpicDiscounts, type CreateDiscountInput } from "./useEpicDiscounts";
import type { Discipline } from "./applyDiscounts";

interface DraftDiscount {
  key: string;
  epicId: number | null;
  discipline: Discipline;
  hours: string;
  reason: string;
}

const newDraft = (): DraftDiscount => ({
  key: Math.random().toString(36).slice(2),
  epicId: null,
  discipline: "FE",
  hours: "",
  reason: "",
});

const rowSchema: z.ZodType<CreateDiscountInput> = z.object({
  epic_id: z.number().int().positive(),
  discipline: z.enum(["FE", "BE", "Project"]),
  hours: z.number().positive().max(10000),
  reason: z.string().trim().min(1, "Reason required").max(500),
});

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  projectId: string;
}

export function CreateDiscountsDialog({ open, onOpenChange, projectId }: Props) {
  const { createMany, busy } = useEpicDiscounts(projectId);
  const [drafts, setDrafts] = useState<DraftDiscount[]>([newDraft()]);

  useEffect(() => {
    if (open) setDrafts([newDraft()]);
  }, [open]);

  const update = (key: string, patch: Partial<DraftDiscount>) =>
    setDrafts((prev) => prev.map((d) => (d.key === key ? { ...d, ...patch } : d)));
  const remove = (key: string) =>
    setDrafts((prev) => (prev.length === 1 ? prev : prev.filter((d) => d.key !== key)));
  const addAnother = () => setDrafts((prev) => [...prev, newDraft()]);

  const validRows = useMemo(() => {
    const out: CreateDiscountInput[] = [];
    for (const d of drafts) {
      const parsed = rowSchema.safeParse({
        epic_id: d.epicId ?? -1,
        discipline: d.discipline,
        hours: parseFloat(d.hours) || 0,
        reason: d.reason,
      });
      if (parsed.success) out.push(parsed.data);
    }
    return out;
  }, [drafts]);

  const submit = async () => {
    if (validRows.length === 0) return;
    await createMany(validRows);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="glass-strong max-w-3xl"
        onKeyDown={(e) => {
          if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
            e.preventDefault();
            submit();
          }
        }}
      >
        <DialogHeader>
          <DialogTitle>Create discounts</DialogTitle>
          <div className="text-xs text-dim mt-1">
            Apply hour discounts at the epic level. They reduce billable hours but leave estimates and actuals untouched.
          </div>
        </DialogHeader>

        <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
          {drafts.map((d) => (
            <div
              key={d.key}
              className="glass rounded-xl p-3 space-y-2"
            >
              <div className="grid grid-cols-1 md:grid-cols-[1fr_120px_100px_auto] gap-2">
                <EpicSelect
                  projectId={projectId}
                  value={d.epicId}
                  onChange={(id) => update(d.key, { epicId: id })}
                  size="sm"
                />
                <Select
                  value={d.discipline}
                  onValueChange={(v) => update(d.key, { discipline: v as Discipline })}
                >
                  <SelectTrigger className="h-7 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="FE">Frontend</SelectItem>
                    <SelectItem value="BE">Backend</SelectItem>
                    <SelectItem value="Project">Project</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  type="number"
                  inputMode="decimal"
                  min={0}
                  step={0.25}
                  placeholder="Hours"
                  value={d.hours}
                  onChange={(e) => update(d.key, { hours: e.target.value })}
                  className="h-7 text-xs font-mono"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-dimmer hover:text-health-bad"
                  onClick={() => remove(d.key)}
                  disabled={drafts.length === 1}
                  aria-label="Remove row"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
              <Textarea
                placeholder="Reason (e.g. goodwill credit on auth epic)"
                value={d.reason}
                onChange={(e) => update(d.key, { reason: e.target.value })}
                rows={2}
                maxLength={500}
                className="text-xs"
              />
            </div>
          ))}
        </div>

        <DialogFooter className="flex sm:justify-between sm:flex-row flex-col gap-2">
          <Button variant="ghost" onClick={addAnother} type="button" className="gap-2 sm:mr-auto">
            <Plus className="h-4 w-4" /> Add another discount
          </Button>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={busy}>
              Cancel
            </Button>
            <Button onClick={submit} disabled={busy || validRows.length === 0}>
              Create {validRows.length} discount{validRows.length === 1 ? "" : "s"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
