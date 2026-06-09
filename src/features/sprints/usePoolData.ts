import { useMemo } from "react";
import type { PoolData } from "@/features/tickets/list/poolData";
import { usePlannedSprintAssignments } from "./useSprintBoard";
import type { Sprint } from "./types";

/** Builds the PoolData (FE/BE planned sprint per ticket) used by TicketsList to
 *  render and sort the FE Pool / BE Pool columns. */
export function usePoolData(projectId: string | undefined, sprints: Sprint[]): PoolData {
  const { data: assignments = [] } = usePlannedSprintAssignments(projectId);

  return useMemo(() => {
    const byTicket = new Map<string, { fe: string | null; be: string | null }>();
    assignments.forEach((a) =>
      byTicket.set(a.ticket_id, {
        fe: a.planned_sprint_fe_id,
        be: a.planned_sprint_be_id,
      }),
    );
    const sprintsById = new Map<string, { sprint_number: number }>();
    sprints.forEach((s) => sprintsById.set(s.id, { sprint_number: s.sprint_number }));
    return { byTicket, sprintsById };
  }, [assignments, sprints]);
}
