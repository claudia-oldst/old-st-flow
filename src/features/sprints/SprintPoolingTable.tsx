import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useProjectTickets, type TicketRow } from "@/features/tickets/useProjectTickets";
import {
  EMPTY_FILTERS,
  applyFilters,
  type TicketFilters,
} from "@/features/tickets/TicketsFilter";
import { BulkActionsBar } from "@/features/tickets/BulkActionsBar";
import { TicketsList } from "@/features/tickets/TicketsList";
import { TicketDetailSheet } from "@/features/tickets/TicketDetailSheet";
import type { Sprint } from "./types";
import { usePlannedSprintAssignments } from "./useSprintBoard";
import { SprintColumnToolbar, searchTickets } from "./SprintColumnToolbar";

type Discipline = "FE" | "BE";

interface Props {
  projectId: string;
  sprints: Sprint[];
  isPMBA: boolean;
}

/**
 * Tab 1 — Ticket Pooling list.
 * Reuses the same TicketsList + TicketsFilter + BulkActionsBar used on the
 * Tickets tab so the look/behavior matches exactly. FE/BE pool assignment is
 * exposed via a thin extension to the bulk actions bar.
 */
export function SprintPoolingTable({ projectId, sprints, isPMBA }: Props) {
  const qc = useQueryClient();
  const { tickets } = useProjectTickets(projectId);
  const { data: assignments = [] } = usePlannedSprintAssignments(projectId);

  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<TicketFilters>(EMPTY_FILTERS);
  const [unpooledOnly, setUnpooledOnly] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [lastSelectedId, setLastSelectedId] = useState<string | null>(null);
  const [openTicket, setOpenTicket] = useState<TicketRow | null>(null);

  // Exclude Proj-type tickets — they don't go in sprints.
  const projectTickets = useMemo(
    () => tickets.filter((t) => t.ticket_type !== "Proj"),
    [tickets],
  );

  const assignmentByTicket = useMemo(() => {
    const m = new Map<string, { fe: string | null; be: string | null }>();
    assignments.forEach((a) =>
      m.set(a.ticket_id, {
        fe: a.planned_sprint_fe_id,
        be: a.planned_sprint_be_id,
      }),
    );
    return m;
  }, [assignments]);

  const sprintsById = useMemo(() => {
    const m = new Map<string, { sprint_number: number }>();
    sprints.forEach((s) => m.set(s.id, { sprint_number: s.sprint_number }));
    return m;
  }, [sprints]);

  const poolData = useMemo(
    () => ({ byTicket: assignmentByTicket, sprintsById }),
    [assignmentByTicket, sprintsById],
  );

  const [fePoolFilter, setFePoolFilter] = useState<string>("__any__");
  const [bePoolFilter, setBePoolFilter] = useState<string>("__any__");

  const visibleTickets = useMemo(() => {
    let rows = applyFilters(projectTickets, filters);
    rows = searchTickets(rows, search);
    if (unpooledOnly) {
      rows = rows.filter((t) => {
        const a = assignmentByTicket.get(t.id);
        const hasFE = (t.current_fe_estimate || 0) > 0;
        const hasBE = (t.current_be_estimate || 0) > 0;
        const fePooled = hasFE && !!a?.fe;
        const bePooled = hasBE && !!a?.be;
        const fullyPooled =
          (!hasFE || fePooled) && (!hasBE || bePooled) && (hasFE || hasBE);
        return !fullyPooled;
      });
    }
    const matchPool = (val: string, sid: string | null | undefined) => {
      if (val === "__any__") return true;
      if (val === "__none__") return !sid;
      return sid === val;
    };
    if (fePoolFilter !== "__any__") {
      rows = rows.filter((t) => matchPool(fePoolFilter, assignmentByTicket.get(t.id)?.fe));
    }
    if (bePoolFilter !== "__any__") {
      rows = rows.filter((t) => matchPool(bePoolFilter, assignmentByTicket.get(t.id)?.be));
    }
    return rows;
  }, [projectTickets, filters, search, unpooledOnly, assignmentByTicket, fePoolFilter, bePoolFilter]);


  // Prune selection to currently visible rows.
  useEffect(() => {
    setSelectedIds((prev) => {
      if (prev.size === 0) return prev;
      const visible = new Set(visibleTickets.map((t) => t.id));
      const next = new Set<string>();
      prev.forEach((id) => visible.has(id) && next.add(id));
      return next.size === prev.size ? prev : next;
    });
  }, [visibleTickets]);

  const toggleSelect = (id: string, shiftKey: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (shiftKey && lastSelectedId && lastSelectedId !== id) {
        const ids = visibleTickets.map((t) => t.id);
        const a = ids.indexOf(lastSelectedId);
        const b = ids.indexOf(id);
        if (a !== -1 && b !== -1) {
          const [from, to] = a < b ? [a, b] : [b, a];
          const shouldSelect = !prev.has(id);
          for (let i = from; i <= to; i++) {
            if (shouldSelect) next.add(ids[i]);
            else next.delete(ids[i]);
          }
          return next;
        }
      }
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    setLastSelectedId(id);
  };

  const toggleSelectAll = (ids: string[], select: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      ids.forEach((id) => (select ? next.add(id) : next.delete(id)));
      return next;
    });
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
    setLastSelectedId(null);
  };

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

  const selectedArr = useMemo(() => Array.from(selectedIds), [selectedIds]);

  return (
    <div className="space-y-3">
      <SprintColumnToolbar
        projectId={projectId}
        tickets={projectTickets}
        filters={filters}
        onChange={setFilters}
        search={search}
        onSearch={setSearch}
        extras={
          <label className="flex items-center gap-1.5 text-[11px] text-dim">
            <Checkbox
              checked={unpooledOnly}
              onCheckedChange={(c) => setUnpooledOnly(c === true)}
            />
            Unpooled only
          </label>
        }
      />

      {visibleTickets.length === 0 ? (
        <div className="glass rounded-2xl p-10 text-center text-sm text-dim">
          No tickets match
        </div>
      ) : (
        <TicketsList
          tickets={visibleTickets}
          groupBy="none"
          onOpen={setOpenTicket}
          selectedIds={selectedIds}
          onToggleSelect={toggleSelect}
          onToggleSelectAll={toggleSelectAll}
        />
      )}

      <BulkActionsBar
        projectId={projectId}
        selectedIds={selectedArr}
        onClear={clearSelection}
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
