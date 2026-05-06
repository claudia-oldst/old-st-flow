import { supabase } from "@/integrations/supabase/client";
import type { LogDiscipline } from "@/lib/types";

export interface StartTicketTimerArgs {
  userId: string;
  ticketId: string;
  discipline: LogDiscipline;
}

export type StartTicketTimerResult =
  | { ok: true }
  | { ok: false; reason: "active" | "error"; message?: string };

/**
 * Start a single-ticket timer for a user.
 * Defensive: aborts if the user already has a running timer — never overwrites
 * existing active_timers/active_timer_tickets rows so logs cannot be lost.
 */
export async function startTicketTimer({
  userId,
  ticketId,
  discipline,
}: StartTicketTimerArgs): Promise<StartTicketTimerResult> {
  // Guard: ensure no active timer exists for this user.
  const { data: existing, error: checkErr } = await supabase
    .from("active_timers")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();
  if (checkErr) return { ok: false, reason: "error", message: checkErr.message };
  if (existing) return { ok: false, reason: "active" };

  const { error: tErr } = await supabase.from("active_timers").insert({
    user_id: userId,
    ticket_id: ticketId,
    discipline,
    started_at: new Date().toISOString(),
  });
  if (tErr) return { ok: false, reason: "error", message: tErr.message };

  const { error: gErr } = await supabase.from("active_timer_tickets").insert({
    user_id: userId,
    ticket_id: ticketId,
    position: 0,
  });
  if (gErr) return { ok: false, reason: "error", message: gErr.message };

  return { ok: true };
}
