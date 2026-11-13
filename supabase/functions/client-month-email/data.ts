// deno-lint-ignore-file no-explicit-any
import type { EmailDiscount, EmailLog } from "../_shared/clientEmail.ts";

/** Month window = first of the snapshot month (UTC) up to the snapshot. */
export function monthWindow(asOf: string) {
  const end = new Date(asOf);
  const start = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), 1));
  return { start: start.toISOString(), end: end.toISOString() };
}

export async function loadMonth(admin: any, projectId: string, start: string, end: string) {
  const logs: (EmailLog & { ticket_label: string })[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await admin
      .from("time_logs")
      .select("hours, note, tickets!inner(title, formatted_id, ticket_type, epic_id, project_id)")
      .eq("tickets.project_id", projectId)
      .neq("tickets.ticket_type", "Feedback")
      .gte("logged_at", start)
      .lte("logged_at", end)
      .range(from, from + 999);
    if (error) throw error;
    for (const r of data ?? []) {
      logs.push({
        hours: Number(r.hours) || 0,
        note: r.note,
        ticket_title: r.tickets.title,
        ticket_label: r.tickets.formatted_id,
        ticket_type: r.tickets.ticket_type,
        epic_id: r.tickets.epic_id,
      });
    }
    if (!data || data.length < 1000) break;
  }
  const { data: disc, error: dErr } = await admin
    .from("epic_discounts")
    .select("epic_id, hours, reason")
    .eq("project_id", projectId)
    .gte("created_at", start)
    .lte("created_at", end);
  if (dErr) throw dErr;
  const { data: epics } = await admin.from("project_epics").select("id, epic_name").eq("project_id", projectId);
  const { data: proj } = await admin.from("projects").select("name, rate_per_hour").eq("id", projectId).single();
  return {
    logs,
    discounts: (disc ?? []) as EmailDiscount[],
    epicNames: new Map<number, string>((epics ?? []).map((e: any) => [e.id, e.epic_name ?? "Untitled epic"])),
    projectName: proj?.name ?? "",
    rate: Number(proj?.rate_per_hour) || 0,
  };
}
