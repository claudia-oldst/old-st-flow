import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Clock, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { cn, formatHours } from "@/lib/utils";
import type { TicketLogEntry } from "./useTicketTimeLogs";
import {
  useTicketCapacity,
  capacityFor,
} from "./useTicketCapacity";
import {
  RequestMoreTimeDialog,
  type AdjustSlot,
} from "@/features/tickets/RequestMoreTimeDialog";
import type { TicketRow } from "@/features/tickets/useProjectTickets";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  log: TicketLogEntry;
  ticket: TicketRow;
  onSaved?: () => void;
}

/**
 * Edit (or delete) one of the current user's existing time logs.
 * Reuses the same capacity guard + RequestMoreTimeDialog as new logs:
 * if the new total hours would exceed `available`, the user is sent to
 * adjust the estimate first.
 */
export function EditTimeLogDialog({
  open,
  onOpenChange,
  log,
  ticket,
  onSaved,
}: Props) {
  const [hours, setHours] = useState(String(log.hours));
  const [note, setNote] = useState(log.note ?? "");
  const [busy, setBusy] = useState(false);
  const [adjustOpen, setAdjustOpen] = useState(false);

  useEffect(() => {
    if (open) {
      setHours(String(log.hours));
      setNote(log.note ?? "");
    }
  }, [open, log.id, log.hours, log.note]);

  const { map, refetch } = useTicketCapacity([ticket], open);
  const cap = capacityFor(map[ticket.id], log.discipline);

  // Capacity excluding this log's existing contribution.
  const baseUsed = Math.max(0, cap.actual - log.hours);
  const entered = parseFloat(hours) || 0;
  const overflows =
    cap.available > 0 && baseUsed + entered > cap.available + 1e-6;
  const remaining = Math.max(0, cap.available - baseUsed);
  const adjustSlot: AdjustSlot =
    log.discipline === "Project" ? "Proj" : log.discipline;

  const handleSave = async () => {
    if (!entered || entered <= 0) return toast.error("Enter hours > 0");
    if (overflows)
      return toast.error("Adjust the estimate first — this exceeds available hours.");
    setBusy(true);
    const { error } = await supabase
      .from("time_logs")
      .update({ hours: entered, note: note || null })
      .eq("id", log.id);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Time log updated");
    onSaved?.();
    onOpenChange(false);
  };

  const handleDelete = async () => {
    if (!confirm("Delete this time log?")) return;
    setBusy(true);
    const { error } = await supabase.from("time_logs").delete().eq("id", log.id);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Time log deleted");
    onSaved?.();
    onOpenChange(false);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="glass-strong">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Edit time log
            </DialogTitle>
            <div className="text-xs text-dim mt-1">
              {log.discipline} · logged{" "}
              {new Date(log.logged_at).toLocaleDateString()} ·{" "}
              <span className="capitalize">{log.source}</span>
            </div>
            {cap.available > 0 && (
              <div
                className={cn(
                  "text-[11px] font-mono mt-1",
                  overflows ? "text-primary" : "text-dimmer",
                )}
              >
                Used {formatHours(baseUsed)} / {formatHours(cap.available)} (excl.
                this log)
              </div>
            )}
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>Hours</Label>
              <Input
                type="number"
                step="0.25"
                min="0.25"
                value={hours}
                onChange={(e) => setHours(e.target.value)}
                className={cn(overflows && "border-primary focus-visible:ring-primary")}
              />
              {overflows && (
                <p className="text-[11px] text-primary">
                  Exceeds the available estimate ({formatHours(remaining)} left).
                  Adjust the estimate to log more.
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label>
                Note <span className="text-dimmer">(optional)</span>
              </Label>
              <Textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter className="flex sm:justify-between gap-2">
            <Button
              variant="ghost"
              onClick={handleDelete}
              disabled={busy}
              className="text-primary hover:text-primary gap-1.5"
            >
              <Trash2 className="h-3.5 w-3.5" /> Delete
            </Button>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              {overflows ? (
                <Button onClick={() => setAdjustOpen(true)}>Adjust estimate</Button>
              ) : (
                <Button onClick={handleSave} disabled={busy}>
                  Save
                </Button>
              )}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {adjustOpen && (
        <RequestMoreTimeDialog
          open={adjustOpen}
          onOpenChange={setAdjustOpen}
          ticketId={ticket.id}
          currentFE={ticket.current_fe_estimate}
          currentBE={ticket.current_be_estimate}
          actualFE={ticket.actual_frontend_hours}
          actualBE={ticket.actual_backend_hours}
          currentProj={ticket.current_project_estimate}
          actualProj={ticket.actual_project_hours}
          allowedSlots={[adjustSlot]}
          defaultSlot={adjustSlot}
          helperText={`Editing this log to ${formatHours(entered)} would exceed the available estimate (${formatHours(remaining)} left). Adjust to continue.`}
          onSaved={() => {
            setAdjustOpen(false);
            refetch();
          }}
        />
      )}
    </>
  );
}
