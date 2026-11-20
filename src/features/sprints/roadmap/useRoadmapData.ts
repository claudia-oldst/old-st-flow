import { useMemo } from "react";
import { format } from "date-fns";
import { useProjectTickets } from "@/features/tickets/useProjectTickets";
import { useStatuses } from "@/features/statuses/useStatuses";
import {
  usePlannedSprintAssignments,
  useProjectCapacities,
  useProjectMembers,
  useProjectSprintTickets,
} from "../useSprintBoard";
import type { Sprint } from "../types";
import type { Commitment } from "./cellRules";
import { sprintTotals, type SprintTotals } from "./sprintTotals";

export const todayIso = () => format(new Date(), "yyyy-MM-dd");

/** Everything the Sprints and Roadmap tabs need, derived from shared caches. */
export function useRoadmapData(projectId: string, sprints: Sprint[]) {
  const { tickets: all, loadingMore } = useProjectTickets(projectId);
  const { data: commitments = [] } = useProjectSprintTickets(projectId);
  const { data: planned = [] } = usePlannedSprintAssignments(projectId);
  const { data: capacities = [] } = useProjectCapacities(projectId);
  const { data: members = [] } = useProjectMembers(projectId);
  const { statuses } = useStatuses();
  const today = todayIso();

  const tickets = useMemo(() => all.filter((t) => t.ticket_type !== "Feedback"), [all]);
  const commits = commitments as unknown as Commitment[];

  const commitsByTicket = useMemo(() => {
    const m = new Map<string, Commitment[]>();
    commits.forEach((c) => m.set(c.ticket_id, [...(m.get(c.ticket_id) ?? []), c]));
    return m;
  }, [commits]);

  const plannedByTicket = useMemo(
    () => new Map(planned.map((p) => [p.ticket_id, { fe: p.planned_sprint_fe_id, be: p.planned_sprint_be_id }])),
    [planned],
  );

  const totalsBySprint = useMemo(() => {
    const m = new Map<string, SprintTotals>();
    sprints.forEach((s) => m.set(s.id, sprintTotals(s, tickets, commits, planned, today)));
    return m;
  }, [sprints, tickets, commits, planned, today]);

  const capsBySprint = useMemo(() => {
    const m = new Map<string, { FE: number; BE: number; byUser: Map<string, { FE: number; BE: number }> }>();
    capacities.forEach((c) => {
      const cur = m.get(c.sprint_id) ?? { FE: 0, BE: 0, byUser: new Map() };
      const d = c.discipline === "BE" ? "BE" : c.discipline === "FE" ? "FE" : null;
      if (d) {
        cur[d] += Number(c.hours);
        const u = cur.byUser.get(c.user_id) ?? { FE: 0, BE: 0 };
        u[d] += Number(c.hours);
        cur.byUser.set(c.user_id, u);
      }
      m.set(c.sprint_id, cur);
    });
    return m;
  }, [capacities]);

  const devDoneStatusIds = useMemo(
    () => new Set(statuses.filter((s) => s.category === "dev done" || s.category === "done").map((s) => s.id)),
    [statuses],
  );

  return {
    tickets, commits, planned, commitsByTicket, plannedByTicket, totalsBySprint, capsBySprint,
    members, statuses, devDoneStatusIds, today, loading: loadingMore,
  };
}

export type RoadmapData = ReturnType<typeof useRoadmapData>;
