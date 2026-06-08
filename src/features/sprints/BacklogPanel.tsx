import { useMemo, useState } from "react";
import { useDroppable } from "@dnd-kit/core";
import type { Sprint, SprintTicket } from "./types";
import type { TicketRow } from "@/features/tickets/useProjectTickets";
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
import { format, parseISO } from "date-fns";

interface Props {
  projectId: string;
  targetSprintId: string;
  sprints: Sprint[];
  tickets: TicketRow[];
  allSprintTickets: SprintTicket[];
  disabled: boolean;
}

export function BacklogPanel({
  projectId,
  targetSprintId,
  sprints,
  tickets,
  allSprintTickets,
  disabled,
}: Props) {
  const [source, setSource] = useState<string>("unscheduled");
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<TicketFilters>(EMPTY_FILTERS);
  const [groupBy, setGroupBy] = useState<GroupBy>("none");
  const [hideCompleted, setHideCompleted] = useState(false);

  const { statuses } = useStatuses();
  const { setNodeRef, isOver } = useDroppable({ id: dndId.backlogZone });

  const scheduledIds = useMemo(
    () => new Set(allSprintTickets.map((st) => st.ticket_id)),
    [allSprintTickets],
  );

  const ticketsBySource = useMemo(() => {
    if (source === "unscheduled") {
      return tickets.filter((t) => !scheduledIds.has(t.id));
    }
    const ids = new Set(
      allSprintTickets.filter((st) => st.sprint_id === source).map((st) => st.ticket_id),
    );
    const targetIds = new Set(
      allSprintTickets.filter((st) => st.sprint_id === targetSprintId).map((st) => st.ticket_id),
    );
    return tickets.filter((t) => ids.has(t.id) && !targetIds.has(t.id));
  }, [source, tickets, scheduledIds, allSprintTickets, targetSprintId]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let base = applyFilters(ticketsBySource, filters);
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
  }, [ticketsBySource, filters, search, hideCompleted]);

  const groups = useTicketsGrouping({ tickets: filtered, statuses, groupBy });

  const otherSprints = sprints.filter((s) => s.id !== targetSprintId);

  return (
    <div className="flex flex-col gap-3 h-full min-h-0">
      <div className="space-y-2">
        <h3 className="font-display text-sm font-semibold tracking-tight">Backlog</h3>

        <div className="space-y-1.5">
          <label className="text-[10px] uppercase tracking-wide text-dim">Source pool</label>
          <Select value={source} onValueChange={setSource}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="unscheduled">Unscheduled Backlog</SelectItem>
              {otherSprints.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  Sprint {s.sprint_number}
                  {s.name ? ` — ${s.name}` : ""} · {format(parseISO(s.start_date), "MMM d")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
            tickets={ticketsBySource}
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
          <div className="text-[11px] text-dim text-center py-6">No tickets match</div>
        )}
        {groupBy === "none"
          ? filtered.map((t) => (
              <DraggableTicketCard
                key={t.id}
                ticket={t}
                dndId={dndId.backlogCard(t.id)}
                disabled={disabled}
              />
            ))
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
                <div className="space-y-1.5">
                  {g.tickets.map((t) => (
                    <DraggableTicketCard
                      key={t.id}
                      ticket={t}
                      dndId={dndId.backlogCard(t.id)}
                      disabled={disabled}
                    />
                  ))}
                </div>
              </div>
            ))}
      </div>
    </div>
  );
}
