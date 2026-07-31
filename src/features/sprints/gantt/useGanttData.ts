import { useMemo } from "react";
import { useProjectTickets } from "@/features/tickets/useProjectTickets";
import { useProjectEpics } from "@/features/epics/useProjectEpics";
import { useProjectSprintTickets, usePlannedSprintAssignments } from "../useSprintBoard";
import type { Sprint, SprintDiscipline } from "../types";
import {
  buildGanttRows,
  type GanttEpicRow,
  type GanttSegment,
  type GanttTicketInput,
} from "./buildGanttRows";

export type { GanttEpicRow, GanttSegment };

export function useGanttData(
  projectId: string,
  sprints: Sprint[],
  discipline: SprintDiscipline,
): GanttEpicRow[] {
  const { tickets } = useProjectTickets(projectId);
  const { data: sprintTickets = [] } = useProjectSprintTickets(projectId);
  const { data: planned = [] } = usePlannedSprintAssignments(projectId);
  const { epics } = useProjectEpics(projectId);

  return useMemo<GanttEpicRow[]>(() => {
    const plannedByTicket = new Map(planned.map((p) => [p.ticket_id, p]));
    const ticketInputs: GanttTicketInput[] = tickets.map((t) => {
      const p = plannedByTicket.get(t.id);
      return {
        id: t.id,
        epic_id: t.epic_id ?? null,
        epic_name: t.epic_name ?? null,
        fe_status: t.fe_status ?? null,
        be_status: t.be_status ?? null,
        planned_sprint_fe_id: p?.planned_sprint_fe_id ?? null,
        planned_sprint_be_id: p?.planned_sprint_be_id ?? null,
      };
    });
    return buildGanttRows(sprints, ticketInputs, sprintTickets, epics, discipline);
  }, [tickets, sprintTickets, planned, epics, sprints, discipline]);
}
