import { useMemo } from "react";
import type { TicketRow } from "@/features/tickets/useProjectTickets";
import type { SprintMember } from "../types";
import { memberDisciplines } from "../types";

interface CapacityRow {
  user_id: string;
  discipline: string;
  hours: number | string;
}

interface SprintTicketLink {
  ticket_id: string;
  assigned_user_id: string | null;
  discipline: "FE" | "BE";
}

interface Params {
  capacities: CapacityRow[];
  members: SprintMember[];
  sprintTickets: SprintTicketLink[];
  ticketById: Map<string, TicketRow>;
  discipline: "FE" | "BE";
}

export function useWorkbenchData({
  capacities,
  members,
  sprintTickets,
  ticketById,
  discipline,
}: Params) {
  // Devs with capacity for this sprint+discipline.
  const sprintDevs = useMemo<SprintMember[]>(() => {
    const idsForDisc = new Set(
      capacities.filter((c) => c.discipline === discipline).map((c) => c.user_id),
    );
    return members.filter(
      (m) =>
        idsForDisc.has(m.user_id) &&
        memberDisciplines(m.role).includes(discipline),
    );
  }, [capacities, members, discipline]);

  // Only rows for the currently-viewed discipline are considered — a fullstack
  // dev committed only for FE reappears in the BE pool until they're also
  // committed for BE.
  const devAssignments = useMemo(() => {
    const m = new Map<string, TicketRow[]>();
    sprintDevs.forEach((d) => m.set(d.user_id, []));
    sprintTickets.forEach((st) => {
      if (st.discipline !== discipline) return;
      if (!st.assigned_user_id) return;
      const list = m.get(st.assigned_user_id);
      if (!list) return;
      const t = ticketById.get(st.ticket_id);
      if (!t) return;
      list.push(t);
    });
    return m;
  }, [sprintDevs, sprintTickets, ticketById, discipline]);

  const allDevTicketIds = useMemo(() => {
    const s = new Set<string>();
    devAssignments.forEach((rows) => rows.forEach((t) => s.add(t.id)));
    return s;
  }, [devAssignments]);

  const capByDev = useMemo(() => {
    const m = new Map<string, number>();
    capacities
      .filter((c) => c.discipline === discipline)
      .forEach((c) => m.set(c.user_id, Number(c.hours ?? 0)));
    return m;
  }, [capacities, discipline]);

  const totalCap = useMemo(
    () => sprintDevs.reduce((s, d) => s + (capByDev.get(d.user_id) ?? 0), 0),
    [sprintDevs, capByDev],
  );

  const pooledHours = useMemo(() => {
    let total = 0;
    devAssignments.forEach((rows) =>
      rows.forEach((t) => {
        total +=
          discipline === "FE"
            ? Math.max(0, (t.current_fe_estimate || 0) - (t.actual_frontend_hours || 0))
            : Math.max(0, (t.current_be_estimate || 0) - (t.actual_backend_hours || 0));
      }),
    );
    return total;
  }, [devAssignments, discipline]);

  return { sprintDevs, devAssignments, allDevTicketIds, capByDev, totalCap, pooledHours };
}
