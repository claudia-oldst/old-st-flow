import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { TicketRow } from "@/features/tickets/useProjectTickets";
import type { LogDiscipline, ProjectRole } from "@/lib/types";

export interface DisciplineOption {
  value: LogDiscipline;
  label: string;
}

export interface AllocationRow {
  ticket: TicketRow;
  minutes: number;
}

/** Discipline options available to this user for this ticket (mirrors LogTimeModal). */
export function disciplineOptionsFor(
  ticket: TicketRow | null,
  role: ProjectRole | null,
  userId: string | undefined,
): DisciplineOption[] {
  if (!ticket) return [];
  if (ticket.ticket_type === "Proj") return [{ value: "Project", label: "Project" }];

  const slots = userId
    ? ticket.assignees.filter((a) => a.user_id === userId).map((a) => a.slot)
    : [];
  const canFE = role === "Frontend" || role === "Fullstack";
  const canBE = role === "Backend" || role === "Fullstack";
  const out: DisciplineOption[] = [];

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
export function intersectOptions(lists: DisciplineOption[][]): DisciplineOption[] {
  if (lists.length === 0) return [];
  const first = lists[0];
  return first.filter((o) => lists.every((l) => l.some((x) => x.value === o.value)));
}

/** Moves a backlog ticket into the first active status once time is logged on it. */
export async function maybePromoteToActive(t: TicketRow) {
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
}
