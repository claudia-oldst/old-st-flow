import { useDraggable } from "@dnd-kit/core";
import { TicketCard } from "@/features/tickets/TicketCard";
import type { TicketRow } from "@/features/tickets/useProjectTickets";
import type { CardDisplayPrefs } from "@/features/tickets/useCardDisplayPrefs";
import type { DisciplineCard } from "./constants";

export function DraggableCard({
  ticket,
  onClick,
  prefs,
  forceBars,
  showQuickStart,
  currentUserId,
}: {
  ticket: TicketRow;
  onClick: () => void;
  prefs: CardDisplayPrefs;
  forceBars: boolean;
  showQuickStart?: boolean;
  currentUserId?: string;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: ticket.id });
  return (
    <div ref={setNodeRef} {...attributes} {...listeners}>
      <TicketCard
        ticket={ticket}
        onClick={onClick}
        isDragging={isDragging}
        prefs={prefs}
        forceBars={forceBars}
        showQuickStart={showQuickStart}
        currentUserId={currentUserId}
      />
    </div>
  );
}

export function DraggableDisciplineCard({
  card,
  onClick,
  prefs,
  forceBars,
  showQuickStart,
  currentUserId,
}: {
  card: DisciplineCard;
  onClick: () => void;
  prefs: CardDisplayPrefs;
  forceBars: boolean;
  showQuickStart?: boolean;
  currentUserId?: string;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `${card.ticket.id}::${card.slot}`,
  });
  return (
    <div ref={setNodeRef} {...attributes} {...listeners} className="relative">
      <span
        className="absolute -top-1.5 -right-1.5 z-10 px-1.5 py-0.5 rounded-full text-[9px] font-semibold ring-1 ring-white/15"
        style={{ background: "hsl(var(--background))", color: "hsl(var(--foreground))" }}
      >
        {card.slot === "Project" ? "P" : card.slot}
      </span>
      <TicketCard
        ticket={card.ticket}
        onClick={onClick}
        isDragging={isDragging}
        prefs={prefs}
        forceBars={forceBars}
        showQuickStart={showQuickStart}
        currentUserId={currentUserId}
        forcedDiscipline={card.slot}
      />
    </div>
  );
}
