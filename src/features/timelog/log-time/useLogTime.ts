import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/store/currentUser";
import type { LogDiscipline, ProjectRole } from "@/lib/types";
import type { TicketRow } from "@/features/tickets/useProjectTickets";
import { useTicketCapacity, capacityFor } from "@/features/timelog/useTicketCapacity";
import { toast } from "sonner";

export function useLogTime({
  open,
  ticket,
  role,
  onClose,
  onLogged,
}: {
  open: boolean;
  ticket: TicketRow;
  role: ProjectRole | null;
  onClose: () => void;
  onLogged?: () => void;
}) {
  const user = useCurrentUser((s) => s.user);

  const isProjTicket = ticket.ticket_type === "Proj";
  const canFE = role === "Frontend" || role === "Fullstack";
  const canBE = role === "Backend" || role === "Fullstack";
  const mySlotsOnTicket = user
    ? ticket.assignees.filter((a) => a.user_id === user.id).map((a) => a.slot)
    : [];
  const isProjectContributor = mySlotsOnTicket.includes("Project");
  const onlyProjectSlot =
    mySlotsOnTicket.length > 0 && mySlotsOnTicket.every((s) => s === "Project");

  const defaultDiscipline: LogDiscipline = (() => {
    if (isProjTicket) return "Project";
    if (onlyProjectSlot) return "Project";
    if (role === "Frontend") return "FE";
    if (role === "Backend") return "BE";
    if (mySlotsOnTicket.includes("FE") && !mySlotsOnTicket.includes("BE")) return "FE";
    if (mySlotsOnTicket.includes("BE") && !mySlotsOnTicket.includes("FE")) return "BE";
    if (canFE) return "FE";
    if (canBE) return "BE";
    return "Project";
  })();

  const [discipline, setDiscipline] = useState<LogDiscipline>(defaultDiscipline);
  useEffect(() => {
    setDiscipline(defaultDiscipline);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role, ticket.id, user?.id, open]);

  const [hours, setHours] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const maybePromoteToActive = async () => {
    const { data: status } = await supabase
      .from("statuses")
      .select("*")
      .eq("id", ticket.status_id!)
      .maybeSingle();
    if (status?.category === "backlog") {
      const { data: nextActive } = await supabase
        .from("statuses")
        .select("*")
        .eq("category", "active")
        .order("position")
        .limit(1)
        .maybeSingle();
      if (nextActive) {
        await supabase.from("tickets").update({ status_id: nextActive.id }).eq("id", ticket.id);
        toast.info(`Moved to ${nextActive.name}`);
      }
    }
  };

  const handleStartTimer = async () => {
    if (!user) return toast.error("Pick a user first");
    setBusy(true);
    const { error } = await supabase.from("active_timers").upsert(
      { user_id: user.id, ticket_id: ticket.id, discipline, started_at: new Date().toISOString() },
      { onConflict: "user_id" }
    );
    if (error) {
      setBusy(false);
      return toast.error(error.message);
    }
    await supabase.from("active_timer_tickets").delete().eq("user_id", user.id);
    const { error: gErr } = await supabase
      .from("active_timer_tickets")
      .insert({ user_id: user.id, ticket_id: ticket.id, position: 0 });
    setBusy(false);
    if (gErr) return toast.error(gErr.message);
    toast.success("Timer started");
    await maybePromoteToActive();
    onClose();
  };

  const handleManualLog = async () => {
    if (!user) return toast.error("Pick a user first");
    const h = parseFloat(hours);
    if (!h || h <= 0) return toast.error("Enter hours > 0");
    setBusy(true);
    const { error } = await supabase.from("time_logs").insert({
      ticket_id: ticket.id,
      user_id: user.id,
      discipline,
      hours: h,
      note: note || null,
      source: "manual",
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success(`Logged ${h}h`);
    setHours("");
    setNote("");
    await maybePromoteToActive();
    onLogged?.();
    onClose();
  };

  // Build discipline picker options (preserves original branching)
  const disciplineOptions: { value: LogDiscipline; label: string }[] = [];
  if (canFE && (role === "Fullstack" || role === "Frontend") && mySlotsOnTicket.includes("FE")) {
    disciplineOptions.push({ value: "FE", label: "Frontend" });
  } else if (canFE && role !== "Fullstack") {
    disciplineOptions.push({ value: "FE", label: "Frontend" });
  }
  if (canBE && (role === "Fullstack" || role === "Backend") && mySlotsOnTicket.includes("BE")) {
    disciplineOptions.push({ value: "BE", label: "Backend" });
  } else if (canBE && role !== "Fullstack") {
    disciplineOptions.push({ value: "BE", label: "Backend" });
  }
  if (role === "Fullstack" && disciplineOptions.length === 0) {
    disciplineOptions.push(
      { value: "FE", label: "Frontend" },
      { value: "BE", label: "Backend" }
    );
  }
  if (isProjectContributor) disciplineOptions.push({ value: "Project", label: "Project" });

  return {
    isProjTicket,
    discipline,
    setDiscipline,
    disciplineOptions,
    hours,
    setHours,
    note,
    setNote,
    busy,
    handleStartTimer,
    handleManualLog,
  };
}
