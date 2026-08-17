import { useMemo } from "react";
import { useProjectTickets } from "@/features/tickets/useProjectTickets";
import { useProjectEpics } from "@/features/epics/useProjectEpics";
import { useProjectSprintTickets, usePlannedSprintAssignments } from "../useSprintBoard";
import { versionKeyOf } from "@/features/health/versionFilter";
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
  /** Optional version scope; undefined/empty means all versions. */
  versions?: string[],
): GanttEpicRow[] {
  const { tickets } = useProjectTickets(projectId);
  const { data: sprintTickets = [] } = useProjectSprintTickets(projectId);
  const { data: planned = [] } = usePlannedSprintAssignments(projectId);
  const { epics } = useProjectEpics(projectId);

  const versionKey = (versions ?? []).slice().sort().join("|");

  return useMemo<GanttEpicRow[]>(() => {
    const scope = versionKey ? new Set(versionKey.split("|")) : null;
    const scoped = scope
      ? tickets.filter((t) => scope.has(versionKeyOf(t.version as string | null)))
      : tickets;
    const plannedByTicket = new Map(planned.map((p) => [p.ticket_id, p]));
    const ticketInputs: GanttTicketInput[] = scoped.map((t) => {
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
  }, [tickets, sprintTickets, planned, epics, sprints, discipline, versionKey]);
}
