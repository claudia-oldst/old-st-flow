import { useEffect, useMemo, useState } from "react";
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { useStatuses } from "@/features/statuses/useStatuses";
import { useProjectTickets, type TicketRow } from "@/features/tickets/useProjectTickets";
import { TicketCard } from "@/features/tickets/TicketCard";
import { TicketDetailSheet } from "@/features/tickets/TicketDetailSheet";
import { useProjectRole, isPMBA } from "@/features/team/useProjectRole";
import { useCurrentUser } from "@/store/currentUser";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { type DisciplineStatus } from "@/lib/types";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useCardDisplayPrefs } from "@/features/tickets/useCardDisplayPrefs";
import {
  BoardMode,
  CATEGORY_TO_DISCIPLINE,
  DISCIPLINE_STATUSES,
  DISCIPLINE_TO_CATEGORY,
  DisciplineCard,
} from "./board/constants";
import { Column, DisciplineColumn } from "./board/Columns";

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
  /** Optional: pass tickets from a parent to avoid double-fetching. */
  tickets?: TicketRow[];
  reload?: () => void;
}) {
  const { statuses } = useStatuses();
  // Only spin up the local fetch+realtime when no parent supplied tickets.
  const local = useProjectTickets(ticketsProp ? undefined : projectId);
  const allTickets = ticketsProp ?? local.tickets;
  const reload = reloadProp ?? local.reload;
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
  const [activeId, setActiveId] = useState<string | null>(null);
  const { prefs } = useCardDisplayPrefs();

  // Apply role-based defaults once we know the role (until the user changes a toggle).
  // When filterMine is controlled by a parent, the parent owns that default — we only
  // set the local board mode here to avoid double-writes that cause toggle flicker.
  useEffect(() => {
    if (touched || role === null) return;
    setMode(pmba ? "project" : "discipline");
    if (!isControlled) {
      setInternalFilterMine(!pmba);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role, pmba, touched]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const visible = useMemo(() => {
    if (!filterMine || !user) return tickets;
    return tickets.filter((t) => t.assignees.some((a) => a.user_id === user.id));
  }, [tickets, filterMine, user]);

  // Project-mode grouping
  const byStatus = useMemo(() => {
    const map: Record<string, TicketRow[]> = {};
    statuses.forEach((s) => (map[s.id] = []));
    visible.forEach((t) => {
      if (t.status_id && map[t.status_id]) map[t.status_id].push(t);
    });
    return map;
  }, [visible, statuses]);

  // Discipline-mode: produce one card per (ticket, slot)
  // - "My tickets": only slots the current user is assigned to
  // - "All" (PMBA): both FE and BE for every ticket, bucketed by their fe_status / be_status
  //   Proj tickets show as their own card (collapsed project status -> discipline column)
  //   for any role that isn't pinned to a single discipline (Frontend / Backend only).
  const showAll = !filterMine;
  const statusCategoryById = useMemo(() => {
    const m: Record<string, string> = {};
    statuses.forEach((s) => (m[s.id] = s.category));
    return m;
  }, [statuses]);
  const disciplineCards: DisciplineCard[] = useMemo(() => {
    if (!user && !showAll) return [];
    // In "All" mode, restrict slots based on the viewer's role:
    // Frontend → FE only, Backend → BE only, PMBA/Fullstack/QA/Design → all (incl. Project).
    const showFE = role !== "Backend";
    const showBE = role !== "Frontend";
    const showProject = role !== "Frontend" && role !== "Backend";
    const out: DisciplineCard[] = [];
    visible.forEach((t) => {
      if (t.ticket_type === "Proj") {
        // Proj tickets: single Project card, status derived from project status category.
        const hasProject = t.assignees.some((a) => a.slot === "Project");
        if (!hasProject) return;
        const cat = t.status_id ? statusCategoryById[t.status_id] : undefined;
        const dStatus: DisciplineStatus = (cat ? CATEGORY_TO_DISCIPLINE[cat] : undefined) ?? "todo";
        if (showAll) {
          if (showProject) out.push({ ticket: t, slot: "Project", status: dStatus });
        } else {
          const mine = t.assignees.some((a) => a.user_id === user!.id && a.slot === "Project");
          if (mine) out.push({ ticket: t, slot: "Project", status: dStatus });
        }
        return;
      }
      // A discipline only "exists" once someone is assigned for that role.
      const hasFE = t.assignees.some((a) => a.slot === "FE");
      const hasBE = t.assignees.some((a) => a.slot === "BE");
      if (showAll) {
        if (showFE && hasFE) out.push({ ticket: t, slot: "FE", status: t.fe_status });
        if (showBE && hasBE) out.push({ ticket: t, slot: "BE", status: t.be_status });
      } else {
        const slots = new Set(
          t.assignees
            .filter((a) => a.user_id === user!.id && (a.slot === "FE" || a.slot === "BE"))
            .map((a) => a.slot as "FE" | "BE")
        );
        slots.forEach((slot) => {
          out.push({
            ticket: t,
            slot,
            status: slot === "FE" ? t.fe_status : t.be_status,
          });
        });
      }
    });
    return out;
  }, [visible, user, showAll, role, statusCategoryById]);

  const byDisciplineStatus = useMemo(() => {
    const map: Record<DisciplineStatus, DisciplineCard[]> = {
      todo: [],
      in_progress: [],
      for_integration: [],
      done: [],
    };
    disciplineCards.forEach((c) => map[c.status].push(c));
    return map;
  }, [disciplineCards]);

  const disciplineColumns: DisciplineStatus[] = DISCIPLINE_STATUSES;

  const activeTicket =
    activeId && mode === "project"
      ? tickets.find((t) => t.id === activeId)
      : activeId && mode === "discipline"
      ? disciplineCards.find((c) => `${c.ticket.id}::${c.slot}` === activeId)?.ticket
      : null;

  const handleDragStart = (e: DragStartEvent) => setActiveId(String(e.active.id));

  const handleDragEnd = async (e: DragEndEvent) => {
    setActiveId(null);
    const overId = e.over?.id ? String(e.over.id) : null;
    if (!overId) return;

    if (mode === "project") {
      const ticketId = String(e.active.id);
      const t = tickets.find((x) => x.id === ticketId);
      if (!t || t.status_id === overId) return;
      const { error } = await supabase
        .from("tickets")
        .update({ status_id: overId })
        .eq("id", ticketId);
      if (error) toast.error(error.message);
      else reload();
      return;
    }

    // Discipline mode: active id is `${ticketId}::${slot}`, over id is the discipline status
    const [ticketId, slot] = String(e.active.id).split("::");
    const newStatus = overId as DisciplineStatus;
    if (!DISCIPLINE_STATUSES.includes(newStatus)) return;
    const t = tickets.find((x) => x.id === ticketId);
    if (!t) return;
    // Defensive: if the slot has no assignees (race with realtime), don't allow status changes.
    const hasSlot = t.assignees.some((a) => a.slot === slot);
    if (!hasSlot) return;

    if (slot === "Project") {
      // Proj ticket: map discipline column → project status category, set status_id
      // and flip override so the auto-derive trigger doesn't undo it.
      const targetCategory = DISCIPLINE_TO_CATEGORY[newStatus];
      const currentCategory = t.status_id ? statusCategoryById[t.status_id] : undefined;
      if (currentCategory === targetCategory) return;
      const target = statuses
        .filter((s) => s.category === targetCategory)
        .sort((a, b) => a.position - b.position)[0];
      if (!target) return;
      const { error } = await supabase
        .from("tickets")
        .update({ status_id: target.id, project_status_override: true })
        .eq("id", ticketId);
      if (error) toast.error(error.message);
      else reload();
      return;
    }

    const current = slot === "FE" ? t.fe_status : t.be_status;
    if (current === newStatus) return;
    const patch =
      slot === "FE" ? { fe_status: newStatus } : { be_status: newStatus };
    const { error } = await supabase
      .from("tickets")
      .update(patch)
      .eq("id", ticketId);
    if (error) toast.error(error.message);
    else reload();
  };

  return (
    <TooltipProvider>
      <div>
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <div className="flex gap-1 p-1 rounded-lg bg-white/5 hairline">
            <button
              onClick={() => { setTouched(true); setMode("project"); }}
              className={cn(
                "px-3 py-1 text-xs rounded-md transition",
                mode === "project" ? "bg-foreground text-background" : "text-dim hover:text-foreground"
              )}
            >
              Project status
            </button>
            <button
              onClick={() => { setTouched(true); setMode("discipline"); }}
              className={cn(
                "px-3 py-1 text-xs rounded-md transition",
                mode === "discipline" ? "bg-foreground text-background" : "text-dim hover:text-foreground"
              )}
            >
              My discipline
            </button>
          </div>

          <div className="flex gap-1 p-1 rounded-lg bg-white/5 hairline">
            <button
              onClick={() => { setTouched(true); setFilterMine(false); }}
              className={cn("px-3 py-1 text-xs rounded-md transition", !filterMine ? "bg-foreground text-background" : "text-dim hover:text-foreground")}
            >
              All
            </button>
            <button
              onClick={() => { setTouched(true); setFilterMine(true); }}
              className={cn("px-3 py-1 text-xs rounded-md transition", filterMine ? "bg-foreground text-background" : "text-dim hover:text-foreground")}
            >
              My tickets
            </button>
          </div>
          <div className="text-xs text-dim ml-2">
            {mode === "project"
              ? `${visible.length} ticket${visible.length === 1 ? "" : "s"}`
              : `${disciplineCards.length} card${disciplineCards.length === 1 ? "" : "s"}`}
          </div>
        </div>

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
