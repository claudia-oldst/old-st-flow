import { useMemo } from "react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { AssigneeSlot } from "@/lib/types";
import type { Sprint, SprintMember } from "../types";
import { memberDisciplines } from "../types";
import { useSprintCapacities, usePlannedSprintAssignments } from "../useSprintBoard";
import { useProjectTickets } from "@/features/tickets/useProjectTickets";

/**
 * Capacity + pooled-hours data and mutations for a single sprint block row.
 */
export function useSprintBlock({
  sprint,
  devMembers,
  projectId,
}: {
  sprint: Sprint;
  devMembers: SprintMember[];
  projectId: string;
}) {
  const qc = useQueryClient();
  const { data: capacities = [] } = useSprintCapacities(sprint.id);
  const { data: assignments = [] } = usePlannedSprintAssignments(projectId);
  const { tickets } = useProjectTickets(projectId);

  const capFor = (uid: string, d: AssigneeSlot) =>
    Number(capacities.find((c) => c.user_id === uid && c.discipline === d)?.hours ?? 0);

  const addedUserIds = useMemo(() => {
    const set = new Set<string>();
    capacities.forEach((c) => set.add(c.user_id));
    return set;
  }, [capacities]);

  const addedMembers = useMemo(
    () => devMembers.filter((m) => addedUserIds.has(m.user_id)),
    [devMembers, addedUserIds],
  );
  const availableMembers = useMemo(
    () => devMembers.filter((m) => !addedUserIds.has(m.user_id)),
    [devMembers, addedUserIds],
  );

  // Sprint-level pooled hours (across all devs).
  const { pooledFE, pooledBE } = useMemo(() => {
    let fe = 0;
    let be = 0;
    const ticketMap = new Map(tickets.map((t) => [t.id, t]));
    assignments.forEach((a) => {
      const t = ticketMap.get(a.ticket_id);
      if (!t) return;
      if (a.planned_sprint_fe_id === sprint.id) fe += t.current_fe_estimate || 0;
      if (a.planned_sprint_be_id === sprint.id) be += t.current_be_estimate || 0;
    });
    return { pooledFE: fe, pooledBE: be };
  }, [assignments, tickets, sprint.id]);

  // Per-dev pooled hours: sum estimates for tickets planned into this sprint
  // where the dev holds the matching discipline assignee slot.
  const pooledPerDev = useMemo(() => {
    const map = new Map<string, { FE: number; BE: number }>();
    const ticketMap = new Map(tickets.map((t) => [t.id, t]));
    const add = (uid: string, d: "FE" | "BE", est: number) => {
      const cur = map.get(uid) ?? { FE: 0, BE: 0 };
      cur[d] += est;
      map.set(uid, cur);
    };
    assignments.forEach((a) => {
      const t = ticketMap.get(a.ticket_id);
      if (!t) return;
      if (a.planned_sprint_fe_id === sprint.id) {
        t.assignees
          .filter((x) => x.slot === "FE")
          .forEach((x) => add(x.user_id, "FE", t.current_fe_estimate || 0));
      }
      if (a.planned_sprint_be_id === sprint.id) {
        t.assignees
          .filter((x) => x.slot === "BE")
          .forEach((x) => add(x.user_id, "BE", t.current_be_estimate || 0));
      }
    });
    return map;
  }, [assignments, tickets, sprint.id]);

  const capFE = capacities
    .filter((c) => c.discipline === "FE")
    .reduce((s, c) => s + Number(c.hours), 0);
  const capBE = capacities
    .filter((c) => c.discipline === "BE")
    .reduce((s, c) => s + Number(c.hours), 0);

  const stackMembers = useMemo(
    () =>
      addedMembers.map((m) => ({
        id: m.user_id,
        name: m.member.name,
        avatar_color: m.member.avatar_color,
      })),
    [addedMembers],
  );

  const invalidate = () =>
    qc.invalidateQueries({ queryKey: ["sprint_capacities", sprint.id] });

  const updateCap = async (userId: string, discipline: AssigneeSlot, hours: number) => {
    const existing = capacities.find(
      (c) => c.user_id === userId && c.discipline === discipline,
    );
    const { error } = existing
      ? await supabase.from("sprint_capacities").update({ hours }).eq("id", existing.id)
      : await supabase
          .from("sprint_capacities")
          .insert({ sprint_id: sprint.id, user_id: userId, discipline, hours });
    if (error) toast.error(error.message);
    invalidate();
  };

  const addMember = async (m: SprintMember) => {
    const primary = memberDisciplines(m.role)[0] as AssigneeSlot;
    const { error } = await supabase.from("sprint_capacities").insert({
      sprint_id: sprint.id,
      user_id: m.user_id,
      discipline: primary,
      hours: 0,
    });
    if (error) toast.error(error.message);
    invalidate();
  };

  const removeMember = async (userId: string) => {
    const { error } = await supabase
      .from("sprint_capacities")
      .delete()
      .eq("sprint_id", sprint.id)
      .eq("user_id", userId);
    if (error) toast.error(error.message);
    invalidate();
  };

  const removeSprint = async () => {
    if (!confirm(`Delete Sprint ${sprint.sprint_number}?`)) return;
    const { error } = await supabase.from("sprints").delete().eq("id", sprint.id);
    if (error) toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["sprints", sprint.project_id] });
  };

  return {
    capFor,
    addedMembers,
    availableMembers,
    pooledFE,
    pooledBE,
    pooledPerDev,
    capFE,
    capBE,
    stackMembers,
    updateCap,
    addMember,
    removeMember,
    removeSprint,
  };
}
