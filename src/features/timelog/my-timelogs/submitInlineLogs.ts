import { supabase } from "@/integrations/supabase/client";
import type { LogDiscipline } from "@/lib/types";
import { combineDateAndTime, maybePromoteToActive, type AllocationRow } from "./inlineLogHelpers";

export interface InlineLogInput {
  rows: AllocationRow[];
  userId: string;
  discipline: LogDiscipline;
  note: string;
  date: Date;
  startTime: string;
}

export type InlineLogResult =
  | { ok: true; totalHours: number; count: number }
  | { ok: false; message: string };

/** Insert one manual time log per allocated ticket and promote backlog tickets. */
export async function submitInlineLogs({
  rows,
  userId,
  discipline,
  note,
  date,
  startTime,
}: InlineLogInput): Promise<InlineLogResult> {
  const logs = rows
    .filter((r) => r.minutes > 0)
    .map((r) => ({
      ticket_id: r.ticket.id,
      user_id: userId,
      discipline,
      hours: Math.round((r.minutes / 60) * 10000) / 10000,
      note: note.trim() || null,
      source: "manual" as const,
      logged_at: combineDateAndTime(date, startTime).toISOString(),
    }));

  if (logs.length === 0) {
    return { ok: false, message: "Nothing to log — every ticket was set to 0" };
  }

  const { error } = await supabase.from("time_logs").insert(logs);
  if (error) return { ok: false, message: error.message };

  for (const r of rows) {
    if (r.minutes > 0) await maybePromoteToActive(r.ticket);
  }

  return {
    ok: true,
    totalHours: logs.reduce((s, l) => s + l.hours, 0),
    count: logs.length,
  };
}
