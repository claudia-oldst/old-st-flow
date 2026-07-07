import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/store/currentUser";
import type { LogDiscipline, ProjectRole } from "@/lib/types";
import type { TicketRow } from "@/features/tickets/useProjectTickets";
import { useTicketCapacity, capacityFor } from "@/features/timelog/useTicketCapacity";
import { toast } from "sonner";
import { hoursMinutesToDecimal } from "../utils";

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

  const [durH, setDurH] = useState("");
  const [durM, setDurM] = useState("");
  const setDuration = (h: string, m: string) => { setDurH(h); setDurM(m); };
  const note_hours_placeholder = ""; // reserved
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

  const { map: capMap, refetch: refetchCapacity } = useTicketCapacity([ticket], open);
  const capacity = useMemo(
    () => capacityFor(capMap[ticket.id], discipline),
    [capMap, ticket.id, discipline],
  );

  const wouldOverflowManual = (h: number) =>
    capacity.available > 0 && capacity.actual + h > capacity.available + 1e-6;

  const handleManualLog = async () => {
    if (!user) return toast.error("Pick a user first");
    const h = hoursMinutesToDecimal(durH, durM);
    if (!h || h <= 0) return toast.error("Enter a duration greater than 0");
    if (wouldOverflowManual(h)) {
      return toast.error("Adjust the estimate first — this would exceed available hours.");
    }
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
    setDuration("", "");
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

  const missingEstimate = useMemo(() => {
    if (discipline === "FE") return !ticket.has_original_fe_estimate;
    if (discipline === "BE") return !ticket.has_original_be_estimate;
    return !ticket.has_original_project_estimate;
  }, [discipline, ticket.has_original_fe_estimate, ticket.has_original_be_estimate, ticket.has_original_project_estimate]);

  const saveOriginalEstimate = async (raw: string): Promise<boolean> => {
    const v = parseFloat(raw);
    if (Number.isNaN(v) || v < 0) {
      toast.error("Enter an estimate (0 or more)");
      return false;
    }
    const patch =
      discipline === "FE"
        ? { original_fe_estimate: v, current_fe_estimate: v }
        : discipline === "BE"
          ? { original_be_estimate: v, current_be_estimate: v }
          : { original_project_estimate: v, current_project_estimate: v };
    const { error } = await supabase.from("tickets").update(patch as any).eq("id", ticket.id);
    if (error) {
      toast.error(error.message);
      return false;
    }
    toast.success("Estimate set");
    await refetchCapacity();
    return true;
  };

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
    capacity,
    refetchCapacity,
    wouldOverflowManual,
    missingEstimate,
    saveOriginalEstimate,
  };
}
