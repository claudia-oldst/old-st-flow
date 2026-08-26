import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/store/currentUser";
import { useProjectRole } from "@/features/team/useProjectRole";
import { fetchTicketDetail } from "@/features/tickets/fetchTicketDetail";
import type { TicketRow } from "@/features/tickets/useProjectTickets";
import { useTicketCapacityByIds, capacityFor } from "@/features/timelog/useTicketCapacity";
import { evenSplit, hoursMinutesToDecimal } from "@/features/timelog/utils";
import type { LogDiscipline } from "@/lib/types";
import type { ProjectRole } from "@/lib/types";

/** Discipline options available to this user for this ticket (mirrors LogTimeModal). */
export function disciplineOptionsFor(
  ticket: TicketRow | null,
  role: ProjectRole | null,
  userId: string | undefined,
): { value: LogDiscipline; label: string }[] {
  if (!ticket) return [];
  if (ticket.ticket_type === "Proj") return [{ value: "Project", label: "Project" }];

  const slots = userId
    ? ticket.assignees.filter((a) => a.user_id === userId).map((a) => a.slot)
    : [];
  const canFE = role === "Frontend" || role === "Fullstack";
  const canBE = role === "Backend" || role === "Fullstack";
  const out: { value: LogDiscipline; label: string }[] = [];

  if (canFE && (role === "Fullstack" ? slots.includes("FE") : true)) {
    out.push({ value: "FE", label: "Frontend" });
  }
  if (canBE && (role === "Backend" ? slots.includes("BE") : true)) {
    out.push({ value: "BE", label: "Backend" });
  }
  if (role === "Fullstack" && out.length === 0) {
    out.push({ value: "FE", label: "Frontend" }, { value: "BE", label: "Backend" });
  }
  if (slots.includes("Project")) out.push({ value: "Project", label: "Project" });
  return out;
}

/** Combine a calendar date with an optional HH:mm start time. */
export function combineDateAndTime(date: Date, time: string): Date {
  const out = new Date(date);
  const m = /^(\d{1,2}):(\d{2})$/.exec(time.trim());
  if (m) {
    const h = Math.min(23, parseInt(m[1], 10));
    const mins = Math.min(59, parseInt(m[2], 10));
    out.setHours(h, mins, 0, 0);
  } else {
    const now = new Date();
    out.setHours(now.getHours(), now.getMinutes(), 0, 0);
  }
  return out;
}

/** Intersect arrays of discipline options by value. */
function intersectOptions(
  lists: { value: LogDiscipline; label: string }[][],
): { value: LogDiscipline; label: string }[] {
  if (lists.length === 0) return [];
  const first = lists[0];
  return first.filter((o) => lists.every((l) => l.some((x) => x.value === o.value)));
}

export interface AllocationRow {
  ticket: TicketRow;
  minutes: number;
}

export function useInlineLogDraft(onLogged?: () => void) {
  const user = useCurrentUser((s) => s.user);

  const [projectId, setProjectId] = useState<string | null>(null);
  const [ticketIds, setTicketIds] = useState<string[]>([]);
  const [tickets, setTickets] = useState<Record<string, TicketRow>>({});
  const [discipline, setDiscipline] = useState<LogDiscipline | null>(null);
  const [allocations, setAllocations] = useState<Record<string, number>>({});
  const [note, setNote] = useState("");
  const [date, setDate] = useState<Date>(() => new Date());
  const [startTime, setStartTime] = useState("");
  const [durH, setDurH] = useState("");
  const [durM, setDurM] = useState("");
  const [busy, setBusy] = useState(false);
  const [adjustTicketId, setAdjustTicketId] = useState<string | null>(null);

  const role = useProjectRole(projectId ?? undefined);

  // Load full ticket details whenever the selection changes.
  useEffect(() => {
    let cancelled = false;
    if (ticketIds.length === 0) {
      setTickets({});
      return;
    }
    Promise.all(ticketIds.map((id) => fetchTicketDetail(id))).then((loaded) => {
      if (cancelled) return;
      const next: Record<string, TicketRow> = {};
      for (const t of loaded) {
        if (t) next[t.id] = t;
      }
      setTickets(next);
    });
    return () => {
      cancelled = true;
    };
  }, [ticketIds.join(",")]);

  const perTicketOptions = useMemo(
    () => ticketIds.map((id) => disciplineOptionsFor(tickets[id] ?? null, role, user?.id)),
    [tickets, ticketIds, role, user?.id],
  );

  const disciplineOptions = useMemo(
    () => intersectOptions(perTicketOptions),
    [perTicketOptions],
  );

  // Keep the selected discipline valid for the current group.
  useEffect(() => {
    if (disciplineOptions.length === 0) {
      if (ticketIds.length > 0 && perTicketOptions.every((l) => l.length > 0)) {
        // All details loaded but no common discipline — remove the most recent ticket.
        const last = ticketIds[ticketIds.length - 1];
        toast.error("That ticket cannot be grouped with the current selection");
        setTicketIds((prev) => prev.filter((id) => id !== last));
      }
      setDiscipline(null);
      return;
    }
    setDiscipline((d) => (d && disciplineOptions.some((o) => o.value === d) ? d : disciplineOptions[0].value));
  }, [disciplineOptions, perTicketOptions, ticketIds]);

  const hours = hoursMinutesToDecimal(durH, durM);
  const totalMinutes = Math.round(hours * 60);

  // Distribute time evenly when the total or selection changes.
  useEffect(() => {
    if (ticketIds.length === 0) {
      setAllocations({});
      return;
    }
    const split = evenSplit(totalMinutes, ticketIds.length);
    const next: Record<string, number> = {};
    ticketIds.forEach((id, i) => {
      next[id] = split[i] ?? 0;
    });
    setAllocations(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [totalMinutes, ticketIds.join(",")]);

  const { map: capMap, refetch: refetchCapacity } = useTicketCapacityByIds(ticketIds, ticketIds.length > 0);

  const rows: AllocationRow[] = useMemo(
    () => ticketIds.map((id) => ({ ticket: tickets[id], minutes: allocations[id] ?? 0 })).filter((r): r is AllocationRow => !!r.ticket),
    [ticketIds, tickets, allocations],
  );

  const overflowingRowIds = useMemo(() => {
    if (!discipline) return [];
    return rows
      .filter((r) => {
        const cap = capacityFor(capMap[r.ticket.id], discipline);
        const allocatedHours = r.minutes / 60;
        if (allocatedHours <= 0) return false;
        if (cap.available <= 0) return true;
        return cap.actual + allocatedHours > cap.available + 1e-6;
      })
      .map((r) => r.ticket.id);
  }, [rows, capMap, discipline]);

  const allocatedMinutes = useMemo(
    () => rows.reduce((sum, r) => sum + (Number.isFinite(r.minutes) ? r.minutes : 0), 0),
    [rows],
  );
  const remainingMinutes = totalMinutes - allocatedMinutes;

  const canSave =
    !!user &&
    rows.length > 0 &&
    !!discipline &&
    totalMinutes > 0 &&
    allocatedMinutes === totalMinutes &&
    (rows.length === 1 || overflowingRowIds.length === 0) &&
    !busy;

  const distributeEvenly = () => {
    const split = evenSplit(totalMinutes, ticketIds.length);
    const next: Record<string, number> = {};
    ticketIds.forEach((id, i) => {
      next[id] = split[i] ?? 0;
    });
    setAllocations(next);
  };

  const reset = (keepProject = true) => {
    setTicketIds([]);
    setTickets({});
    setAllocations({});
    setDiscipline(null);
    setNote("");
    setStartTime("");
    setDurH("");
    setDurM("");
    setDate(new Date());
    if (!keepProject) setProjectId(null);
  };

  const toggleTicket = (id: string, ticketType: string) => {
    setTicketIds((prev) => {
      const exists = prev.includes(id);
      if (exists) {
        return prev.filter((x) => x !== id);
      }
      // Prevent mixing Project tickets with non-Project tickets.
      const hasProj = prev.some((x) => tickets[x]?.ticket_type === "Proj") || ticketType === "Proj";
      const hasNonProj = prev.some((x) => tickets[x]?.ticket_type !== "Proj") || ticketType !== "Proj";
      if (hasProj && hasNonProj) {
        toast.error("Project tickets cannot be grouped with FE/BE tickets");
        return prev;
      }
      return [...prev, id];
    });
  };

  const removeTicket = (id: string) => {
    setTicketIds((prev) => prev.filter((x) => x !== id));
  };

  const updateMinutes = (id: string, minutes: number) => {
    setAllocations((prev) => ({ ...prev, [id]: Math.max(0, Math.floor(minutes)) }));
  };

  const maybePromoteToActive = async (t: TicketRow) => {
    if (!t.status_id) return;
    const { data: status } = await supabase
      .from("statuses")
      .select("category")
      .eq("id", t.status_id)
      .maybeSingle();
    if (status?.category !== "backlog") return;
    const { data: nextActive } = await supabase
      .from("statuses")
      .select("id,name")
      .eq("category", "active")
      .order("position")
      .limit(1)
      .maybeSingle();
    if (nextActive) {
      await supabase.from("tickets").update({ status_id: nextActive.id }).eq("id", t.id);
      toast.info(`Moved to ${nextActive.name}`);
    }
  };

  const save = async () => {
    if (!user) return toast.error("Pick a user first");
    if (rows.length === 0 || !discipline) return toast.error("Pick a project and ticket");
    if (totalMinutes <= 0) return toast.error("Enter a duration greater than 0");
    if (allocatedMinutes !== totalMinutes) return toast.error("Allocated time must match the total");
    if (overflowingRowIds.length > 0) {
      if (rows.length === 1) {
        setAdjustTicketId(overflowingRowIds[0]);
        toast.info("This ticket exceeds its estimate — request more time to continue");
        return;
      }
      return toast.error("Adjust estimates on flagged tickets before saving");
    }

    const logs = rows
      .filter((r) => r.minutes > 0)
      .map((r) => ({
        ticket_id: r.ticket.id,
        user_id: user.id,
        discipline,
        hours: Math.round((r.minutes / 60) * 10000) / 10000,
        note: note.trim() || null,
        source: "manual" as const,
        logged_at: combineDateAndTime(date, startTime).toISOString(),
      }));

    if (logs.length === 0) return toast.error("Nothing to log — every ticket was set to 0");

    setBusy(true);
    const { error } = await supabase.from("time_logs").insert(logs);
    if (error) {
      setBusy(false);
      return toast.error(error.message);
    }

    for (const r of rows) {
      if (r.minutes > 0) await maybePromoteToActive(r.ticket);
    }

    await refetchCapacity();
    setBusy(false);
    const totalH = logs.reduce((s, l) => s + l.hours, 0);
    toast.success(`Logged ${totalH.toFixed(2)}h across ${logs.length} ticket${logs.length === 1 ? "" : "s"}`);
    reset();
    onLogged?.();
  };

  return {
    projectId,
    setProjectId,
    ticketIds,
    toggleTicket,
    removeTicket,
    rows,
    discipline,
    setDiscipline,
    disciplineOptions,
    note,
    setNote,
    date,
    setDate,
    startTime,
    setStartTime,
    durH,
    setDurH,
    durM,
    setDurM,
    hours,
    totalMinutes,
    allocations,
    updateMinutes,
    allocatedMinutes,
    remainingMinutes,
    distributeEvenly,
    busy,
    canSave,
    save,
    reset,
    capMap,
    overflowingRowIds,
    adjustTicketId,
    setAdjustTicketId,
    refetchCapacity,
  };
}
