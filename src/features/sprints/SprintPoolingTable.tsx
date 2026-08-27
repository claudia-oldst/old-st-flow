import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

import { PoolBulkBar } from "./pooling/PoolBulkBar";
import { useCurrentUser } from "@/store/currentUser";
import { useProjectRole } from "@/features/team/useProjectRole";
import { useProjectTickets, type TicketRow } from "@/features/tickets/useProjectTickets";
import { useProjectTicketsView } from "@/features/tickets/project-tickets/useProjectTicketsView";
import { ProjectTicketsToolbar } from "@/features/tickets/project-tickets/ProjectTicketsToolbar";
import type { FilterSection } from "@/features/tickets/TicketsFilter";
import { BulkActionsBar } from "@/features/tickets/BulkActionsBar";
import { TicketsList } from "@/features/tickets/TicketsList";
import { TicketDetailSheet } from "@/features/tickets/TicketDetailSheet";
import type { Sprint } from "./types";
import { usePoolData } from "./usePoolData";
import { SprintPoolFilter } from "./SprintPoolFilter";
import { useColumnDisplayPrefs } from "@/features/tickets/useColumnDisplayPrefs";

type Discipline = "FE" | "BE";

interface Props {
  projectId: string;
  sprints: Sprint[];
  isPMBA: boolean;
}

/**
 * Tab 1 — Ticket Pooling list.
 * Reuses ProjectTicketsToolbar + TicketsList so the look and behavior match the
 * Tickets tab exactly. Adds FE Pool / BE Pool columns and filters, plus a bulk
 * pool action bar that lets PMBAs assign tickets to a planned sprint pool.
 * Pool assignment can only be changed here (Sprint tab) — the Tickets tab shows
 * the same columns read-only.
 */
export function SprintPoolingTable({ projectId, sprints, isPMBA }: Props) {
  const qc = useQueryClient();
  const user = useCurrentUser((s) => s.user);
  const role = useProjectRole(projectId);
  const { tickets } = useProjectTickets(projectId);
  const poolData = usePoolData(projectId, sprints);
  const { prefs: columnPrefs, setPrefs: setColumnPrefs, reset: resetColumnPrefs } = useColumnDisplayPrefs();

  // Exclude Proj-type tickets — they don't go in sprints.
  const projectTickets = useMemo(
    () => tickets.filter((t) => t.ticket_type !== "Proj"),
    [tickets],
  );

  const v = useProjectTicketsView({ tickets: projectTickets, user, role, projectId: `${projectId}:pool` });

  // Default this view's groupBy to "epic" on first open (no persisted value yet).
  // User can still change it via the GroupBy selector.
  useEffect(() => {
    const key = `pt:${projectId}:pool:groupBy`;
    if (typeof window === "undefined") return;
    if (window.sessionStorage.getItem(key) === null) {
      v.setGroupBy("epic");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  const [openTicket, setOpenTicket] = useState<TicketRow | null>(null);
  const [fePlannedFilter, setFePlannedFilter] = useState<string[]>([]);
  const [feCommittedFilter, setFeCommittedFilter] = useState<number[]>([]);
  const [bePlannedFilter, setBePlannedFilter] = useState<string[]>([]);
  const [beCommittedFilter, setBeCommittedFilter] = useState<number[]>([]);

  const visibleTickets = useMemo(() => {
    let rows = v.visibleTickets;
    if (fePlannedFilter.length > 0) {
      rows = rows.filter((t) => {
        const fe = poolData.byTicket.get(t.id)?.fe ?? null;
        return fe ? fePlannedFilter.includes(fe) : false;
      });
    }
    if (feCommittedFilter.length > 0) {
      rows = rows.filter((t) => {
        const active = poolData.activeByTicket.get(t.id)?.fe ?? [];
        return active.some((n) => feCommittedFilter.includes(n));
      });
    }
    if (bePlannedFilter.length > 0) {
      rows = rows.filter((t) => {
        const be = poolData.byTicket.get(t.id)?.be ?? null;
        return be ? bePlannedFilter.includes(be) : false;
      });
    }
    if (beCommittedFilter.length > 0) {
      rows = rows.filter((t) => {
        const active = poolData.activeByTicket.get(t.id)?.be ?? [];
        return active.some((n) => beCommittedFilter.includes(n));
      });
    }
    return rows;
  }, [v.visibleTickets, poolData, fePlannedFilter, feCommittedFilter, bePlannedFilter, beCommittedFilter]);

  // Prune selection to currently visible rows.
  useEffect(() => {
    const visible = new Set(visibleTickets.map((t) => t.id));
    const current = v.selectedIds;
    let needsPrune = false;
    current.forEach((id) => { if (!visible.has(id)) needsPrune = true; });
    if (needsPrune) v.clearSelection();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibleTickets]);

  const updatePool = async (
    ticketIds: string[],
    discipline: Discipline,
    sprintId: string | null,
  ) => {
    if (!isPMBA || ticketIds.length === 0) return;
    const patch =
      discipline === "FE"
        ? { planned_sprint_fe_id: sprintId }
        : { planned_sprint_be_id: sprintId };
    const { error } = await supabase
      .from("tickets")
      .update(patch)
      .in("id", ticketIds);
    if (error) {
      toast.error(error.message);
      return;
    }
    qc.invalidateQueries({ queryKey: ["planned_sprint_assignments", projectId] });
    toast.success(
      `Updated ${discipline} pool for ${ticketIds.length} ticket${ticketIds.length > 1 ? "s" : ""}`,
    );
  };

  const selectedArr = useMemo(() => Array.from(v.selectedIds), [v.selectedIds]);

  return (
    <div>
      <ProjectTicketsToolbar
        projectId={projectId}
        tickets={projectTickets}
        filters={v.filters}
        setFilters={v.setFilters}
        view="list"
        filterMine={false}
        setTouched={v.setTouched}
        groupBy={v.groupBy}
        setGroupBy={v.setGroupBy}
        search={v.search}
        setSearch={v.setSearch}
        role={role}
        user={user}
        showViewToggle={false}
        showMineToggle={false}
        showGroupBy={true}
        showAddButtons={false}
        showGroupTimer={false}
        filterSections={["epic", "assignee", "type"]}
        columnPrefs={columnPrefs}
        setColumnPrefs={setColumnPrefs}
        resetColumnPrefs={resetColumnPrefs}
        extras={
          <>
            <SprintPoolFilter
              label="FE Sprint"
              sprints={sprints}
              plannedSelected={fePlannedFilter}
              committedSelected={feCommittedFilter}
              onPlannedChange={setFePlannedFilter}
              onCommittedChange={setFeCommittedFilter}
            />
            <SprintPoolFilter
              label="BE Sprint"
              sprints={sprints}
              plannedSelected={bePlannedFilter}
              committedSelected={beCommittedFilter}
              onPlannedChange={setBePlannedFilter}
              onCommittedChange={setBeCommittedFilter}
            />
          </>
        }
      />

      {visibleTickets.length === 0 ? (
        <div className="glass rounded-2xl p-10 text-center text-sm text-dim">
          No tickets match
        </div>
      ) : (
        <TicketsList
          tickets={visibleTickets}
          groupBy={v.groupBy}
          onOpen={setOpenTicket}
          selectedIds={v.selectedIds}
          onToggleSelect={v.toggleSelect}
          onToggleSelectAll={v.toggleSelectAll}
          extraCols={["fe_pool", "be_pool"]}
          poolData={poolData}
          columnPrefs={columnPrefs}
        />
      )}

      <BulkActionsBar
        projectId={projectId}
        selectedIds={selectedArr}
        onClear={v.clearSelection}
        canEdit={isPMBA}
      />

      {isPMBA && selectedArr.length > 0 && (
        <PoolBulkBar
          sprints={sprints}
          onUpdate={(d, sid) => updatePool(selectedArr, d, sid)}
        />
      )}

      <TicketDetailSheet
        open={!!openTicket}
        onOpenChange={(o) => !o && setOpenTicket(null)}
        ticket={openTicket}
        projectId={projectId}
        onChange={() => {
          qc.invalidateQueries({ queryKey: ["planned_sprint_assignments", projectId] });
        }}
      />
    </div>
  );
}
