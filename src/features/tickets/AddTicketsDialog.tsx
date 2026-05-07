import { useMemo } from "react";
import { Plus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useStatuses } from "@/features/statuses/useStatuses";
import type { TicketType } from "@/lib/types";
import { DraftRow } from "./add-dialog/DraftRow";
import { useDraftRows } from "./add-dialog/useDraftRows";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  onCreated: () => void | Promise<void>;
  defaultType?: TicketType;
}

export function AddTicketsDialog({ open, onOpenChange, projectId, onCreated, defaultType = "Standard" }: Props) {
  const { statuses } = useStatuses();
  const defaultStatusId = useMemo(
    () => statuses.find((s) => s.category === "backlog")?.id ?? statuses[0]?.id ?? null,
    [statuses]
  );

  const { drafts, members, busy, validDrafts, update, remove, addAnother, submit } = useDraftRows({
    open,
    projectId,
    defaultType,
    defaultStatusId,
    onCreated,
    onClose: () => onOpenChange(false),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="glass-strong max-w-5xl"
        onKeyDown={(e) => {
          if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
            e.preventDefault();
            submit();
          }
        }}
      >
        <DialogHeader>
          <DialogTitle>Add tickets</DialogTitle>
          <div className="text-xs text-dim mt-1">
            Add one or more tickets. Use “Add another ticket” to queue more before saving.
          </div>
        </DialogHeader>

        <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
          {drafts.map((d, idx) => (
            <DraftRow
              key={d.key}
              draft={d}
              idx={idx}
              statuses={statuses}
              members={members}
              projectId={projectId}
              canDelete={drafts.length > 1}
              isLast={idx === drafts.length - 1}
              onChange={(patch) => update(d.key, patch)}
              onRemove={() => remove(d.key)}
              onEnterAtLast={addAnother}
            />
          ))}
        </div>

        <DialogFooter className="flex sm:justify-between sm:flex-row flex-col gap-2">
          <Button
            variant="ghost"
            onClick={addAnother}
            type="button"
            className="gap-2 sm:mr-auto"
          >
            <Plus className="h-4 w-4" /> Add another ticket
          </Button>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={busy}>
              Cancel
            </Button>
            <Button onClick={submit} disabled={busy || validDrafts.length === 0}>
              Create {validDrafts.length} ticket{validDrafts.length === 1 ? "" : "s"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
