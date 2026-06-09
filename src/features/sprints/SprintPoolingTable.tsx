import { useMemo, useState } from "react";
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
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useProjectTickets, type TicketRow } from "@/features/tickets/useProjectTickets";
import {
  EMPTY_FILTERS,
  applyFilters,
  type TicketFilters,
} from "@/features/tickets/TicketsFilter";
import { BulkActionsBar } from "@/features/tickets/BulkActionsBar";
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
 * Tab 1 — Ticket Pooling Table.
 * Reuses TicketsFilter + BulkActionsBar so look/behavior matches the Tickets tab.
 * Each row exposes FE/BE planned-sprint dropdowns; bulk bar gains FE/BE pool actions.
 */
export function SprintPoolingTable({ projectId, sprints, isPMBA }: Props) {
  const qc = useQueryClient();
  const { tickets } = useProjectTickets(projectId);
  const { data: assignments = [] } = usePlannedSprintAssignments(projectId);

  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<TicketFilters>(EMPTY_FILTERS);
  const [unpooledOnly, setUnpooledOnly] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

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

  const filtered = useMemo(() => {
    let rows = applyFilters(projectTickets, filters);
    rows = searchTickets(rows, search);
    if (unpooledOnly) {
      rows = rows.filter((t) => {
        const a = assignmentByTicket.get(t.id);
        const hasFE = (t.current_fe_estimate || 0) > 0;
        const hasBE = (t.current_be_estimate || 0) > 0;
        const fePooled = hasFE && !!a?.fe;
        const bePooled = hasBE && !!a?.be;
        return !(fePooled && (!hasBE || bePooled)) || !(bePooled && (!hasFE || fePooled));
      });
    }
    return rows;
  }, [projectTickets, filters, search, unpooledOnly, assignmentByTicket]);

  const visibleIds = useMemo(() => new Set(filtered.map((t) => t.id)), [filtered]);
  const allVisibleSelected =
    filtered.length > 0 && filtered.every((t) => selected.has(t.id));

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAllVisible = () => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allVisibleSelected) {
        filtered.forEach((t) => next.delete(t.id));
      } else {
        filtered.forEach((t) => next.add(t.id));
      }
      return next;
    });
  };

  const clearSelection = () => setSelected(new Set());

  const updatePool = async (
    ticketIds: string[],
    discipline: Discipline,
    sprintId: string | null,
  ) => {
    if (!isPMBA) return;
    const col = discipline === "FE" ? "planned_sprint_fe_id" : "planned_sprint_be_id";
    const { error } = await supabase
      .from("tickets")
      .update({ [col]: sprintId } as Record<string, string | null>)
      .in("id", ticketIds);
    if (error) {
      toast.error(error.message);
      return;
    }
    qc.invalidateQueries({ queryKey: ["planned_sprint_assignments", projectId] });
    if (ticketIds.length > 1) {
      toast.success(`Updated ${discipline} pool for ${ticketIds.length} tickets`);
    }
  };

  const selectedIds = useMemo(
    () => Array.from(selected).filter((id) => visibleIds.has(id) || true),
    [selected, visibleIds],
  );

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

      <div className="hairline rounded-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-surface-1/60 text-[10px] uppercase tracking-wide text-dim">
              <tr>
                <th className="px-2 py-2 w-8 text-left">
                  <Checkbox
                    checked={allVisibleSelected}
                    onCheckedChange={toggleAllVisible}
                    aria-label="Select all visible"
                  />
                </th>
                <th className="px-2 py-2 text-left w-20">ID</th>
                <th className="px-2 py-2 text-left">Title</th>
                <th className="px-2 py-2 text-left w-40">Epic</th>
                <th className="px-2 py-2 text-right w-16">FE h</th>
                <th className="px-2 py-2 text-right w-16">BE h</th>
                <th className="px-2 py-2 text-left w-40">FE Sprint</th>
                <th className="px-2 py-2 text-left w-40">BE Sprint</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="text-center text-dim py-8">
                    No tickets match
                  </td>
                </tr>
              )}
              {filtered.map((t) => (
                <PoolingRow
                  key={t.id}
                  t={t}
                  assignment={assignmentByTicket.get(t.id) ?? { fe: null, be: null }}
                  sprints={sprints}
                  selected={selected.has(t.id)}
                  onToggleSelect={() => toggle(t.id)}
                  onChange={(disc, sprintId) => updatePool([t.id], disc, sprintId)}
                  isPMBA={isPMBA}
                />
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {selected.size > 0 && (
        <>
          <BulkActionsBar
            projectId={projectId}
            selectedIds={selectedIds}
            onClear={clearSelection}
            canEdit={isPMBA}
          />
          {isPMBA && (
            <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 glass-strong hairline rounded-2xl shadow-2xl px-2 py-1.5 flex items-center gap-1 animate-in fade-in slide-in-from-bottom-2 duration-200">
              <span className="text-[10px] uppercase tracking-wider text-dim px-2">
                Pool
              </span>
              <PoolBulkMenu
                label="FE Sprint"
                sprints={sprints}
                onPick={(sid) => updatePool(selectedIds, "FE", sid)}
              />
              <PoolBulkMenu
                label="BE Sprint"
                sprints={sprints}
                onPick={(sid) => updatePool(selectedIds, "BE", sid)}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}

function PoolingRow({
  t,
  assignment,
  sprints,
  selected,
  onToggleSelect,
  onChange,
  isPMBA,
}: {
  t: TicketRow;
  assignment: { fe: string | null; be: string | null };
  sprints: Sprint[];
  selected: boolean;
  onToggleSelect: () => void;
  onChange: (d: Discipline, sprintId: string | null) => void;
  isPMBA: boolean;
}) {
  const hasFE = (t.current_fe_estimate || 0) > 0;
  const hasBE = (t.current_be_estimate || 0) > 0;
  return (
    <tr className={cn("hairline-t", selected && "bg-primary/5")}>
      <td className="px-2 py-1.5">
        <Checkbox checked={selected} onCheckedChange={onToggleSelect} />
      </td>
      <td className="px-2 py-1.5 font-mono text-[11px] text-dim">{t.formatted_id}</td>
      <td className="px-2 py-1.5 truncate max-w-[280px]">{t.title}</td>
      <td className="px-2 py-1.5 text-dim truncate">{t.epic_name ?? "—"}</td>
      <td className="px-2 py-1.5 text-right font-mono">{t.current_fe_estimate || 0}</td>
      <td className="px-2 py-1.5 text-right font-mono">{t.current_be_estimate || 0}</td>
      <td className="px-2 py-1.5">
        <PoolSelect
          value={assignment.fe}
          sprints={sprints}
          disabled={!isPMBA || !hasFE}
          onChange={(v) => onChange("FE", v)}
        />
      </td>
      <td className="px-2 py-1.5">
        <PoolSelect
          value={assignment.be}
          sprints={sprints}
          disabled={!isPMBA || !hasBE}
          onChange={(v) => onChange("BE", v)}
        />
      </td>
    </tr>
  );
}

function PoolSelect({
  value,
  sprints,
  disabled,
  onChange,
}: {
  value: string | null;
  sprints: Sprint[];
  disabled: boolean;
  onChange: (v: string | null) => void;
}) {
  return (
    <Select
      value={value ?? "__none__"}
      onValueChange={(v) => onChange(v === "__none__" ? null : v)}
      disabled={disabled}
    >
      <SelectTrigger className="h-7 text-xs">
        <SelectValue placeholder="Unpooled" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="__none__">Unpooled</SelectItem>
        {sprints.map((s) => (
          <SelectItem key={s.id} value={s.id}>
            Sprint {s.sprint_number}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
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
