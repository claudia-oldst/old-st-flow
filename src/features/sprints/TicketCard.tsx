import { useDraggable } from "@dnd-kit/core";
import { cn } from "@/lib/utils";
import type { Ticket } from "@/lib/types";
import { remainingHours, type SprintDiscipline } from "./types";

interface Props {
  ticket: Ticket;
  dndId: string;
  /** When set, only show this discipline's hours (used in dev lanes). */
  isolate?: SprintDiscipline;
  disabled?: boolean;
}

export function TicketCard({ ticket, dndId, isolate, disabled }: Props) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: dndId,
    disabled,
    data: { ticketId: ticket.id },
  });

  const rem = remainingHours(ticket);
  const showFE = !isolate || isolate === "FE";
  const showBE = !isolate || isolate === "BE";

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={cn(
        "rounded-md hairline bg-surface-2 px-2.5 py-2 text-xs select-none",
        !disabled && "cursor-grab active:cursor-grabbing hover:bg-white/5 transition",
        isDragging && "opacity-50",
      )}
    >
      <div className="flex items-center gap-2 mb-1">
        <span className="font-mono text-[10px] text-dim">{ticket.formatted_id}</span>
        <span className="text-[10px] px-1.5 py-px rounded bg-white/5 text-dim uppercase tracking-wide">
          {ticket.ticket_type}
        </span>
      </div>
      <div className="text-foreground line-clamp-2 mb-1.5 leading-snug">{ticket.title}</div>
      <div className="flex items-center gap-2 font-mono text-[10px]">
        {showFE && (
          <span className="text-blue-300">
            FE <span className="text-foreground">{rem.FE}h</span>
          </span>
        )}
        {showBE && (
          <span className="text-emerald-300">
            BE <span className="text-foreground">{rem.BE}h</span>
          </span>
        )}
      </div>
    </div>
  );
}
