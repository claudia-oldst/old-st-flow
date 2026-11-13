import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Clock, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { cn, formatHours } from "@/lib/utils";
import type { LogDiscipline } from "@/lib/types";
import type { TicketLogEntry } from "./useTicketTimeLogs";
import { useTicketCapacity, capacityFor } from "./useTicketCapacity";
import { RequestMoreTimeDialog, type AdjustSlot } from "@/features/tickets/RequestMoreTimeDialog";
import { DurationInput } from "./log-time/DurationInput";
import { hoursMinutesToDecimal, decimalToHoursMinutes } from "./utils";
import { formatLoggedAt, loggerOffset } from "@/lib/reportingTz";
import { useEditableTickets } from "./edit-log/useEditableTickets";
import { EditLogTicketPicker } from "./edit-log/EditLogTicketPicker";
import { allowedDisciplines, usedExcludingLog } from "./edit-log/editLogHelpers";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  log: TicketLogEntry;
  ticketId: string;
  projectId?: string;
  ticketLabel?: string;
  onSaved?: () => void;
}

/** Edit every part of one of the current user's time logs (or delete it). */
export function EditTimeLogDialog({ open, onOpenChange, log, ticketId, projectId, ticketLabel, onSaved }: Props) {
  const init = () => {
    const hm = decimalToHoursMinutes(log.hours);
    const d = new Date(log.logged_at);
    return {
      h: String(hm.h), m: String(hm.m), note: log.note ?? "",
      date: formatLoggedAt(d, log.logged_tz_offset, "yyyy-MM-dd"),
      time: formatLoggedAt(d, log.logged_tz_offset, "HH:mm"),
    };
  };
  const [f, setF] = useState(init);
  const [selTicket, setSelTicket] = useState(ticketId);
  const [disc, setDisc] = useState<LogDiscipline>(log.discipline);
  const [busy, setBusy] = useState(false);
  const [adjustOpen, setAdjustOpen] = useState(false);

  useEffect(() => {
    if (open) { setF(init()); setSelTicket(ticketId); setDisc(log.discipline); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, log.id]);

  const { data: tickets = [], isLoading } = useEditableTickets(projectId, log.user_id, ticketId, open);
  const ticket = tickets.find((t) => t.id === selTicket);
  const options = useMemo(() => (ticket ? allowedDisciplines(ticket, log.discipline) : [disc]), [ticket, log.discipline, disc]);
  useEffect(() => { if (ticket && !options.includes(disc)) setDisc(options[0]); }, [ticket, options, disc]);

  const { map, refetch } = useTicketCapacity(ticket ? [ticket] : [], open && !!ticket);
  const cap = capacityFor(map[selTicket], disc);
  const baseUsed = usedExcludingLog(cap.actual, { ticketId, discipline: log.discipline, hours: log.hours }, { ticketId: selTicket, discipline: disc });
  const entered = hoursMinutesToDecimal(f.h, f.m);
  const overflows = !!ticket && cap.available > 0 && baseUsed + entered > cap.available + 1e-6;
  const remaining = Math.max(0, cap.available - baseUsed);
  const adjustSlot: AdjustSlot = disc === "Project" ? "Proj" : disc;
  const orig = init();
  const whenChanged = f.date !== orig.date || f.time !== orig.time;

  const handleSave = async () => {
    if (!entered || entered <= 0) return toast.error("Enter hours > 0");
    if (!ticket) return toast.error("Still loading ticket…");
    if (overflows) return toast.error("Adjust the estimate first — this exceeds available hours.");
    const patch: Record<string, unknown> = { hours: entered, note: f.note || null, ticket_id: selTicket, discipline: disc };
    if (whenChanged) {
      const at = new Date(`${f.date}T${f.time || "00:00"}`);
      if (Number.isNaN(at.getTime())) return toast.error("Invalid date/time");
      patch.logged_at = at.toISOString();
      patch.logged_tz_offset = loggerOffset();
    }
    setBusy(true);
    const { error } = await supabase.from("time_logs").update(patch as any).eq("id", log.id);
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
            <DialogTitle className="flex items-center gap-2"><Clock className="h-4 w-4" />Edit time log</DialogTitle>
            <div className="text-[11px] font-mono mt-1 h-4">
              {!ticket ? (
                <span className="text-dimmer inline-flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" />Loading estimate…</span>
              ) : cap.available > 0 ? (
                <span className={overflows ? "text-primary" : "text-dimmer"}>
                  Used {formatHours(baseUsed)} / {formatHours(cap.available)} (excl. this log)
                </span>
              ) : null}
            </div>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>Ticket</Label>
              <EditLogTicketPicker tickets={tickets} value={selTicket} onChange={setSelTicket} fallbackLabel={isLoading ? (ticketLabel ?? "Loading…") : (ticketLabel ?? "Ticket")} />
            </div>
            {options.length > 1 && (
              <div className="flex gap-2">
                {options.map((o) => (
                  <Button key={o} type="button" size="sm" variant={o === disc ? "default" : "outline"} onClick={() => setDisc(o)}>{o}</Button>
                ))}
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Date</Label>
                <Input type="date" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Start time</Label>
                <Input type="time" value={f.time} onChange={(e) => setF({ ...f, time: e.target.value })} />
              </div>
            </div>
            <div className="space-y-2">
              <DurationInput h={f.h} m={f.m} onChange={(h, m) => setF({ ...f, h, m })} invalid={overflows} />
              {overflows && (
                <p className="text-[11px] text-primary">
                  Exceeds the available estimate ({formatHours(remaining)} left). Adjust the estimate to log more.
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Description <span className="text-dimmer">(optional)</span></Label>
              <Textarea value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} rows={3} />
            </div>
          </div>

          <DialogFooter className="flex sm:justify-between gap-2">
            <Button variant="ghost" onClick={handleDelete} disabled={busy} className="text-primary hover:text-primary gap-1.5">
              <Trash2 className="h-3.5 w-3.5" /> Delete
            </Button>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
              {overflows ? (
                <Button onClick={() => setAdjustOpen(true)}>Adjust estimate</Button>
              ) : (
                <Button onClick={handleSave} disabled={busy || !ticket}>Save</Button>
              )}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {adjustOpen && ticket && (
        <RequestMoreTimeDialog
          open={adjustOpen}
          onOpenChange={setAdjustOpen}
          ticketId={ticket.id}
          projectId={ticket.project_id}
          currentFE={ticket.current_fe_estimate}
          currentBE={ticket.current_be_estimate}
          actualFE={ticket.actual_frontend_hours}
          actualBE={ticket.actual_backend_hours}
          currentProj={ticket.current_project_estimate}
          actualProj={ticket.actual_project_hours}
          allowedSlots={[adjustSlot]}
          defaultSlot={adjustSlot}
          helperText={`Editing this log to ${formatHours(entered)} would exceed the available estimate (${formatHours(remaining)} left). Adjust to continue.`}
          onSaved={() => { setAdjustOpen(false); refetch(); }}
        />
      )}
    </>
  );
}
