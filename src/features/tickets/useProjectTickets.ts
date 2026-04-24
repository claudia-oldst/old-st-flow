import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { TeamMember, TicketAssignee } from "@/lib/types";

export interface TicketRow {
  id: string;
  project_id: string;
  ticket_number: number;
  formatted_id: string;
  title: string;
  ticket_type: "Standard" | "Bug" | "CR";
  status_id: string | null;
  epic_id: number | null;
  epic_name: string | null;
  est_frontend_hours: number;
  est_backend_hours: number;
  actual_frontend_hours: number;
  actual_backend_hours: number;
  actual_overhead_hours: number;
  position: number;
  created_at: string;
  assignees: Array<{ user_id: string; slot: "FE" | "BE"; member: TeamMember }>;
}

export function useProjectTickets(projectId: string | undefined) {
  const [tickets, setTickets] = useState<TicketRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    const { data: tix } = await supabase
      .from("tickets")
      .select("*")
      .eq("project_id", projectId)
      .order("position", { ascending: true })
      .order("ticket_number", { ascending: true });

    const ids = (tix ?? []).map((t) => t.id);
    let assignees: Array<TicketAssignee & { member: TeamMember }> = [];
    if (ids.length) {
      const { data } = await supabase
        .from("ticket_assignees")
        .select("*, member:team_members(*)")
        .in("ticket_id", ids);
      assignees = (data as any) ?? [];
    }

    const grouped: Record<string, TicketRow["assignees"]> = {};
    assignees.forEach((a) => {
      grouped[a.ticket_id] ??= [];
      grouped[a.ticket_id].push({ user_id: a.user_id, slot: a.slot, member: a.member });
    });

    setTickets(
      (tix ?? []).map((t) => ({
        ...t,
        est_frontend_hours: Number(t.est_frontend_hours),
        est_backend_hours: Number(t.est_backend_hours),
        actual_frontend_hours: Number(t.actual_frontend_hours),
        actual_backend_hours: Number(t.actual_backend_hours),
        actual_overhead_hours: Number(t.actual_overhead_hours),
        assignees: grouped[t.id] ?? [],
      }))
    );
    setLoading(false);
  }, [projectId]);

  useEffect(() => {
    load();
  }, [load]);

  // realtime: any change on tickets in this project triggers reload
  useEffect(() => {
    if (!projectId) return;
    const ch = supabase
      .channel(`tickets-${projectId}-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "tickets", filter: `project_id=eq.${projectId}` }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "ticket_assignees" }, () => load())
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [projectId, load]);

  return { tickets, loading, reload: load };
}
