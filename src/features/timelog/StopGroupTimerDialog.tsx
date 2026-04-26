import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Trash2, Square, Split } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useTimerStore, type TimerTicket } from "@/store/timer";
import type { ActiveTimer, DisciplineStatus } from "@/lib/types";
import { DISCIPLINE_STATUS_LABEL } from "@/lib/types";
import { displayTitle, formatDuration } from "@/lib/utils";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  active: ActiveTimer;
  groupTickets: TimerTicket[];
  elapsedMs: number;
}

interface Row {
  ticket: TimerTicket;
  // Stored as seconds for precision; UI shows minutes.
  seconds: number;
  status: DisciplineStatus | null; // null for Overhead
  initialStatus: DisciplineStatus | null;
}

/**
 * Distribute a total amount across n rows as evenly as possible, with the
 * remainder added to the first row. Works for any unit (seconds or minutes).
 */
function evenSplit(total: number, n: number): number[] {
  if (n === 0) return [];
  const base = Math.floor(total / n);
  const remainder = total - base * n;
  const out = new Array(n).fill(base);
  if (out.length > 0) out[0] += remainder;
  return out;
}

const secondsToMinutes = (s: number) => Math.round((s / 60) * 100) / 100;
const minutesToSeconds = (m: number) => Math.round(m * 60);

export function StopGroupTimerDialog({
  open,
  onOpenChange,
  active,
  groupTickets,
  elapsedMs,
}: Props) {
  const setActive = useTimerStore((s) => s.setActive);
  const setTickets = useTimerStore((s) => s.setTickets);

  const totalSeconds = Math.max(0, Math.round(elapsedMs / 1000));
  const totalMinutesDisplay = secondsToMinutes(totalSeconds);
  const isOverhead = active.discipline === "Overhead";
  const disciplineKey: "fe_status" | "be_status" | null =
    active.discipline === "FE"
      ? "fe_status"
      : active.discipline === "BE"
      ? "be_status"
      : null;

  const [rows, setRows] = useState<Row[]>([]);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  // Initialize / re-initialize when opened
  useEffect(() => {
    if (!open) return;
    const sorted = [...groupTickets].sort((a, b) => a.position - b.position);
    const split = evenSplit(totalSeconds, sorted.length);
    setRows(
      sorted.map((t, i) => {
        const initialStatus = disciplineKey
          ? (t[disciplineKey] as DisciplineStatus)
          : null;
        return {
          ticket: t,
          seconds: split[i] ?? 0,
          status: initialStatus,
          initialStatus,
        };
      })
    );
    setNote("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const allocatedSeconds = useMemo(
    () => rows.reduce((sum, r) => sum + (Number.isFinite(r.seconds) ? r.seconds : 0), 0),
    [rows]
  );
  const allocatedMinutesDisplay = secondsToMinutes(allocatedSeconds);
  const remainingSeconds = totalSeconds - allocatedSeconds;
  const remainingMinutesDisplay = secondsToMinutes(remainingSeconds);

  const updateRow = (id: string, patch: Partial<Row>) => {
    setRows((prev) => prev.map((r) => (r.ticket.id === id ? { ...r, ...patch } : r)));
  };

  const removeRow = (id: string) => {
    setRows((prev) => prev.filter((r) => r.ticket.id !== id));
  };

  const distributeEvenly = () => {
    const split = evenSplit(totalSeconds, rows.length);
    setRows((prev) => prev.map((r, i) => ({ ...r, seconds: split[i] ?? 0 })));
  };

  const handleDiscard = async () => {
    setBusy(true);
    await supabase.from("active_timer_tickets").delete().eq("user_id", active.user_id);
    await supabase.from("active_timers").delete().eq("user_id", active.user_id);
    setActive(null);
    setTickets([]);
    setBusy(false);
    toast.info("Timer discarded");
    onOpenChange(false);
  };

  const handleSave = async () => {
    if (rows.length === 0) return toast.error("Add at least one ticket");
    // Allow tiny rounding mismatch (≤2s) caused by manual minute edits.
    if (Math.abs(remainingSeconds) > 2)
      return toast.error(
        `Allocated ${allocatedMinutesDisplay}m, expected ${totalMinutesDisplay}m`
      );
    if (rows.some((r) => r.seconds < 0))
      return toast.error("Time must be ≥ 0");

    setBusy(true);

    // 1) Insert one time_logs row per ticket.
    // We log every ticket the user explicitly chose, even if seconds rounds to
    // a tiny number, so no ticket is silently dropped from the log.
    const logs = rows
      .filter((r) => r.seconds > 0)
      .map((r) => ({
        ticket_id: r.ticket.id,
        user_id: active.user_id,
        discipline: active.discipline,
        // 4 decimals → 0.0003h ≈ 1 second resolution
        hours: Math.round((r.seconds / 3600) * 10000) / 10000,
        note: note.trim() || null,
        source: "timer" as const,
      }));
    if (logs.length === 0) {
      setBusy(false);
      return toast.error("Nothing to log — every ticket was set to 0.");
    }
    if (logs.length < rows.length) {
      // Tell the user which ones we skipped instead of silently swallowing them.
      const skipped = rows.filter((r) => r.seconds <= 0).map((r) => r.ticket.formatted_id);
      toast.warning(
        `Skipped ${skipped.length} ticket${skipped.length === 1 ? "" : "s"} with 0 time: ${skipped.join(", ")}`
      );
    }
    const { error: logErr } = await supabase.from("time_logs").insert(logs);
    if (logErr) {
      setBusy(false);
      return toast.error("Failed to save time: " + logErr.message);
    }

    // 2) Apply discipline status changes (if any)
    if (disciplineKey) {
      const statusUpdates = rows.filter(
        (r) => r.status && r.status !== r.initialStatus
      );
      for (const r of statusUpdates) {
        await supabase
          .from("tickets")
          .update({ [disciplineKey]: r.status } as any)
          .eq("id", r.ticket.id);
      }
    }

    // 3) Backlog → Active promotion per ticket (only those that got time logged)
    const loggedRows = rows.filter((r) => r.seconds > 0);
    if (loggedRows.length > 0) {
      const statusIds = Array.from(
        new Set(loggedRows.map((r) => r.ticket.status_id).filter(Boolean) as string[])
      );
      if (statusIds.length > 0) {
        const { data: statuses } = await supabase
          .from("statuses")
          .select("*")
          .in("id", statusIds);
        const backlogIds = new Set(
          (statuses ?? []).filter((s) => s.category === "backlog").map((s) => s.id)
        );
        const backlogTickets = loggedRows.filter(
          (r) => r.ticket.status_id && backlogIds.has(r.ticket.status_id)
        );
        if (backlogTickets.length > 0) {
          const { data: nextActive } = await supabase
            .from("statuses")
            .select("*")
            .eq("category", "active")
            .order("position")
            .limit(1)
            .maybeSingle();
          if (nextActive) {
            await supabase
              .from("tickets")
              .update({ status_id: nextActive.id })
              .in(
                "id",
                backlogTickets.map((r) => r.ticket.id)
              );
          }
        }
      }
    }

    // 4) Clear timer
    await supabase.from("active_timer_tickets").delete().eq("user_id", active.user_id);
    await supabase.from("active_timers").delete().eq("user_id", active.user_id);
    setActive(null);
    setTickets([]);

    setBusy(false);
    const totalH = logs.reduce((s, l) => s + l.hours, 0);
    toast.success(
      `Logged ${totalH.toFixed(2)}h across ${logs.length} ticket${logs.length === 1 ? "" : "s"}`
    );
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-strong max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Square className="h-4 w-4" />
            Stop & log time
          </DialogTitle>
          <div className="text-xs text-dim mt-1">
            Elapsed{" "}
            <span className="font-mono text-foreground">{formatDuration(elapsedMs)}</span> ·{" "}
            <span className="text-foreground">{totalMinutesDisplay}m</span> · Discipline{" "}
            <span className="text-foreground">
              {active.discipline === "FE"
                ? "Frontend"
                : active.discipline === "BE"
                ? "Backend"
                : "Overhead"}
            </span>
          </div>
        </DialogHeader>

        {/* Allocation indicator */}
        <div className="flex items-center justify-between text-xs">
          <span
            className={
              Math.abs(remainingSeconds) <= 2
                ? "text-green-400"
                : remainingSeconds > 0
                ? "text-amber-300"
                : "text-red-400"
            }
          >
            Allocated <span className="font-mono">{allocatedMinutesDisplay}</span> /{" "}
            <span className="font-mono">{totalMinutesDisplay}</span> min
            {Math.abs(remainingSeconds) > 2 && (
              <span className="ml-2 opacity-80">
                ({remainingSeconds > 0
                  ? `+${remainingMinutesDisplay} unallocated`
                  : `${remainingMinutesDisplay} over`})
              </span>
            )}
          </span>
          <button
            type="button"
            onClick={distributeEvenly}
            disabled={rows.length === 0}
            className="inline-flex items-center gap-1 text-foreground hover:underline disabled:opacity-50 disabled:no-underline"
          >
            <Split className="h-3 w-3" /> Distribute evenly
          </button>
        </div>

        {totalSeconds > 0 && rows.some((r) => r.seconds === 0) && (
          <div className="text-xs text-amber-300 bg-amber-500/10 hairline rounded-lg px-3 py-2">
            One or more tickets ended up with 0 minutes. They'll be skipped on save — adjust the split below if every ticket should get time.
          </div>
        )}

        {/* Rows */}
        <div className="rounded-lg hairline divide-y divide-white/5 max-h-[320px] overflow-y-auto">
          {rows.length === 0 ? (
            <div className="p-6 text-center text-sm text-dim">
              All tickets removed. Discard the timer to throw away the time.
            </div>
          ) : (
            rows.map((r) => (
              <div
                key={r.ticket.id}
                className="flex items-center gap-2 px-3 py-2"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[11px] text-dimmer">
                      {r.ticket.formatted_id}
                    </span>
                  </div>
                  <div className="text-sm truncate">
                    {displayTitle(r.ticket.title, "Standard")}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Input
                    type="number"
                    step="0.25"
                    min="0"
                    value={secondsToMinutes(r.seconds)}
                    onChange={(e) =>
                      updateRow(r.ticket.id, {
                        seconds: Math.max(0, minutesToSeconds(parseFloat(e.target.value) || 0)),
                      })
                    }
                    className="h-8 w-20 text-sm font-mono"
                  />
                  <span className="text-[11px] text-dimmer">min</span>
                </div>
                {!isOverhead && r.status && (
                  <Select
                    value={r.status}
                    onValueChange={(v) =>
                      updateRow(r.ticket.id, { status: v as DisciplineStatus })
                    }
                  >
                    <SelectTrigger className="h-8 w-[140px] text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(["todo", "in_progress", "done"] as const).map((s) => (
                        <SelectItem key={s} value={s} className="text-xs">
                          {DISCIPLINE_STATUS_LABEL[s]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                <button
                  type="button"
                  onClick={() => removeRow(r.ticket.id)}
                  className="p-1.5 rounded hover:bg-white/5 text-dimmer hover:text-red-400 transition"
                  aria-label="Remove ticket"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))
          )}
        </div>

        <div className="space-y-2">
          <Label className="text-xs">
            Global comment <span className="text-dimmer">(applied to all entries)</span>
          </Label>
          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            placeholder="What did you work on?"
          />
        </div>

        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={handleDiscard} disabled={busy}>
            Discard
          </Button>
          <Button
            onClick={handleSave}
            disabled={
              busy ||
              rows.length === 0 ||
              Math.abs(remainingSeconds) > 2 ||
              totalSeconds === 0 ||
              rows.every((r) => r.seconds === 0)
            }
          >
            Save logs
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
