import { useMemo, useState } from "react";
import { ChevronDown, ChevronRight, CornerDownLeft } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import type { TicketRow } from "@/features/tickets/useProjectTickets";
import type { AssigneeSlot } from "@/lib/types";
import { addTicketToLane } from "./dnd";
import { formatHours } from "@/lib/utils";

interface Props {
  devName: string;
  tickets: TicketRow[];
  sprintId: string;
  userId: string;
  slot: AssigneeSlot;
  isPMBA: boolean;
  onConfirmed: () => void;
}

/** Returns remaining hours for the given discipline slot. */
function remaining(t: TicketRow, slot: AssigneeSlot): number {
  if (slot === "FE") {
    return Math.max(0, (t.current_fe_estimate || 0) - (t.actual_frontend_hours || 0));
  }
  if (slot === "BE") {
    return Math.max(0, (t.current_be_estimate || 0) - (t.actual_backend_hours || 0));
  }
  return 0;
}

/**
 * Collapsible per-dev banner listing unfinished tickets carried over from
 * prior sprints. PMBA can review checkboxes and confirm bulk carry-over.
 */
export function CarryoverReviewPanel({
  devName,
  tickets,
  sprintId,
  userId,
  slot,
  isPMBA,
  onConfirmed,
}: Props) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [excluded, setExcluded] = useState<Set<string>>(() => new Set());
  const [busy, setBusy] = useState(false);

  const checked = useMemo(
    () => tickets.filter((t) => !excluded.has(t.id)),
    [tickets, excluded],
  );

  if (tickets.length === 0) return null;

  const toggle = (id: string) => {
    setExcluded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const confirm = async () => {
    if (!isPMBA || checked.length === 0) return;
    setBusy(true);
    try {
      for (const t of checked) {
        await addTicketToLane(sprintId, t.id, userId, slot);
      }
      toast.success(
        `Carried over ${checked.length} ticket${checked.length === 1 ? "" : "s"}`,
      );
      qc.invalidateQueries({ queryKey: ["sprint_tickets"] });
      qc.invalidateQueries({ queryKey: ["project_sprint_tickets"] });
      onConfirmed();
    } catch (err: unknown) {
      toast.error(formatSupabaseError(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="hairline rounded-md bg-accent/5 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-1.5 px-2 py-1.5 text-left text-[11px] text-accent hover:bg-accent/10 transition"
      >
        {open ? (
          <ChevronDown className="h-3 w-3" />
        ) : (
          <ChevronRight className="h-3 w-3" />
        )}
        <CornerDownLeft className="h-3 w-3" />
        <span className="font-medium">
          {devName} has {tickets.length} unfinished ticket{tickets.length === 1 ? "" : "s"} from prior sprints
        </span>
        <span className="ml-auto text-dimmer">{open ? "Hide" : "Review"}</span>
      </button>
      {open && (
        <div className="px-2 pb-2 space-y-1">
          {tickets.map((t) => {
            const checkedRow = !excluded.has(t.id);
            const h = remaining(t, slot);
            return (
              <div
                key={t.id}
                className="flex items-center gap-2 px-1.5 py-1 rounded hover:bg-white/[0.03]"
              >
                {isPMBA && (
                  <Checkbox
                    checked={checkedRow}
                    onCheckedChange={() => toggle(t.id)}
                    aria-label="Include in carryover"
                  />
                )}
                <span className="font-mono text-[10px] text-dimmer w-14 shrink-0">
                  {t.formatted_id}
                </span>
                <span className="text-xs truncate flex-1 min-w-0">{t.title}</span>
                <span className="font-mono text-[10px] text-dim shrink-0">{formatHours(h)}</span>
              </div>
            );
          })}
          {isPMBA && (
            <div className="flex items-center justify-end gap-2 pt-1">
              <span className="text-[10px] text-dimmer mr-auto">
                {checked.length} of {tickets.length} selected
              </span>
              <Button
                size="sm"
                className="h-7 text-[11px]"
                onClick={confirm}
                disabled={busy || checked.length === 0}
              >
                Confirm carryover
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
