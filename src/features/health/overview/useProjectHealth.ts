import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { TicketRow } from "@/features/tickets/useProjectTickets";
import type { DateRange } from "@/features/health/DateRangeControl";
import { useRealtimeReload } from "@/hooks/useRealtimeReload";

interface ProjectMemberLite {
  user_id: string;
  role: string;
  member: { id: string; name: string; avatar_color: string };
}

export function useProjectHealth({
  projectId,
  tickets,
  range,
}: {
  projectId: string;
  tickets: TicketRow[];
  range: DateRange;
}) {
  const [members, setMembers] = useState<ProjectMemberLite[]>([]);
  const [weekHours, setWeekHours] = useState<Record<string, number>>({});
  const [logsTick, setLogsTick] = useState(0);

  const loadMembers = useCallback(() => {
    supabase
      .from("project_members")
      .select("user_id,role,member:team_members(id,name,avatar_color)")
      .eq("project_id", projectId)
      .then(({ data }) => setMembers((data ?? []) as ProjectMemberLite[]));
  }, [projectId]);

  useEffect(() => {
    loadMembers();
  }, [loadMembers]);

  useRealtimeReload(
    [
      { table: "project_members", filter: `project_id=eq.${projectId}` },
      { table: "team_members" },
    ],
    loadMembers,
  );

  useEffect(() => {
    const ticketIds = tickets.map((t) => t.id);
    if (ticketIds.length === 0) {
      setWeekHours({});
      return;
    }
    let cancelled = false;
    (async () => {
      const ticketIdSet = new Set(ticketIds);
      const map: Record<string, number> = {};
      const PAGE = 1000;
      let offset = 0;
      while (true) {
        const { data, error } = await supabase
          .from("time_logs")
          .select("user_id,hours,ticket_id")
          .gte("logged_at", range.from.toISOString())
          .lte("logged_at", range.to.toISOString())
          .order("logged_at", { ascending: false })
          .range(offset, offset + PAGE - 1);
        if (error || !data) break;
        for (const l of data) {
          if (!ticketIdSet.has(l.ticket_id)) continue;
          map[l.user_id] = (map[l.user_id] ?? 0) + Number(l.hours);
        }
        if (data.length < PAGE) break;
        offset += PAGE;
      }
      if (!cancelled) setWeekHours(map);
    })();
    return () => {
      cancelled = true;
    };
  }, [projectId, tickets, range.from, range.to, logsTick]);

  useRealtimeReload(
    [{ table: "time_logs" }],
    useCallback(() => setLogsTick((t) => t + 1), []),
  );

  const ticketsByMember = useMemo(() => {
    const map: Record<string, number> = {};
    members.forEach((m) => (map[m.user_id] = 0));
    tickets.forEach((t) => {
      t.assignees.forEach((a) => {
        const slotStatus =
          a.slot === "FE" ? t.fe_status :
          a.slot === "BE" ? t.be_status :
          (t.fe_status === "done" && t.be_status === "done") ? "done" : "in_progress";
        if (slotStatus !== "done") {
          map[a.user_id] = (map[a.user_id] ?? 0) + 1;
        }
      });
    });
    return map;
  }, [tickets, members]);

  const remainingByMember = useMemo(() => {
    const map: Record<string, number> = {};
    members.forEach((m) => (map[m.user_id] = 0));
    const fromMs = range.from.getTime();
    const toMs = range.to.getTime();
    tickets.forEach((t) => {
      t.assignees.forEach((a) => {
        const created = a.created_at ? new Date(a.created_at).getTime() : 0;
        if (created < fromMs || created > toMs) return;
        if (a.slot === "FE" && t.fe_status !== "done") {
          const remaining = Math.max(0, t.current_fe_estimate - t.actual_frontend_hours);
          map[a.user_id] = (map[a.user_id] ?? 0) + remaining;
        } else if (a.slot === "BE" && t.be_status !== "done") {
          const remaining = Math.max(0, t.current_be_estimate - t.actual_backend_hours);
          map[a.user_id] = (map[a.user_id] ?? 0) + remaining;
        }
      });
    });
    return map;
  }, [tickets, members, range.from, range.to]);

  return { members, weekHours, ticketsByMember, remainingByMember };
}
