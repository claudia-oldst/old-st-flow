import { useEffect, useState, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useRealtimeReload } from "@/hooks/useRealtimeReload";
import type { DisciplineStatus, TeamMember, TicketAssignee } from "@/lib/types";

export interface TicketRow {
  id: string;
  project_id: string;
  ticket_number: number;
  formatted_id: string;
  title: string;
  ticket_type: "Standard" | "Bug" | "CR" | "Proj";
  status_id: string | null;
  fe_status: DisciplineStatus;
  be_status: DisciplineStatus;
  project_status_override: boolean;
  epic_id: number | null;
  epic_name: string | null;
  version: string | null;
  original_fe_estimate: number;
  original_be_estimate: number;
  current_fe_estimate: number;
  current_be_estimate: number;
  original_project_estimate: number;
  current_project_estimate: number;
  actual_frontend_hours: number;
  actual_backend_hours: number;
  actual_project_hours: number;
  acceptance_criteria: string | null;
  position: number;
  created_at: string;
  cr_approval: "pending" | "approved" | "rejected";
  cr_decided_by: string | null;
  cr_decided_at: string | null;
  assignees: Array<{ user_id: string; slot: "FE" | "BE" | "Project"; member: TeamMember; created_at: string }>;
}

export function useProjectTickets(projectId: string | undefined) {
  const [tickets, setTickets] = useState<TicketRow[]>([]);
  const [loading, setLoading] = useState(!!projectId);

  const load = useCallback(async () => {
    if (!projectId) {
      setTickets([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data: tix } = await supabase
      .from("tickets")
      .select("*, epic:project_epics(epic_name)")
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
      grouped[a.ticket_id].push({ user_id: a.user_id, slot: a.slot, member: a.member, created_at: (a as any).created_at });
    });

    setTickets(
      (tix ?? []).map((t: any) => ({
        id: t.id,
        project_id: t.project_id,
        ticket_number: t.ticket_number,
        formatted_id: t.formatted_id,
        title: t.title,
        ticket_type: t.ticket_type,
        status_id: t.status_id,
        fe_status: (t.fe_status ?? "todo") as DisciplineStatus,
        be_status: (t.be_status ?? "todo") as DisciplineStatus,
        project_status_override: !!t.project_status_override,
        epic_id: t.epic_id ?? null,
        epic_name: t.epic?.epic_name ?? null,
        version: t.version ?? null,
        original_fe_estimate: Number(t.original_fe_estimate),
        original_be_estimate: Number(t.original_be_estimate),
        current_fe_estimate: Number(t.current_fe_estimate),
        current_be_estimate: Number(t.current_be_estimate),
        original_project_estimate: Number(t.original_project_estimate ?? 0),
        current_project_estimate: Number(t.current_project_estimate ?? 0),
        actual_frontend_hours: Number(t.actual_frontend_hours),
        actual_backend_hours: Number(t.actual_backend_hours),
        
        actual_project_hours: Number(t.actual_project_hours ?? 0),
        acceptance_criteria: t.acceptance_criteria ?? null,
        position: t.position,
        created_at: t.created_at,
        cr_approval: (t.cr_approval ?? "pending") as TicketRow["cr_approval"],
        cr_decided_by: t.cr_decided_by ?? null,
        cr_decided_at: t.cr_decided_at ?? null,
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
      .on("postgres_changes", { event: "*", schema: "public", table: "project_epics", filter: `project_id=eq.${projectId}` }, () => load())
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [projectId, load]);

  return { tickets, loading, reload: load };
}
