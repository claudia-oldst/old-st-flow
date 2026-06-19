import { supabase } from "@/integrations/supabase/client";
import type { ChangeLite, LogLite, TicketLite } from "./types";

export interface TrendDataset {
  tickets: TicketLite[];
  changes: ChangeLite[];
  logs: LogLite[];
  /** ISO date string, or null if the project has no start_date set. */
  projectStart: string | null;
  /** Map of ticket id → epic id for convenient in-memory filtering. */
  ticketEpic: Map<string, number | null>;
}

/**
 * Fetch every input needed to render an estimate-trend chart for one project.
 *
 * The ticket-id-keyed sub-queries (`ticket_estimate_changes`, `time_logs`) are
 * chunked into batches of 100 so PostgREST's URL length cap can't silently
 * truncate the result. Single-shot `.in(ids)` queries failed on large projects
 * (≈650 tickets) and was the root cause of the Health-page "Actuals stuck at
 * zero" bug.
 */
export async function fetchTrendData(projectId: string): Promise<TrendDataset> {
  const [{ data: proj }, { data: rawTickets }] = await Promise.all([
    supabase.from("projects").select("start_date").eq("id", projectId).maybeSingle(),
    supabase
      .from("tickets")
      .select(
        "id, created_at, epic_id, ticket_type, original_fe_estimate, original_be_estimate, cr_approval, cr_decided_at",
      )
      .eq("project_id", projectId),
  ]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const projectStart = ((proj as any)?.start_date as string | null | undefined) ?? null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tkRows = (rawTickets ?? []) as any[];
  const tickets: TicketLite[] = tkRows
    // Drop non-approved CRs — they don't belong on the trend.
    .filter((t) => t.ticket_type !== "CR" || t.cr_approval === "approved")
    .map((t) => {
      const isCR = t.ticket_type === "CR";
      return {
        id: t.id,
        created_at: t.created_at,
        epic_id: t.epic_id ?? null,
        ticket_type: t.ticket_type,
        original_fe_estimate: Number(t.original_fe_estimate) || 0,
        original_be_estimate: Number(t.original_be_estimate) || 0,
        is_cr: isCR,
        cr_effective_at: isCR ? (t.cr_decided_at ?? t.created_at) : null,
      };
    });

  const ticketEpic = new Map<string, number | null>();
  tickets.forEach((t) => ticketEpic.set(t.id, t.epic_id));

  const ids = tickets.map((t) => t.id);
  if (ids.length === 0) {
    return { tickets, changes: [], logs: [], projectStart, ticketEpic };
  }

  const CHUNK = 100;
  const chunks: string[][] = [];
  for (let i = 0; i < ids.length; i += CHUNK) chunks.push(ids.slice(i, i + CHUNK));

  const [chResults, lgResults] = await Promise.all([
    Promise.all(
      chunks.map((c) =>
        supabase
          .from("ticket_estimate_changes")
          .select("ticket_id, delta, created_at, status")
          .in("ticket_id", c)
          .eq("status", "approved"),
      ),
    ),
    Promise.all(
      chunks.map((c) =>
        supabase
          .from("time_logs")
          .select("ticket_id, hours, logged_at, discipline")
          .in("ticket_id", c)
          .in("discipline", ["FE", "BE"]),
      ),
    ),
  ]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const chRows = chResults.flatMap((r) => (r.data ?? []) as any[]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const lgRows = lgResults.flatMap((r) => (r.data ?? []) as any[]);

  const changes: ChangeLite[] = chRows.map((c) => ({
    ticket_id: c.ticket_id,
    delta: Number(c.delta) || 0,
    created_at: c.created_at,
  }));
  const logs: LogLite[] = lgRows.map((l) => ({
    ticket_id: l.ticket_id,
    hours: Number(l.hours) || 0,
    logged_at: l.logged_at,
  }));

  return { tickets, changes, logs, projectStart, ticketEpic };
}
