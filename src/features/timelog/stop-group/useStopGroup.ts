import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTimerStore, type TimerTicket } from "@/store/timer";
import type { ActiveTimer, DisciplineStatus, LogDiscipline } from "@/lib/types";
import { toast } from "sonner";
import { evenSplit } from "../utils";
import { useTicketCapacityByIds, capacityFor } from "../useTicketCapacity";

export interface StopRow {
  ticket: TimerTicket;
  /** Stored and edited as whole minutes. */
  minutes: number;
  status: DisciplineStatus | null;
  initialStatus: DisciplineStatus | null;
}

export function useStopGroup({
  open,
  active,
  groupTickets,
  elapsedMs,
  onClose,
}: {
  open: boolean;
  active: ActiveTimer;
  groupTickets: TimerTicket[];
  elapsedMs: number;
  onClose: () => void;
}) {
  const setActive = useTimerStore((s) => s.setActive);
  const setTickets = useTimerStore((s) => s.setTickets);

  const totalMinutes = Math.max(0, Math.floor(elapsedMs / 60000));
  const isProject = active.discipline === "Project";
  const disciplineKey: "fe_status" | "be_status" | null =
    active.discipline === "FE"
      ? "fe_status"
      : active.discipline === "BE"
      ? "be_status"
      : null;

  const [rows, setRows] = useState<StopRow[]>([]);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    const sorted = [...groupTickets].sort((a, b) => a.position - b.position);
    const split = evenSplit(totalMinutes, sorted.length);
    setRows(
      sorted.map((t, i) => {
        const initialStatus = disciplineKey
          ? (t[disciplineKey] as DisciplineStatus)
          : null;
        return {
          ticket: t,
          minutes: split[i] ?? 0,
          status: initialStatus,
          initialStatus,
        };
      })
    );
    setNote("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const ids = useMemo(() => rows.map((r) => r.ticket.id), [rows]);
  const { map: capMap, refetch: refetchCapacity } = useTicketCapacityByIds(ids, open);
  const discipline: LogDiscipline = active.discipline;

  const overflowsRow = (id: string, minutes: number) => {
    const cap = capacityFor(capMap[id], discipline);
    if (cap.available <= 0) return false;
    return cap.actual + minutes / 60 > cap.available + 1e-6;
  };
  const overflowingRowIds = useMemo(
    () => rows.filter((r) => overflowsRow(r.ticket.id, r.minutes)).map((r) => r.ticket.id),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rows, capMap, discipline],
  );

  const allocatedMinutes = useMemo(
    () => rows.reduce((sum, r) => sum + (Number.isFinite(r.minutes) ? r.minutes : 0), 0),
    [rows]
  );
  const remainingMinutes = totalMinutes - allocatedMinutes;

  const updateRow = (id: string, patch: Partial<StopRow>) =>
    setRows((prev) => prev.map((r) => (r.ticket.id === id ? { ...r, ...patch } : r)));

  const removeRow = (id: string) =>
    setRows((prev) => prev.filter((r) => r.ticket.id !== id));

  const distributeEvenly = () => {
    const split = evenSplit(totalMinutes, rows.length);
    setRows((prev) => prev.map((r, i) => ({ ...r, minutes: split[i] ?? 0 })));
  };

  const handleDiscard = async () => {
    setBusy(true);
    await supabase.from("active_timer_tickets").delete().eq("user_id", active.user_id);
    await supabase.from("active_timers").delete().eq("user_id", active.user_id);
    setActive(null);
    setTickets([]);
    setBusy(false);
    toast.info("Timer discarded");
    onClose();
  };

  const handleSave = async () => {
    if (rows.length === 0) return toast.error("Add at least one ticket");
    if (remainingMinutes !== 0)
      return toast.error(`Allocated ${allocatedMinutes}m, expected ${totalMinutes}m`);
    if (rows.some((r) => r.minutes < 0)) return toast.error("Time must be ≥ 0");

    setBusy(true);

    const logs = rows
      .filter((r) => r.minutes > 0)
      .map((r) => ({
        ticket_id: r.ticket.id,
        user_id: active.user_id,
        discipline: active.discipline,
        hours: Math.round((r.minutes / 60) * 10000) / 10000,
        note: note.trim() || null,
        source: "timer" as const,
      }));
    if (logs.length === 0) {
      setBusy(false);
      return toast.error("Nothing to log — every ticket was set to 0.");
    }
    if (logs.length < rows.length) {
      const skipped = rows.filter((r) => r.minutes <= 0).map((r) => r.ticket.formatted_id);
      toast.warning(
        `Skipped ${skipped.length} ticket${skipped.length === 1 ? "" : "s"} with 0 time: ${skipped.join(", ")}`
      );
    }
    const { error: logErr } = await supabase.from("time_logs").insert(logs);
    if (logErr) {
      setBusy(false);
      return toast.error("Failed to save time: " + logErr.message);
    }

    if (disciplineKey) {
      const statusUpdates = rows.filter((r) => r.status && r.status !== r.initialStatus);
      for (const r of statusUpdates) {
        await supabase
          .from("tickets")
          .update(
            disciplineKey === "fe_status"
              ? { fe_status: r.status }
              : { be_status: r.status }
          )
          .eq("id", r.ticket.id);
      }
    }

    const loggedRows = rows.filter((r) => r.minutes > 0);
    if (loggedRows.length > 0) {
      const statusIds = Array.from(
        new Set(loggedRows.map((r) => r.ticket.status_id).filter(Boolean) as string[])
      );
      if (statusIds.length > 0) {
        const { data: statuses } = await supabase.from("statuses").select("*").in("id", statusIds);
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
              .in("id", backlogTickets.map((r) => r.ticket.id));
          }
        }
      }
    }

    await supabase.from("active_timer_tickets").delete().eq("user_id", active.user_id);
    await supabase.from("active_timers").delete().eq("user_id", active.user_id);
    setActive(null);
    setTickets([]);

    setBusy(false);
    const totalH = logs.reduce((s, l) => s + l.hours, 0);
    toast.success(
      `Logged ${totalH.toFixed(2)}h across ${logs.length} ticket${logs.length === 1 ? "" : "s"}`
    );
    onClose();
  };

  return {
    rows,
    note,
    setNote,
    busy,
    isProject,
    totalMinutes,
    allocatedMinutes,
    remainingMinutes,
    updateRow,
    removeRow,
    distributeEvenly,
    handleDiscard,
    handleSave,
  };
}
