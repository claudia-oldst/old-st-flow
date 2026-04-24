import { useMemo, useState } from "react";
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { useDroppable, useDraggable } from "@dnd-kit/core";
import { useStatuses } from "@/features/statuses/useStatuses";
import { useProjectTickets, type TicketRow } from "@/features/tickets/useProjectTickets";
import { TicketCard } from "@/features/tickets/TicketCard";
import { TicketDetailSheet } from "@/features/tickets/TicketDetailSheet";
import { QuickAddRow } from "@/features/tickets/QuickAddRow";
import { useProjectRole, isPMBA } from "@/features/team/useProjectRole";
import { useCurrentUser } from "@/store/currentUser";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export function ProjectBoard({ projectId }: { projectId: string }) {
  const { statuses } = useStatuses();
  const { tickets, reload } = useProjectTickets(projectId);
  const role = useProjectRole(projectId);
  const user = useCurrentUser((s) => s.user);
  const [filterMine, setFilterMine] = useState<boolean>(!isPMBA(role));
  const [openTicket, setOpenTicket] = useState<TicketRow | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const visible = useMemo(() => {
    if (!filterMine || !user) return tickets;
    return tickets.filter((t) => t.assignees.some((a) => a.user_id === user.id));
  }, [tickets, filterMine, user]);

  const byStatus = useMemo(() => {
    const map: Record<string, TicketRow[]> = {};
    statuses.forEach((s) => (map[s.id] = []));
    visible.forEach((t) => {
      if (t.status_id && map[t.status_id]) map[t.status_id].push(t);
    });
    return map;
  }, [visible, statuses]);

  const activeTicket = activeId ? tickets.find((t) => t.id === activeId) : null;

  const handleDragStart = (e: DragStartEvent) => setActiveId(String(e.active.id));
  const handleDragEnd = async (e: DragEndEvent) => {
    setActiveId(null);
    const ticketId = String(e.active.id);
    const newStatusId = e.over?.id ? String(e.over.id) : null;
    if (!newStatusId) return;
    const t = tickets.find((x) => x.id === ticketId);
    if (!t || t.status_id === newStatusId) return;
    const { error } = await supabase.from("tickets").update({ status_id: newStatusId }).eq("id", ticketId);
    if (error) toast.error(error.message);
    else reload();
  };

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <div className="flex gap-1 p-1 rounded-lg bg-white/5 hairline">
          <button
            onClick={() => setFilterMine(false)}
            className={cn("px-3 py-1 text-xs rounded-md transition", !filterMine ? "bg-foreground text-background" : "text-dim hover:text-foreground")}
          >
            All
          </button>
          <button
            onClick={() => setFilterMine(true)}
            className={cn("px-3 py-1 text-xs rounded-md transition", filterMine ? "bg-foreground text-background" : "text-dim hover:text-foreground")}
          >
            My tickets
          </button>
        </div>
        <div className="text-xs text-dim ml-2">{visible.length} ticket{visible.length === 1 ? "" : "s"}</div>
      </div>

      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="flex gap-3 overflow-x-auto pb-4">
          {statuses.map((status) => (
            <Column
              key={status.id}
              status={status}
              tickets={byStatus[status.id] ?? []}
              projectId={projectId}
              canQuickAdd={isPMBA(role)}
              onCardClick={setOpenTicket}
              onCreated={reload}
            />
          ))}
        </div>
        <DragOverlay>
          {activeTicket && <TicketCard ticket={activeTicket} />}
        </DragOverlay>
      </DndContext>

      <TicketDetailSheet
        open={!!openTicket}
        onOpenChange={(o) => !o && setOpenTicket(null)}
        ticket={openTicket}
        projectId={projectId}
        onChange={reload}
      />
    </div>
  );
}

function Column({
  status,
  tickets,
  projectId,
  canQuickAdd,
  onCardClick,
  onCreated,
}: {
  status: { id: string; name: string; color: string; category: string };
  tickets: TicketRow[];
  projectId: string;
  canQuickAdd: boolean;
  onCardClick: (t: TicketRow) => void;
  onCreated: () => void;
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
          <DraggableCard key={t.id} ticket={t} onClick={() => onCardClick(t)} />
        ))}
      </div>
      {canQuickAdd && (
        <QuickAddRow projectId={projectId} statusId={status.id} onCreated={onCreated} />
      )}
    </div>
  );
}

function DraggableCard({ ticket, onClick }: { ticket: TicketRow; onClick: () => void }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: ticket.id });
  return (
    <div ref={setNodeRef} {...attributes} {...listeners}>
      <TicketCard ticket={ticket} onClick={onClick} isDragging={isDragging} />
    </div>
  );
}
