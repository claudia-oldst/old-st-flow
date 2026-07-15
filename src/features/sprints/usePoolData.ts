import { useMemo } from "react";
import type { PoolData } from "@/features/tickets/list/poolData";
import {
  usePlannedSprintAssignments,
  useProjectSprintTickets,
} from "./useSprintBoard";
import type { Sprint } from "./types";

/** Builds the PoolData (FE/BE planned sprint per ticket, plus active committed
 *  sprint numbers per discipline) used by TicketsList to render and sort the
 *  FE / BE Sprint columns.
 *
 *  Active-bucket routing is driven by `sprint_tickets.discipline` — not by the
 *  assignee's role — so a fullstack dev committed only for BE does not light
 *  up the FE column (and vice versa).
 */
export function usePoolData(projectId: string | undefined, sprints: Sprint[]): PoolData {
  const { data: assignments = [] } = usePlannedSprintAssignments(projectId);
  const { data: sprintTickets = [] } = useProjectSprintTickets(projectId);

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

    const activeByTicket = new Map<string, { fe: number[]; be: number[] }>();
    sprintTickets.forEach((st) => {
      const sprintNum = sprintsById.get(st.sprint_id)?.sprint_number;
      if (!sprintNum) return;
      if (st.discipline !== "FE" && st.discipline !== "BE") return;
      if (!activeByTicket.has(st.ticket_id)) {
        activeByTicket.set(st.ticket_id, { fe: [], be: [] });
      }
      const entry = activeByTicket.get(st.ticket_id)!;
      const bucket = st.discipline === "FE" ? entry.fe : entry.be;
      if (!bucket.includes(sprintNum)) bucket.push(sprintNum);
    });

    activeByTicket.forEach((entry) => {
      entry.fe.sort((a, b) => a - b);
      entry.be.sort((a, b) => a - b);
    });

    return { byTicket, sprintsById, activeByTicket };
  }, [assignments, sprintTickets, sprints]);
}
