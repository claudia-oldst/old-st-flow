import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/store/currentUser";
import type { LogDiscipline, ProjectRole } from "@/lib/types";
import type { TicketRow } from "@/features/tickets/useProjectTickets";
import { useTicketCapacity, capacityFor } from "@/features/timelog/useTicketCapacity";
import { toast } from "sonner";

export type StatusFilter = "open" | "todo" | "in_progress";
export type TypeFilter = "all" | "Standard" | "Bug" | "CR" | "Proj";

export function useStartGroup({
  open,
  tickets,
  role,
  onClose,
}: {
  open: boolean;
  tickets: TicketRow[];
  role: ProjectRole | null;
  onClose: () => void;
}) {
  const user = useCurrentUser((s) => s.user);

  const canFE = role === "Frontend" || role === "Fullstack";
  const canBE = role === "Backend" || role === "Fullstack";

  const hasProjectAssignments = useMemo(() => {
    if (!user) return false;
    return tickets.some((t) =>
      t.assignees.some((a) => a.user_id === user.id && a.slot === "Project")
    );
  }, [tickets, user]);

  const defaultDiscipline: LogDiscipline = canFE ? "FE" : canBE ? "BE" : "Project";

  const [discipline, setDiscipline] = useState<LogDiscipline>(defaultDiscipline);

  useEffect(() => {
    setDiscipline(defaultDiscipline);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role, user?.id, open]);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("open");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);

  const myTickets = useMemo(() => {
    if (!user) return [];
    return tickets.filter((t) => {
      const myAssignments = t.assignees.filter((a) => a.user_id === user.id);
      if (myAssignments.length === 0) return false;
      if (discipline === "Project") return myAssignments.some((a) => a.slot === "Project");
      if (t.ticket_type === "Proj") return false;
      return myAssignments.some((a) => a.slot === discipline);
    });
  }, [tickets, user, discipline]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return myTickets.filter((t) => {
      const dStatus =
        discipline === "FE" ? t.fe_status : discipline === "BE" ? t.be_status : null;
      if (statusFilter === "open") {
        if (dStatus === "done") return false;
      } else if (statusFilter === "todo") {
        if (dStatus !== "todo") return false;
      } else if (statusFilter === "in_progress") {
        if (dStatus !== "in_progress") return false;
      }
      if (typeFilter !== "all" && t.ticket_type !== typeFilter) return false;
      if (q) {
        const hay = `${t.formatted_id} ${t.title}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [myTickets, search, statusFilter, typeFilter, discipline]);

  const { map: capMap, refetch: refetchCapacity } = useTicketCapacity(visible, open);

  const isOver = (id: string) => capacityFor(capMap[id], discipline).isOver;

  const needsEstimate = (t: TicketRow) =>
    discipline === "FE"
      ? !t.has_original_fe_estimate
      : discipline === "BE"
        ? !t.has_original_be_estimate
        : !t.has_original_project_estimate;

  const blockedSelectedTickets = useMemo(
    () => visible.filter((t) => selected.has(t.id) && (isOver(t.id) || needsEstimate(t))),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [visible, selected, capMap, discipline],
  );

  const allVisibleSelected = visible.length > 0 && visible.every((t) => selected.has(t.id));

  const toggleSelect = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const toggleAllVisible = () =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (allVisibleSelected) visible.forEach((t) => next.delete(t.id));
      else visible.forEach((t) => next.add(t.id));
      return next;
    });

  const handleStart = async () => {
    if (!user) return toast.error("Pick a user first");
    if (selected.size === 0) return toast.error("Select at least one ticket");
    if (blockedSelectedTickets.length > 0) {
      return toast.error("Adjust estimates on flagged tickets before starting");
    }

    const orderedSelected: string[] = [];
    visible.forEach((t) => selected.has(t.id) && orderedSelected.push(t.id));
    selected.forEach((id) => {
      if (!orderedSelected.includes(id)) orderedSelected.push(id);
    });

    setBusy(true);

    await supabase.from("active_timer_tickets").delete().eq("user_id", user.id);
    const { error: tErr } = await supabase.from("active_timers").upsert(
      {
        user_id: user.id,
        ticket_id: orderedSelected[0],
        discipline,
        started_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    );
    if (tErr) {
      setBusy(false);
      return toast.error(tErr.message);
    }

    const groupRows = orderedSelected.map((ticket_id, position) => ({
      user_id: user.id,
      ticket_id,
      position,
    }));
    const { error: gErr } = await supabase.from("active_timer_tickets").insert(groupRows);
    setBusy(false);
    if (gErr) return toast.error(gErr.message);

    toast.success(
      `Timer started on ${orderedSelected.length} ticket${orderedSelected.length === 1 ? "" : "s"}`
    );
    setSelected(new Set());
    setSearch("");
    onClose();
  };

  const disciplineOptions: { value: LogDiscipline; label: string }[] = [];
  if (role === "Fullstack") {
    disciplineOptions.push({ value: "FE", label: "Frontend" }, { value: "BE", label: "Backend" });
  } else if (role === "Frontend") {
    disciplineOptions.push({ value: "FE", label: "Frontend" });
  } else if (role === "Backend") {
    disciplineOptions.push({ value: "BE", label: "Backend" });
  }
  if (hasProjectAssignments) disciplineOptions.push({ value: "Project", label: "Project" });

  const onDisciplineChange = (d: LogDiscipline) => {
    setDiscipline(d);
    setSelected(new Set());
  };

  return {
    user,
    discipline,
    onDisciplineChange,
    disciplineOptions,
    search,
    setSearch,
    statusFilter,
    setStatusFilter,
    typeFilter,
    setTypeFilter,
    selected,
    toggleSelect,
    toggleAllVisible,
    allVisibleSelected,
    visible,
    busy,
    handleStart,
    capMap,
    isOver,
    blockedSelectedTickets,
    refetchCapacity,
  };
}
