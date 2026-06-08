import { useDraggable } from "@dnd-kit/core";
import { TicketCard } from "@/features/tickets/TicketCard";
import type { TicketRow } from "@/features/tickets/useProjectTickets";
import { DEFAULT_CARD_PREFS, type CardDisplayPrefs } from "@/features/tickets/useCardDisplayPrefs";

export type SprintCardVariant = "backlog" | "lane";

const BACKLOG_PREFS: CardDisplayPrefs = {
  ...DEFAULT_CARD_PREFS,
  chips: false,
};

const LANE_PREFS: CardDisplayPrefs = {
  ...DEFAULT_CARD_PREFS,
  chips: false,
  assignees: false,
};

interface Props {
  ticket: TicketRow;
  dndId: string;
  variant?: SprintCardVariant;
  disabled?: boolean;
  onClick?: () => void;
}

export function DraggableTicketCard({
  ticket,
  dndId,
  variant = "backlog",
  disabled,
  onClick,
}: Props) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: dndId,
    disabled,
    data: { ticketId: ticket.id },
  });
  const prefs = variant === "lane" ? LANE_PREFS : BACKLOG_PREFS;
  return (
    <div ref={setNodeRef} {...attributes} {...listeners}>
      <TicketCard
        ticket={ticket}
        prefs={prefs}
        isDragging={isDragging}
        onClick={onClick}
        forceBars
      />
    </div>
  );
}
