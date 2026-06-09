import { useMemo, useState } from "react";
import { useDroppable, useDraggable } from "@dnd-kit/core";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import { TicketCard } from "@/features/tickets/TicketCard";
import type { TicketRow } from "@/features/tickets/useProjectTickets";
import {
  EMPTY_FILTERS,
  applyFilters,
  type TicketFilters,
} from "@/features/tickets/TicketsFilter";
import { useCardDisplayPrefs } from "@/features/tickets/useCardDisplayPrefs";
import { SprintColumnToolbar, searchTickets } from "./SprintColumnToolbar";
import { useSprintSelection } from "./SprintSelectionContext";

interface Props {
  projectId: string;
  title: string;
  subtitle?: React.ReactNode;
  /** Source tickets after any column-specific source filtering. */
  tickets: TicketRow[];
  /** dnd droppable id; pass null to disable drop. */
  dropZoneId?: string | null;
  /** dnd draggable: prefix used for each card. Pass null to disable drag. */
  dragKey: string | null;
  /** Header element (capacity bar etc) to render above toolbar. */
  header?: React.ReactNode;
  /** Extra toolbar controls (e.g. pool source select). */
  toolbarExtras?: React.ReactNode;
  /** Read-only mode disables drag/select. */
  disabled?: boolean;
  /** Optional empty hint */
  emptyHint?: string;
}

/**
 * Shared sprint board column. Reuses TicketsFilter + TicketCard + sprint selection
 * so search/filter/sort/multi-select are identical across columns and tab 1.
 */
export function SprintBoardColumn({
  projectId,
  title,
  subtitle,
  tickets,
  dropZoneId,
  dragKey,
  header,
  toolbarExtras,
  disabled,
  emptyHint = "No tickets",
}: Props) {
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<TicketFilters>(EMPTY_FILTERS);

  const filtered = useMemo(() => {
    return searchTickets(applyFilters(tickets, filters), search);
  }, [tickets, filters, search]);

  const { setNodeRef, isOver } = useDroppable({
    id: dropZoneId ?? `__noop:${title}`,
    disabled: !dropZoneId,
  });

  return (
    <div className="flex flex-col gap-2 h-full min-h-0 rounded-md hairline bg-surface-1/40 overflow-hidden">
      <div className="p-2.5 hairline-b bg-surface-1/60 space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-sm font-semibold tracking-tight">{title}</h3>
          <span className="text-[10px] font-mono text-dim">{filtered.length}</span>
        </div>
        {subtitle && <div className="text-[11px] text-dim">{subtitle}</div>}
        {header}
        <SprintColumnToolbar
          projectId={projectId}
          tickets={tickets}
          filters={filters}
          onChange={setFilters}
          search={search}
          onSearch={setSearch}
          extras={toolbarExtras}
        />
      </div>
      <div
        ref={setNodeRef}
        className={cn(
          "flex-1 min-h-0 overflow-y-auto p-2 space-y-1.5 transition",
          isOver && "bg-primary/10 ring-1 ring-primary/40 ring-inset",
        )}
      >
        {filtered.length === 0 && (
          <div className="text-[11px] text-dim text-center py-6">{emptyHint}</div>
        )}
        {filtered.map((t) => (
          <ColumnCard
            key={t.id}
            ticket={t}
            dndId={dragKey ? `${dragKey}:${t.id}` : null}
            disabled={disabled || !dragKey}
          />
        ))}
      </div>
    </div>
  );
}

function ColumnCard({
  ticket,
  dndId,
  disabled,
}: {
  ticket: TicketRow;
  dndId: string | null;
  disabled?: boolean;
}) {
  const { isSelected, toggle, selected } = useSprintSelection();
  const selectedHere = isSelected(ticket.id);
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: dndId ?? `__noop:${ticket.id}`,
    disabled: disabled || !dndId,
    data: { ticketId: ticket.id, selected: selectedHere, selectionSize: selected.size },
  });
  const { prefs } = useCardDisplayPrefs();

  const onClick = (e: React.MouseEvent) => {
    if (disabled) return;
    e.stopPropagation();
    toggle(ticket.id);
  };

  return (
    <div className="flex items-start gap-1.5">
      <Checkbox
        checked={selectedHere}
        onCheckedChange={() => !disabled && toggle(ticket.id)}
        disabled={disabled}
        className="mt-1.5"
        aria-label="Select ticket"
      />
      <div
        ref={setNodeRef}
        {...attributes}
        {...listeners}
        onClick={onClick}
        className={cn(
          "relative rounded-md transition flex-1 min-w-0",
          selectedHere && "ring-2 ring-primary ring-offset-1 ring-offset-background",
        )}
      >
        {selectedHere && isDragging && selected.size > 1 && (
          <div className="absolute -top-2 -right-2 z-10 rounded-full bg-primary text-primary-foreground text-[10px] font-mono px-1.5 py-0.5 shadow">
            {selected.size}
          </div>
        )}
        <TicketCard ticket={ticket} prefs={prefs} isDragging={isDragging} forceBars />
      </div>
    </div>
  );
}
