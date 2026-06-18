import { useMemo } from "react";
import type { PoolData } from "@/features/tickets/list/poolData";
import {
  usePlannedSprintAssignments,
  useProjectSprintTickets,
  useProjectMembers,
} from "./useSprintBoard";
import { memberDisciplines } from "./types";
import type { Sprint } from "./types";

/** Builds the PoolData (FE/BE planned sprint per ticket, plus active committed
 *  sprint numbers per discipline) used by TicketsList to render and sort the
 *  FE / BE Sprint columns. */
export function usePoolData(projectId: string | undefined, sprints: Sprint[]): PoolData {
  const { data: assignments = [] } = usePlannedSprintAssignments(projectId);
  const { data: sprintTickets = [] } = useProjectSprintTickets(projectId);
  const { data: members = [] } = useProjectMembers(projectId);

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

    const memberByUserId = new Map(members.map((m) => [m.user_id, m]));

    const activeByTicket = new Map<string, { fe: number[]; be: number[] }>();
    sprintTickets.forEach((st) => {
      const sprintNum = sprintsById.get(st.sprint_id)?.sprint_number;
      if (!sprintNum) return;
      const member = st.assigned_user_id ? memberByUserId.get(st.assigned_user_id) : null;
      if (!member) return;
      const discs = memberDisciplines(member.role);
      if (discs.length === 0) return;
      if (!activeByTicket.has(st.ticket_id)) {
        activeByTicket.set(st.ticket_id, { fe: [], be: [] });
      }
      const entry = activeByTicket.get(st.ticket_id)!;
      if (discs.includes("FE") && !entry.fe.includes(sprintNum)) entry.fe.push(sprintNum);
      if (discs.includes("BE") && !entry.be.includes(sprintNum)) entry.be.push(sprintNum);
    });

    activeByTicket.forEach((entry) => {
      entry.fe.sort((a, b) => a - b);
      entry.be.sort((a, b) => a - b);
    });

    return { byTicket, sprintsById, activeByTicket };
  }, [assignments, sprintTickets, members, sprints]);
}
