import { useEffect, useMemo, useState } from "react";
import { DndContext, DragOverlay } from "@dnd-kit/core";
import { useStatuses } from "@/features/statuses/useStatuses";
import { useProjectTickets, type TicketRow } from "@/features/tickets/useProjectTickets";
import { TicketCard } from "@/features/tickets/TicketCard";
import { TicketDetailSheet } from "@/features/tickets/TicketDetailSheet";
import { useProjectRole, canManageTickets } from "@/features/team/useProjectRole";
import { useCurrentUser } from "@/store/currentUser";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useCardDisplayPrefs } from "@/features/tickets/useCardDisplayPrefs";
import { BoardMode } from "./board/constants";
import { Column, DisciplineColumn } from "./board/Columns";
import { useDisciplineCards } from "./board/useDisciplineCards";
import { useBoardDnd } from "./board/useBoardDnd";
import { BoardToolbar } from "./board/BoardToolbar";
import { Skeleton } from "@/components/ui/skeleton";

export function ProjectBoard({
  projectId,
  search = "",
  filterMine: filterMineProp,
  onFilterMineChange,
  tickets: ticketsProp,
  reload: reloadProp,
}: {
  projectId: string;
  search?: string;
  filterMine?: boolean;
  onFilterMineChange?: (v: boolean) => void;
  tickets?: TicketRow[];
  reload?: () => void;
}) {
  const { statuses, loading: statusesLoading } = useStatuses();
  const local = useProjectTickets(ticketsProp ? undefined : projectId);
  const allTickets = ticketsProp ?? local.tickets;
  const reload = reloadProp ?? local.reload;
  const truncated = !ticketsProp && local.truncated;
  const totalCount = !ticketsProp ? local.totalCount : allTickets.length;
  const initialLoading =
    !ticketsProp && (local.loading || statusesLoading) && allTickets.length === 0;
  const tickets = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return allTickets;
    return allTickets.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        (t.formatted_id ?? "").toLowerCase().includes(q)
    );
  }, [allTickets, search]);
  const role = useProjectRole(projectId);
  const user = useCurrentUser((s) => s.user);
  const pmba = isPMBA(role);
  const isControlled = filterMineProp !== undefined;
  const [internalFilterMine, setInternalFilterMine] = useState<boolean>(true);
  const filterMine = filterMineProp ?? internalFilterMine;
  const setFilterMine = (v: boolean) => {
    if (onFilterMineChange) onFilterMineChange(v);
    else setInternalFilterMine(v);
  };
  const [mode, setMode] = useState<BoardMode>("discipline");
  const [touched, setTouched] = useState(false);
  const [openTicket, setOpenTicket] = useState<TicketRow | null>(null);
  const { prefs } = useCardDisplayPrefs();

  useEffect(() => {
    if (touched || role === null) return;
    setMode(pmba ? "project" : "discipline");
    if (!isControlled) {
      setInternalFilterMine(!pmba);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role, pmba, touched]);

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

  const showAll = !filterMine;
  const { statusCategoryById, disciplineCards, byDisciplineStatus, disciplineColumns } =
    useDisciplineCards({ visible, user, showAll, role, statuses });

  const { sensors, activeId, handleDragStart, handleDragEnd } = useBoardDnd({
    mode,
    tickets,
    statuses,
    statusCategoryById,
    reload,
  });

  const activeTicket =
    activeId && mode === "project"
      ? tickets.find((t) => t.id === activeId)
      : activeId && mode === "discipline"
      ? disciplineCards.find((c) => `${c.ticket.id}::${c.slot}` === activeId)?.ticket
      : null;

  return (
    <TooltipProvider>
      <div>
        <BoardToolbar
          mode={mode}
          setMode={(m) => { setTouched(true); setMode(m); }}
          filterMine={filterMine}
          setFilterMine={(v) => { setTouched(true); setFilterMine(v); }}
          visibleCount={visible.length}
          cardCount={disciplineCards.length}
        />

        {truncated && (
          <div className="mb-3 rounded-xl px-3 py-2 text-xs text-dim bg-accent/10 hairline">
            Showing first {allTickets.length} of {totalCount} tickets — switch to List view to page through the rest.
          </div>
        )}

        {initialLoading ? (
          <div className="flex gap-3 overflow-x-auto pb-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex-1 min-w-[260px] space-y-2">
                <Skeleton className="h-8 rounded-xl" />
                <Skeleton className="h-24 rounded-xl" />
                <Skeleton className="h-24 rounded-xl" />
                <Skeleton className="h-24 rounded-xl" />
              </div>
            ))}
          </div>
        ) : (
        <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          {mode === "project" ? (
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
                  prefs={prefs}
                  forceBars={filterMine}
                  showQuickStart={filterMine}
                  currentUserId={user?.id}
                />
              ))}
            </div>
          ) : (
            <div className="flex gap-3 overflow-x-auto pb-4">
              {disciplineColumns.map((s) => (
                <DisciplineColumn
                  key={s}
                  column={s}
                  cards={byDisciplineStatus[s]}
                  onCardClick={(c) => setOpenTicket(c.ticket)}
                  prefs={prefs}
                  forceBars={filterMine}
                  showQuickStart={filterMine}
                  currentUserId={user?.id}
                />
              ))}
            </div>
          )}
          <DragOverlay>
            {activeTicket && <TicketCard ticket={activeTicket} prefs={prefs} forceBars={filterMine} />}
          </DragOverlay>
        </DndContext>
        )}

        <TicketDetailSheet
          open={!!openTicket}
          onOpenChange={(o) => !o && setOpenTicket(null)}
          ticket={openTicket}
          projectId={projectId}
          onChange={reload}
        />
      </div>
    </TooltipProvider>
  );
}
