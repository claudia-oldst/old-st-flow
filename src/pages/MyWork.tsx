import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useRealtimeReload } from "@/hooks/useRealtimeReload";
import { useCurrentUser } from "@/store/currentUser";
import { cn, displayTitle, formatHours, PAGE_SHELL } from "@/lib/utils";
import { ListChecks, ArrowRight } from "lucide-react";
import { DisciplineStatusChip } from "@/features/tickets/DisciplineStatusChip";
import type { DisciplineStatus, TeamMember, TicketAssignee } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";
import { TicketDetailSheet } from "@/features/tickets/TicketDetailSheet";
import type { TicketRow } from "@/features/tickets/useProjectTickets";
import { toast } from "sonner";

interface Row {
  id: string;
  formatted_id: string;
  title: string;
  ticket_type: "Standard" | "Bug" | "CR";
  status_id: string | null;
  fe_status: DisciplineStatus;
  be_status: DisciplineStatus;
  current_fe_estimate: number;
  current_be_estimate: number;
  actual_frontend_hours: number;
  actual_backend_hours: number;
  project: { id: string; name: string; acronym: string };
  status: { name: string; color: string; category: string } | null;
  slot: "FE" | "BE" | "Project";
  current_project_estimate?: number;
  actual_project_hours?: number;
}

async function fetchTicketDetail(ticketId: string): Promise<TicketRow | null> {
  const { data: t } = await supabase
    .from("tickets")
    .select("*, epic:project_epics(epic_name)")
    .eq("id", ticketId)
    .maybeSingle();
  if (!t) return null;
  const { data: assignees } = await supabase
    .from("ticket_assignees")
    .select("*, member:team_members(*)")
    .eq("ticket_id", ticketId);
  const list = (assignees as Array<TicketAssignee & { member: TeamMember; created_at: string }> | null) ?? [];
  const tt: any = t;
  return {
    id: tt.id,
    project_id: tt.project_id,
    ticket_number: tt.ticket_number,
    formatted_id: tt.formatted_id,
    title: tt.title,
    ticket_type: tt.ticket_type,
    status_id: tt.status_id,
    fe_status: (tt.fe_status ?? "todo") as DisciplineStatus,
    be_status: (tt.be_status ?? "todo") as DisciplineStatus,
    project_status_override: !!tt.project_status_override,
    epic_id: tt.epic_id ?? null,
    epic_name: tt.epic?.epic_name ?? null,
    version: tt.version ?? null,
    original_fe_estimate: Number(tt.original_fe_estimate),
    original_be_estimate: Number(tt.original_be_estimate),
    current_fe_estimate: Number(tt.current_fe_estimate),
    current_be_estimate: Number(tt.current_be_estimate),
    original_project_estimate: Number(tt.original_project_estimate ?? 0),
    current_project_estimate: Number(tt.current_project_estimate ?? 0),
    actual_frontend_hours: Number(tt.actual_frontend_hours),
    actual_backend_hours: Number(tt.actual_backend_hours),
    actual_project_hours: Number(tt.actual_project_hours ?? 0),
    acceptance_criteria: tt.acceptance_criteria ?? null,
    position: tt.position,
    created_at: tt.created_at,
    cr_approval: (tt.ticket_type === "CR" ? (tt.cr_approval ?? "pending") : null) as TicketRow["cr_approval"],
    cr_decided_by: tt.cr_decided_by ?? null,
    cr_decided_at: tt.cr_decided_at ?? null,
    parent_ticket_id: tt.parent_ticket_id ?? null,
    bug_sub_number: tt.bug_sub_number ?? null,
    github_issue_number: tt.github_issue_number ?? null,
    parent: null,
    assignees: list.map((a) => ({
      user_id: a.user_id,
      slot: a.slot,
      member: a.member,
      created_at: (a as any).created_at,
    })),
  };
}

export default function MyWork() {
  const user = useCurrentUser((s) => s.user);
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<TicketRow | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const load = useCallback(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    supabase
      .from("ticket_assignees")
      .select(
        "slot,ticket:tickets(id,formatted_id,title,ticket_type,status_id,fe_status,be_status,current_fe_estimate,current_be_estimate,actual_frontend_hours,actual_backend_hours,project:projects(id,name,acronym),status:statuses(name,color,category))"
      )
      .eq("user_id", user.id)
      .then(({ data }) => {
        const flat: Row[] =
          (data as any)?.map((d: any) => ({
            ...d.ticket,
            project: d.ticket.project,
            status: d.ticket.status,
            slot: d.slot,
            current_fe_estimate: Number(d.ticket.current_fe_estimate),
            current_be_estimate: Number(d.ticket.current_be_estimate),
            actual_frontend_hours: Number(d.ticket.actual_frontend_hours),
            actual_backend_hours: Number(d.ticket.actual_backend_hours),
          })) ?? [];
        setRows(flat.filter((r) => r.status?.category !== "done"));
        setLoading(false);
      });
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  useRealtimeReload(
    user
      ? [
          { table: "ticket_assignees", filter: `user_id=eq.${user.id}` },
          { table: "tickets" },
          { table: "time_logs" },
        ]
      : null,
    load,
    !!user,
  );

  const openTicket = useCallback(async (ticketId: string) => {
    const detail = await fetchTicketDetail(ticketId);
    if (!detail) {
      toast.error("Ticket not found");
      return;
    }
    setSelected(detail);
    setSheetOpen(true);
  }, []);

  const refreshSelected = useCallback(async () => {
    load();
    if (selected) {
      const detail = await fetchTicketDetail(selected.id);
      if (detail) setSelected(detail);
    }
  }, [load, selected]);

  return (
    <div className={cn(PAGE_SHELL, "py-10")}>
      <div className="mb-8">
        <div className="text-xs uppercase tracking-[0.18em] text-dimmer mb-2">{user?.name ?? "—"}</div>
        <h1 className="font-display text-3xl font-semibold tracking-tight flex items-center gap-2">
          <ListChecks className="h-7 w-7" /> My Work
        </h1>
        <p className="text-dim mt-1">Open tickets assigned to you across all projects.</p>
      </div>

      {loading ? (
        <div className="glass rounded-2xl overflow-hidden divide-y divide-white/5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-14 rounded-none bg-white/[0.03]" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <div className="glass rounded-2xl p-16 text-center">
          <ListChecks className="h-10 w-10 mx-auto text-dimmer mb-4" />
          <div className="text-lg font-medium">Nothing on your plate</div>
          <div className="text-dim text-sm mt-1">No tickets currently assigned to you.</div>
        </div>
      ) : (
        <div className="glass rounded-2xl overflow-hidden">
          <div className="divide-y divide-white/5">
            {rows.map((r) => {
              const isFE = r.slot === "FE";
              const isBE = r.slot === "BE";
              const actual = isFE ? r.actual_frontend_hours : isBE ? r.actual_backend_hours : 0;
              const estimate = isFE ? r.current_fe_estimate : isBE ? r.current_be_estimate : 0;
              return (
                <button
                  key={`${r.id}-${r.slot}`}
                  type="button"
                  onClick={() => openTicket(r.id)}
                  className="group w-full text-left flex items-center gap-4 px-4 py-3 hover:bg-white/[0.02] transition"
                >
                  <div className="font-mono text-xs text-dimmer w-20">{r.formatted_id}</div>
                  <div className="flex-1 min-w-0">
                    <div className="truncate">{displayTitle(r.title, r.ticket_type)}</div>
                    <div className="text-xs text-dim flex items-center gap-2 mt-0.5">
                      <span>{r.project.name}</span>
                      <span>·</span>
                      <span className="inline-flex items-center gap-1">
                        {r.status && <span className="h-1.5 w-1.5 rounded-full" style={{ background: r.status.color }} />}
                        {r.status?.name}
                      </span>
                    </div>
                  </div>
                  {r.slot === "Project" ? (
                    <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-fuchsia-500/15 text-fuchsia-300 ring-1 ring-fuchsia-400/20">
                      Project
                    </span>
                  ) : (
                    <DisciplineStatusChip slot={r.slot} status={isFE ? r.fe_status : r.be_status} />
                  )}
                  <div className="text-xs font-mono text-dim w-24 text-right">
                    {r.slot === "Project" ? "—" : `${formatHours(actual)} / ${formatHours(estimate)}`}
                  </div>
                  <ArrowRight className="h-4 w-4 text-dimmer group-hover:text-foreground transition" />
                </button>
              );
            })}
          </div>
        </div>
      )}

      <TicketDetailSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        ticket={selected}
        projectId={selected?.project_id ?? ""}
        onChange={refreshSelected}
      />
    </div>
  );
}
