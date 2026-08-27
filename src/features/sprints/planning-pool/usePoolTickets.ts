import { useEffect, useMemo, useState } from "react";
import { useProjectTickets, type TicketRow } from "@/features/tickets/useProjectTickets";
import { usePlannedSprintAssignments, useProjectSprintTickets } from "../useSprintBoard";
import { useStatuses } from "@/features/statuses/useStatuses";
import type { Sprint } from "../types";
import { ALL_ROADMAPS, UNPLANNED } from "./usePoolGroups";
import { applyFilters, type TicketFilters } from "@/features/tickets/TicketsFilter";

/**
 * Pool derivation for the planning tab: plannable tickets for the selected
 * discipline, roadmap multi-select state and search/filter application.
 */
export function usePoolTickets({
  projectId,
  sprintId,
  discipline,
  sprints,
  allDevTicketIds,
  filters,
  search,
}: {
  projectId: string;
  sprintId: string;
  discipline: "FE" | "BE";
  sprints: Sprint[];
  allDevTicketIds: Set<string>;
  filters: TicketFilters;
  search: string;
}) {
  const { tickets: allTickets } = useProjectTickets(projectId);
  const { data: assignments = [] } = usePlannedSprintAssignments(projectId);
  const { data: allSprintTickets = [] } = useProjectSprintTickets(projectId);
  const { statuses } = useStatuses();
  const [roadmapIds, setRoadmapIds] = useState<Set<string>>(() => new Set([sprintId]));

  // Reset roadmap selection to the current sprint whenever the planning sprint changes.
  useEffect(() => {
    setRoadmapIds(new Set([sprintId]));
  }, [sprintId]);

  const planByTicket = useMemo(() => {
    const m = new Map<string, { fe: string | null; be: string | null }>();
    assignments.forEach((a) =>
      m.set(a.ticket_id, { fe: a.planned_sprint_fe_id, be: a.planned_sprint_be_id }),
    );
    return m;
  }, [assignments]);

  // Tickets already committed (any sprint) for the selected discipline — excluded from pool.
  // Discipline is read from sprint_tickets.discipline (never inferred from assignee role).
  const committedForDiscipline = useMemo(() => {
    const s = new Set<string>();
    allSprintTickets.forEach((st: { ticket_id: string; discipline: string | null }) => {
      if (st.discipline === discipline) s.add(st.ticket_id);
    });
    return s;
  }, [allSprintTickets, discipline]);

  // status_id → category (only backlog / active tickets are plannable).
  const statusCategoryById = useMemo(() => {
    const m = new Map<string, string>();
    statuses.forEach((s) => m.set(s.id, s.category));
    return m;
  }, [statuses]);

  const pool = useMemo(() => {
    const allMode = roadmapIds.has(ALL_ROADMAPS);
    return allTickets.filter((t: TicketRow) => {
      if (t.ticket_type === "Proj") return false;
      if (allDevTicketIds.has(t.id)) return false;
      if (committedForDiscipline.has(t.id)) return false;
      if (!t.status_id) return false;
      const cat = statusCategoryById.get(t.status_id);
      if (cat !== "backlog" && cat !== "active") return false;
      if (allMode) return true;
      const plan = planByTicket.get(t.id);
      const planned = discipline === "FE" ? (plan?.fe ?? null) : (plan?.be ?? null);
      return roadmapIds.has(planned ?? UNPLANNED);
    });
  }, [
    allTickets,
    allDevTicketIds,
    discipline,
    roadmapIds,
    planByTicket,
    committedForDiscipline,
    statusCategoryById,
  ]);

  const sortedSprints = useMemo(
    () => [...sprints].sort((a, b) => a.sprint_number - b.sprint_number),
    [sprints],
  );

  const roadmapLabel = useMemo(() => {
    if (roadmapIds.has(ALL_ROADMAPS)) return "All roadmaps";
    if (roadmapIds.size === 0) return "No roadmap";
    if (roadmapIds.size === 1) {
      const only = [...roadmapIds][0];
      if (only === UNPLANNED) return "Unplanned";
      const s = sortedSprints.find((x) => x.id === only);
      return s ? `Sprint ${s.sprint_number}` : "Roadmap";
    }
    return `${roadmapIds.size} roadmaps`;
  }, [roadmapIds, sortedSprints]);

  const toggleRoadmap = (id: string) => {
    setRoadmapIds((prev) => {
      const next = new Set(prev);
      if (id === ALL_ROADMAPS) {
        if (next.has(ALL_ROADMAPS)) next.delete(ALL_ROADMAPS);
        else {
          next.clear();
          next.add(ALL_ROADMAPS);
        }
        return next;
      }
      next.delete(ALL_ROADMAPS);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const filtered = useMemo(() => {
    const base = applyFilters(pool, filters);
    const q = search.trim().toLowerCase();
    if (!q) return base;
    return base.filter((t) => `${t.formatted_id} ${t.title}`.toLowerCase().includes(q));
  }, [pool, filters, search]);

  return { pool, filtered, planByTicket, sortedSprints, roadmapIds, roadmapLabel, toggleRoadmap };
}
