import { useMemo, useState } from "react";
import { useDroppable } from "@dnd-kit/core";
import type { TicketRow } from "@/features/tickets/useProjectTickets";
import type { SprintTicket } from "./types";
import { remainingHours, dndId } from "./types";
import { DraggableTicketCard } from "./DraggableTicketCard";
import {
  TicketsFilter,
  EMPTY_FILTERS,
  applyFilters,
  type TicketFilters,
} from "@/features/tickets/TicketsFilter";
import { useTicketsGrouping } from "@/features/tickets/list/useTicketsGrouping";
import type { GroupBy } from "@/features/tickets/list/columns";
import { useStatuses } from "@/features/statuses/useStatuses";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  projectId: string;
  items: Array<{ link: SprintTicket; ticket: TicketRow }>;
  disabled: boolean;
}

export function SprintPoolPanel({ projectId, items, disabled }: Props) {
  const { setNodeRef, isOver } = useDroppable({ id: dndId.poolZone });
  const { statuses } = useStatuses();

  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<TicketFilters>(EMPTY_FILTERS);
  const [groupBy, setGroupBy] = useState<GroupBy>("none");
  const [hideCompleted, setHideCompleted] = useState(false);

  const totals = items.reduce(
    (acc, it) => {
      const r = remainingHours(it.ticket);
      acc.FE += r.FE;
      acc.BE += r.BE;
      return acc;
    },
    { FE: 0, BE: 0 },
  );

  const poolTickets = useMemo(() => items.map((i) => i.ticket), [items]);
  const linkByTicketId = useMemo(() => {
    const m = new Map<string, SprintTicket>();
    items.forEach((i) => m.set(i.ticket.id, i.link));
    return m;
  }, [items]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let base = applyFilters(poolTickets, filters);
    if (q) {
      base = base.filter((t) =>
        `${t.formatted_id} ${t.title}`.toLowerCase().includes(q),
      );
    }
    if (hideCompleted) {
      base = base.filter((t) => {
        const r = remainingHours(t);
        return !(r.FE === 0 && r.BE === 0);
      });
    }
    return base;
  }, [poolTickets, filters, search, hideCompleted]);

  const groups = useTicketsGrouping({ tickets: filtered, statuses, groupBy });

  const renderCard = (t: TicketRow) => {
    const link = linkByTicketId.get(t.id);
    if (!link) return null;
    return (
      <DraggableTicketCard
        key={link.id}
        ticket={t}
        dndId={dndId.poolCard(link.id)}
        disabled={disabled}
      />
    );
  };

  return (
    <div className="flex flex-col gap-3 h-full min-h-0">
      <div className="space-y-2">
        <h3 className="font-display text-sm font-semibold tracking-tight">Sprint Pool</h3>
        <div className="text-[10px] text-dim mt-0.5">Unassigned in this sprint</div>
        <div className="flex items-center gap-3 font-mono text-[11px]">
          <span className="text-blue-300">
            FE Rem: <span className="text-foreground">{totals.FE}h</span>
          </span>
          <span className="text-emerald-300">
            BE Rem: <span className="text-foreground">{totals.BE}h</span>
          </span>
        </div>

        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-dimmer pointer-events-none" />
          <Input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search ID or title…"
            className="h-8 pl-8 pr-7 text-xs"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              aria-label="Clear search"
              className="absolute right-2 top-1/2 -translate-y-1/2 text-dimmer hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] uppercase tracking-wide text-dim">Group</span>
            <Select value={groupBy} onValueChange={(v) => setGroupBy(v as GroupBy)}>
              <SelectTrigger className="h-8 w-[120px] text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                <SelectItem value="status">Status</SelectItem>
                <SelectItem value="assignee">Assignee</SelectItem>
                <SelectItem value="type">Type</SelectItem>
                <SelectItem value="epic">Epic</SelectItem>
                <SelectItem value="version">Version</SelectItem>
                <SelectItem value="fe_status">FE status</SelectItem>
                <SelectItem value="be_status">BE status</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <TicketsFilter
            projectId={projectId}
            tickets={poolTickets}
            filters={filters}
            onChange={setFilters}
          />
        </div>

        <label className="flex items-center gap-2 text-[11px] text-dim">
          <Checkbox
            checked={hideCompleted}
            onCheckedChange={(c) => setHideCompleted(c === true)}
          />
          Hide completed disciplines
        </label>
      </div>

      <div
        ref={setNodeRef}
        className={cn(
          "flex-1 min-h-0 overflow-y-auto rounded-md hairline p-2 space-y-2 transition",
          isOver ? "bg-primary/10 ring-1 ring-primary/40" : "bg-surface-1/40",
        )}
      >
        {filtered.length === 0 && (
          <div className="text-[11px] text-dim text-center py-6">
            {items.length === 0 ? "Drop tickets here" : "No tickets match"}
          </div>
        )}
        {groupBy === "none"
          ? filtered.map(renderCard)
          : groups.map((g) => (
              <div key={g.key} className="space-y-1.5">
                <div className="flex items-center gap-2 px-1 pt-1">
                  {g.color && (
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: g.color }}
                    />
                  )}
                  <span className="text-[10px] uppercase tracking-wider text-dim font-medium">
                    {g.label}
                  </span>
                  <span className="text-[10px] text-dimmer">{g.tickets.length}</span>
                </div>
                <div className="space-y-1.5">{g.tickets.map(renderCard)}</div>
              </div>
            ))}
      </div>
    </div>
  );
}
