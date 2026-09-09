import { useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format, startOfWeek } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/store/currentUser";
import { useRealtimeInvalidate } from "@/hooks/useRealtimeInvalidate";
import type { DateRange } from "@/features/_shared/DateRangeControl";

export type LogGroupBy = "month" | "week" | "day";

export interface MyLogRow {
  id: string;
  hours: number;
  discipline: "FE" | "BE" | "Project";
  note: string | null;
  logged_at: string;
  logged_tz_offset: number | null;
  source: "timer" | "manual";
  user_id: string;
  ticket_id: string;
  ticket: {
    id: string;
    formatted_id: string;
    title: string;
    ticket_type: string;
    project_id: string;
  } | null;
  project: { id: string; name: string; acronym: string } | null;
}

export interface LogGroup {
  key: string;
  label: string;
  hours: number;
  rows: MyLogRow[];
}

/** Every time log the signed-in user has made inside the given date range. */
export function useMyTimeLogs(range: DateRange) {
  const user = useCurrentUser((s) => s.user);
  const qc = useQueryClient();
  const from = range.from.toISOString();
  const to = range.to.toISOString();
  const queryKey = ["myTimeLogs", user?.id, from, to] as const;

  const query = useQuery({
    queryKey,
    enabled: !!user,
    queryFn: async (): Promise<MyLogRow[]> => {
      const { data } = await supabase
        .from("time_logs")
        .select(
          "id,hours,discipline,note,logged_at,logged_tz_offset,source,user_id,ticket_id,ticket:tickets(id,formatted_id,title,ticket_type,project_id,project:projects(id,name,acronym))",
        )
        .eq("user_id", user!.id)
        .gte("logged_at", from)
        .lte("logged_at", to)
        .order("logged_at", { ascending: false })
        .limit(1000);
      return ((data as any[]) ?? []).map((r) => ({
        ...r,
        hours: Number(r.hours),
        ticket: r.ticket ?? null,
        project: r.ticket?.project ?? null,
      })) as MyLogRow[];
    },
  });

  useRealtimeInvalidate(
    user ? [{ table: "time_logs", filter: `user_id=eq.${user.id}` }] : null,
    queryKey,
    !!user,
  );

  return {
    logs: query.data ?? [],
    loading: query.isLoading,
    reload: () => qc.invalidateQueries({ queryKey: ["myTimeLogs"] }),
  };
}

function bucket(date: Date, by: LogGroupBy, offset: number | null) {
  const zoned = offset == null || Number.isNaN(offset) ? date : offsetZoned(date, offset);
  if (by === "day") return { key: format(zoned, "yyyy-MM-dd"), label: format(zoned, "EEEE d MMMM yyyy") };
  if (by === "week") {
    const start = startOfWeek(zoned, { weekStartsOn: 1 });
    return { key: format(start, "yyyy-'W'II"), label: `Week of ${format(start, "d MMMM yyyy")}` };
  }
  return { key: format(zoned, "yyyy-MM"), label: format(zoned, "MMMM yyyy") };
}

/** Wall-clock Date for an absolute instant viewed in a fixed UTC offset. */
function offsetZoned(date: Date, offsetMin: number): Date {
  return toZonedTime(new Date(date.getTime() + offsetMin * 60000), "UTC");
}

/** Buckets rows into month / week / day groups, newest first. */
export function useGroupedLogs(rows: MyLogRow[], by: LogGroupBy): LogGroup[] {
  return useMemo(() => {
    const map = new Map<string, LogGroup>();
    rows.forEach((r) => {
      const { key, label } = bucket(new Date(r.logged_at), by, r.logged_tz_offset);
      const g = map.get(key) ?? { key, label, hours: 0, rows: [] };
      g.hours += r.hours;
      g.rows.push(r);
      map.set(key, g);
    });
    return Array.from(map.values()).sort((a, b) => (a.key < b.key ? 1 : -1));
  }, [rows, by]);
}

/** Projects the signed-in user belongs to, for the filter + new-log picker. */
export function useMyProjects() {
  const user = useCurrentUser((s) => s.user);
  return useQuery({
    queryKey: ["myProjectsForLogs", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("project_members")
        .select("project:projects(id,name,acronym,is_archived)")
        .eq("user_id", user!.id);
      return ((data as any[]) ?? [])
        .map((r) => r.project)
        .filter((p) => p && !p.is_archived)
        .sort((a, b) => a.name.localeCompare(b.name)) as Array<{
        id: string;
        name: string;
        acronym: string;
      }>;
    },
  });
}

/** Tickets in a project the signed-in user is assigned to (any slot). */
export function useMyProjectTickets(projectId: string | null) {
  const user = useCurrentUser((s) => s.user);
  return useQuery({
    queryKey: ["myTicketsForLogs", user?.id, projectId],
    enabled: !!user && !!projectId,
    queryFn: async () => {
      const { data } = await supabase
        .from("ticket_assignees")
        .select("ticket:tickets(id,formatted_id,title,ticket_type,project_id)")
        .eq("user_id", user!.id);
      const seen = new Set<string>();
      return ((data as any[]) ?? [])
        .map((r) => r.ticket)
        .filter((t) => {
          if (!t || t.project_id !== projectId || seen.has(t.id)) return false;
          seen.add(t.id);
          return true;
        })
        .sort((a, b) => a.formatted_id.localeCompare(b.formatted_id)) as Array<{
        id: string;
        formatted_id: string;
        title: string;
        ticket_type: string;
        project_id: string;
      }>;
    },
  });
}
