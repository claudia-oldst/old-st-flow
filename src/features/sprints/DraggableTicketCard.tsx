import { useDraggable } from "@dnd-kit/core";
import { TicketCard } from "@/features/tickets/TicketCard";
import type { TicketRow } from "@/features/tickets/useProjectTickets";
import { useCardDisplayPrefs } from "@/features/tickets/useCardDisplayPrefs";
import { useSprintSelection } from "./SprintSelectionContext";
import { cn } from "@/lib/utils";

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
  const { isSelected, toggle, selected } = useSprintSelection();
  const selectedHere = isSelected(ticket.id);
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: dndId,
    disabled,
    data: { ticketId: ticket.id, selected: selectedHere, selectionSize: selected.size },
  });
  const { prefs: userPrefs } = useCardDisplayPrefs();
  const prefs =
    variant === "lane" ? { ...userPrefs, assignees: false } : userPrefs;

  const handleClick = (e: React.MouseEvent) => {
    if (disabled) return;
    // Toggle selection on plain click; don't open ticket sheet here.
    e.stopPropagation();
    toggle(ticket.id);
    onClick?.();
  };

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      onClick={handleClick}
      className={cn(
        "relative rounded-md transition",
        selectedHere && "ring-2 ring-primary ring-offset-1 ring-offset-background",
      )}
    >
      {selectedHere && isDragging && selected.size > 1 && (
        <div className="absolute -top-2 -right-2 z-10 rounded-full bg-primary text-primary-foreground text-[10px] font-mono px-1.5 py-0.5 shadow">
          {selected.size}
        </div>
      )}
      <TicketCard
        ticket={ticket}
        prefs={prefs}
        isDragging={isDragging}
        forceBars
      />
    </div>
  );
}
