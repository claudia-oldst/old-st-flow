import { supabase } from "@/integrations/supabase/client";
import type { ExportLog } from "./teamTimeExport";

const PAGE = 1000;

/** Logs for the users, widened ±14h so every local day in range is covered. */
export async function loadTeamLogs(userIds: string[], from: string, to: string): Promise<ExportLog[]> {
  const start = new Date(new Date(`${from}T00:00:00Z`).getTime() - 14 * 3600000).toISOString();
  const end = new Date(new Date(`${to}T23:59:59.999Z`).getTime() + 14 * 3600000).toISOString();
  const out: ExportLog[] = [];
  for (let page = 0; ; page++) {
    const { data, error } = await supabase
      .from("time_logs")
      .select("id,hours,logged_at,logged_tz_offset,user:team_members(name,email),ticket:tickets(formatted_id,title,ticket_type,project:projects(name))")
      .in("user_id", userIds)
      .gte("logged_at", start)
      .lte("logged_at", end)
      .order("id")
      .range(page * PAGE, page * PAGE + PAGE - 1);
    if (error) throw error;
    out.push(...((data ?? []) as unknown as ExportLog[]));
    if (!data || data.length < PAGE) return out;
  }
}
