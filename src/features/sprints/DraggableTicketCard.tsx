import { useDraggable } from "@dnd-kit/core";
import { TicketCard } from "@/features/tickets/TicketCard";
import type { TicketRow } from "@/features/tickets/useProjectTickets";
import { useCardDisplayPrefs } from "@/features/tickets/useCardDisplayPrefs";

export type SprintCardVariant = "backlog" | "lane";

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
  const { prefs: userPrefs } = useCardDisplayPrefs();
  const prefs =
    variant === "lane" ? { ...userPrefs, assignees: false } : userPrefs;
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
