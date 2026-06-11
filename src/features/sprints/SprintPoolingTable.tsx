import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCurrentUser } from "@/store/currentUser";
import { useProjectRole } from "@/features/team/useProjectRole";
import { useProjectTickets, type TicketRow } from "@/features/tickets/useProjectTickets";
import { useProjectTicketsView } from "@/features/tickets/project-tickets/useProjectTicketsView";
import { ProjectTicketsToolbar } from "@/features/tickets/project-tickets/ProjectTicketsToolbar";
import { BulkActionsBar } from "@/features/tickets/BulkActionsBar";
import { TicketsList } from "@/features/tickets/TicketsList";
import { TicketDetailSheet } from "@/features/tickets/TicketDetailSheet";
import type { Sprint } from "./types";
import { usePoolData } from "./usePoolData";

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

  // Exclude Proj-type tickets — they don't go in sprints.
  const projectTickets = useMemo(
    () => tickets.filter((t) => t.ticket_type !== "Proj"),
    [tickets],
  );

  const v = useProjectTicketsView({ tickets: projectTickets, user, role, projectId: `${projectId}:pool` });

  const [openTicket, setOpenTicket] = useState<TicketRow | null>(null);
  const [fePoolFilter, setFePoolFilter] = useState<string>("__any__");
  const [bePoolFilter, setBePoolFilter] = useState<string>("__any__");

  const visibleTickets = useMemo(() => {
    let rows = v.visibleTickets;
    const matchPool = (val: string, sid: string | null | undefined) => {
      if (val === "__any__") return true;
      if (val === "__none__") return !sid;
      return sid === val;
    };
    if (fePoolFilter !== "__any__") {
      rows = rows.filter((t) => matchPool(fePoolFilter, poolData.byTicket.get(t.id)?.fe));
    }
    if (bePoolFilter !== "__any__") {
      rows = rows.filter((t) => matchPool(bePoolFilter, poolData.byTicket.get(t.id)?.be));
    }
    return rows;
  }, [v.visibleTickets, poolData, fePoolFilter, bePoolFilter]);

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
        filterMine={v.filterMine}
        setFilterMine={v.setFilterMine}
        setTouched={v.setTouched}
        groupBy={v.groupBy}
        setGroupBy={v.setGroupBy}
        search={v.search}
        setSearch={v.setSearch}
        role={role}
        user={user}
        showViewToggle={false}
        showAddButtons={false}
        showGroupTimer={false}
        extras={
          <>
            <PoolFilterSelect
              label="FE Pool"
              value={fePoolFilter}
              onChange={setFePoolFilter}
              sprints={sprints}
            />
            <PoolFilterSelect
              label="BE Pool"
              value={bePoolFilter}
              onChange={setBePoolFilter}
              sprints={sprints}
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
        />
      )}

      <BulkActionsBar
        projectId={projectId}
        selectedIds={selectedArr}
        onClear={v.clearSelection}
        canEdit={isPMBA}
      />

      {isPMBA && selectedArr.length > 0 && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 glass-strong hairline rounded-2xl shadow-2xl px-2 py-1.5 flex items-center gap-1 animate-in fade-in slide-in-from-bottom-2 duration-200">
          <span className="text-[10px] uppercase tracking-wider text-dim px-2">
            Pool
          </span>
          <PoolBulkMenu
            label="FE Sprint"
            sprints={sprints}
            onPick={(sid) => updatePool(selectedArr, "FE", sid)}
          />
          <PoolBulkMenu
            label="BE Sprint"
            sprints={sprints}
            onPick={(sid) => updatePool(selectedArr, "BE", sid)}
          />
        </div>
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

function PoolBulkMenu({
  label,
  sprints,
  onPick,
}: {
  label: string;
  sprints: Sprint[];
  onPick: (sprintId: string | null) => void;
}) {
  return (
    <Select onValueChange={(v) => onPick(v === "__none__" ? null : v)}>
      <SelectTrigger className="h-8 w-32 text-xs">
        <SelectValue placeholder={label} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="__none__">Clear pool</SelectItem>
        {sprints.map((s) => (
          <SelectItem key={s.id} value={s.id}>
            Sprint {s.sprint_number}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function PoolFilterSelect({
  label,
  value,
  onChange,
  sprints,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  sprints: Sprint[];
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="h-8 w-32 text-xs">
        <SelectValue placeholder={label} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="__any__">{label}: Any</SelectItem>
        <SelectItem value="__none__">{label}: Unpooled</SelectItem>
        {sprints.map((s) => (
          <SelectItem key={s.id} value={s.id}>
            {label}: Sprint {s.sprint_number}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
