import { useMemo, useState } from "react";
import { useDroppable } from "@dnd-kit/core";
import type { TicketType } from "@/lib/types";
import type { Sprint, SprintTicket } from "./types";
import type { TicketRow } from "@/features/tickets/useProjectTickets";
import { remainingHours, dndId } from "./types";
import { EpicSelect } from "@/features/epics/EpicSelect";
import { DraggableTicketCard } from "./DraggableTicketCard";
import { FilterSection, FilterRow } from "@/features/tickets/filters/FilterPrimitives";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
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

const TYPE_OPTIONS: TicketType[] = ["Standard", "Bug", "CR"];

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
  const [epicId, setEpicId] = useState<number | null>(null);
  const [types, setTypes] = useState<TicketType[]>([...TYPE_OPTIONS]);
  const [hideCompleted, setHideCompleted] = useState(false);

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
    return ticketsBySource.filter((t) => {
      if (q && !`${t.formatted_id} ${t.title}`.toLowerCase().includes(q)) return false;
      if (epicId !== null && t.epic_id !== epicId) return false;
      if (!types.includes(t.ticket_type as TicketType)) return false;
      if (hideCompleted) {
        const r = remainingHours(t);
        if (r.FE === 0 && r.BE === 0) return false;
      }
      return true;
    });
  }, [ticketsBySource, search, epicId, types, hideCompleted]);

  const otherSprints = sprints.filter((s) => s.id !== targetSprintId);

  const toggleType = (tt: TicketType) =>
    setTypes((prev) => (prev.includes(tt) ? prev.filter((x) => x !== tt) : [...prev, tt]));

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
        <Input
          placeholder="Search…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-8 text-xs"
        />
        <EpicSelect projectId={projectId} value={epicId} onChange={setEpicId} size="sm" />
        <div className="hairline rounded-md">
          <FilterSection title="Type">
            {TYPE_OPTIONS.map((tt) => (
              <FilterRow
                key={tt}
                label={tt}
                selected={types.includes(tt)}
                onClick={() => toggleType(tt)}
              />
            ))}
          </FilterSection>
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
          "flex-1 min-h-0 overflow-y-auto rounded-md hairline p-2 space-y-1.5 transition",
          isOver ? "bg-primary/10 ring-1 ring-primary/40" : "bg-surface-1/40",
        )}
      >
        {filtered.length === 0 && (
          <div className="text-[11px] text-dim text-center py-6">No tickets match</div>
        )}
        {filtered.map((t) => (
          <DraggableTicketCard
            key={t.id}
            ticket={t}
            dndId={dndId.backlogCard(t.id)}
            disabled={disabled}
          />
        ))}
      </div>
    </div>
  );
}
