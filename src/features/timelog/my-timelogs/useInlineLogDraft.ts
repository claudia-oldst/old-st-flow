import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/store/currentUser";
import { useProjectRole } from "@/features/team/useProjectRole";
import { fetchTicketDetail } from "@/features/tickets/fetchTicketDetail";
import type { TicketRow } from "@/features/tickets/useProjectTickets";
import { useTicketCapacity, capacityFor } from "@/features/timelog/useTicketCapacity";
import { hoursMinutesToDecimal } from "@/features/timelog/utils";
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
  if (canBE && (role === "Fullstack" ? slots.includes("BE") : true)) {
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

export function useInlineLogDraft(onLogged?: () => void) {
  const user = useCurrentUser((s) => s.user);

  const [projectId, setProjectId] = useState<string | null>(null);
  const [ticketId, setTicketId] = useState<string | null>(null);
  const [ticket, setTicket] = useState<TicketRow | null>(null);
  const [discipline, setDiscipline] = useState<LogDiscipline | null>(null);
  const [note, setNote] = useState("");
  const [date, setDate] = useState<Date>(() => new Date());
  const [startTime, setStartTime] = useState("");
  const [durH, setDurH] = useState("");
  const [durM, setDurM] = useState("");
  const [busy, setBusy] = useState(false);

  const role = useProjectRole(projectId ?? undefined);

  // Load full ticket detail whenever the ticket changes.
  useEffect(() => {
    let cancelled = false;
    if (!ticketId) {
      setTicket(null);
      return;
    }
    fetchTicketDetail(ticketId).then((t) => {
      if (!cancelled) setTicket(t);
    });
    return () => {
      cancelled = true;
    };
  }, [ticketId]);

  const options = useMemo(
    () => disciplineOptionsFor(ticket, role, user?.id),
    [ticket, role, user?.id],
  );

  // Keep the discipline valid for the selected ticket.
  useEffect(() => {
    if (options.length === 0) {
      setDiscipline(null);
      return;
    }
    setDiscipline((d) => (d && options.some((o) => o.value === d) ? d : options[0].value));
  }, [options]);

  const { map: capMap, refetch: refetchCapacity } = useTicketCapacity(
    ticket ? [ticket] : [],
    !!ticket,
  );
  const capacity = useMemo(
    () => capacityFor(ticket ? capMap[ticket.id] : undefined, discipline ?? "Project"),
    [capMap, ticket, discipline],
  );

  const hours = hoursMinutesToDecimal(durH, durM);
  const canSave = !!user && !!ticket && !!discipline && hours > 0 && !busy;

  const reset = (keepProject = true) => {
    setTicketId(null);
    setTicket(null);
    setNote("");
    setStartTime("");
    setDurH("");
    setDurM("");
    setDate(new Date());
    if (!keepProject) setProjectId(null);
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
    if (!ticket || !discipline) return toast.error("Pick a project and ticket");
    if (hours <= 0) return toast.error("Enter a duration greater than 0");
    if (capacity.available <= 0 || capacity.actual + hours > capacity.available + 1e-6) {
      return toast.error("Adjust the estimate first — this would exceed available hours.");
    }
    setBusy(true);
    const { error } = await supabase.from("time_logs").insert({
      ticket_id: ticket.id,
      user_id: user.id,
      discipline,
      hours,
      note: note.trim() || null,
      source: "manual",
      logged_at: combineDateAndTime(date, startTime).toISOString(),
    });
    if (error) {
      setBusy(false);
      return toast.error(error.message);
    }
    await maybePromoteToActive(ticket);
    await refetchCapacity();
    setBusy(false);
    toast.success(`Logged ${hours}h`);
    reset();
    onLogged?.();
  };

  return {
    projectId,
    setProjectId,
    ticketId,
    setTicketId,
    ticket,
    discipline,
    setDiscipline,
    disciplineOptions: options,
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
    busy,
    canSave,
    save,
    reset,
  };
}
