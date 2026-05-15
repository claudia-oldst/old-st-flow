import { useDroppable } from "@dnd-kit/core";
import { cn } from "@/lib/utils";
import type { TicketRow } from "@/features/tickets/useProjectTickets";
import { QuickAddRow } from "@/features/tickets/QuickAddRow";
import type { CardDisplayPrefs } from "@/features/tickets/useCardDisplayPrefs";
import { DISCIPLINE_STATUS_COLOR, DISCIPLINE_STATUS_LABEL, type DisciplineStatus } from "@/lib/types";
import { DraggableCard, DraggableDisciplineCard } from "./DraggableCards";
import type { DisciplineCard } from "./constants";

export function Column({
  status,
  tickets,
  projectId,
  canQuickAdd,
  onCardClick,
  onCreated,
  prefs,
  forceBars,
  showQuickStart,
  currentUserId,
}: {
  status: { id: string; name: string; color: string; category: string };
  tickets: TicketRow[];
  projectId: string;
  canQuickAdd: boolean;
  onCardClick: (t: TicketRow) => void;
  onCreated: () => void;
  prefs: CardDisplayPrefs;
  forceBars: boolean;
  showQuickStart?: boolean;
  currentUserId?: string;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status.id });
  return (
    <div
      ref={setNodeRef}
      className={cn(
        "min-w-[280px] w-[280px] flex flex-col rounded-2xl glass p-2.5 transition",
        isOver && "bg-white/[0.06] ring-1 ring-accent/40"
      )}
    >
      <div className="flex items-center justify-between px-1.5 pb-2 mb-2 hairline-b">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full" style={{ background: status.color }} />
          <div className="text-sm font-medium">{status.name}</div>
        </div>
        <div className="text-xs text-dimmer font-mono">{tickets.length}</div>
      </div>
      <div className="flex flex-col gap-2 flex-1 min-h-[20px]">
        {tickets.map((t) => (
          <DraggableCard
            key={t.id}
            ticket={t}
            onClick={() => onCardClick(t)}
            prefs={prefs}
            forceBars={forceBars}
            showQuickStart={showQuickStart}
            currentUserId={currentUserId}
          />
        ))}
      </div>
      {canQuickAdd && (
        <QuickAddRow projectId={projectId} statusId={status.id} onCreated={onCreated} />
      )}
    </div>
  );
}

export function DisciplineColumn({
  column,
  cards,
  onCardClick,
  prefs,
  forceBars,
  showQuickStart,
  currentUserId,
}: {
  column: DisciplineStatus;
  cards: DisciplineCard[];
  onCardClick: (c: DisciplineCard) => void;
  prefs: CardDisplayPrefs;
  forceBars: boolean;
  showQuickStart?: boolean;
  currentUserId?: string;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: column });
  const color = DISCIPLINE_STATUS_COLOR[column];
  const label = DISCIPLINE_STATUS_LABEL[column];
  return (
    <div
      ref={setNodeRef}
      className={cn(
        "min-w-[280px] w-[280px] flex flex-col rounded-2xl glass p-2.5 transition",
        isOver && "bg-white/[0.06] ring-1 ring-accent/40"
      )}
    >
      <div className="flex items-center justify-between px-1.5 pb-2 mb-2 hairline-b">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full" style={{ background: color }} />
          <div className="text-sm font-medium">{label}</div>
        </div>
        <div className="text-xs text-dimmer font-mono">{cards.length}</div>
      </div>
      <div className="flex flex-col gap-2 flex-1 min-h-[20px]">
        {cards.map((c) => (
          <DraggableDisciplineCard
            key={`${c.ticket.id}::${c.slot}`}
            card={c}
            onClick={() => onCardClick(c)}
            prefs={prefs}
            forceBars={forceBars}
            showQuickStart={showQuickStart}
            currentUserId={currentUserId}
          />
        ))}
      </div>
    </div>
  );
}
