import { useDroppable } from "@dnd-kit/core";
import type { TicketRow } from "@/features/tickets/useProjectTickets";
import type { SprintTicket } from "./types";
import { remainingHours, dndId } from "./types";
import { DraggableTicketCard } from "./DraggableTicketCard";
import { cn } from "@/lib/utils";

interface Props {
  items: Array<{ link: SprintTicket; ticket: TicketRow }>;
  disabled: boolean;
}

export function SprintPoolPanel({ items, disabled }: Props) {
  const { setNodeRef, isOver } = useDroppable({ id: dndId.poolZone });

  const totals = items.reduce(
    (acc, it) => {
      const r = remainingHours(it.ticket);
      acc.FE += r.FE;
      acc.BE += r.BE;
      return acc;
    },
    { FE: 0, BE: 0 },
  );

  return (
    <div className="flex flex-col gap-3 h-full min-h-0">
      <div>
        <h3 className="font-display text-sm font-semibold tracking-tight">Sprint Pool</h3>
        <div className="text-[10px] text-dim mt-0.5">Unassigned in this sprint</div>
        <div className="flex items-center gap-3 mt-2 font-mono text-[11px]">
          <span className="text-blue-300">
            FE Rem: <span className="text-foreground">{totals.FE}h</span>
          </span>
          <span className="text-emerald-300">
            BE Rem: <span className="text-foreground">{totals.BE}h</span>
          </span>
        </div>
      </div>
      <div
        ref={setNodeRef}
        className={cn(
          "flex-1 min-h-0 overflow-y-auto rounded-md hairline p-2 space-y-1.5 transition",
          isOver ? "bg-primary/10 ring-1 ring-primary/40" : "bg-surface-1/40",
        )}
      >
        {items.length === 0 && (
          <div className="text-[11px] text-dim text-center py-6">Drop tickets here</div>
        )}
        {items.map((it) => (
          <DraggableTicketCard
            key={it.link.id}
            ticket={it.ticket}
            dndId={dndId.poolCard(it.link.id)}
            disabled={disabled}
          />
        ))}
      </div>
    </div>
  );
}
