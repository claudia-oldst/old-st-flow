import { useMemo } from "react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { AssigneeSlot } from "@/lib/types";
import type { Sprint, SprintMember } from "../types";
import { memberDisciplines } from "../types";
import { useSprintCapacities } from "../useSprintBoard";

/**
 * Capacity data and mutations for a single sprint block row.
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

  const stackMembers = useMemo(
    () =>
      addedMembers.map((m) => ({
        id: m.user_id,
        name: m.member.name,
        avatar_color: m.member.avatar_color,
      })),
    [addedMembers],
  );

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["sprint_capacities", sprint.id] });
    qc.invalidateQueries({ queryKey: ["project_sprint_capacities", projectId] });
  };

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

  const removeSprint = async (committedCount: number) => {
    if (committedCount > 0) {
      toast.error(`Sprint ${sprint.sprint_number} has ${committedCount} committed ticket${committedCount === 1 ? "" : "s"}. Set them to None on the Roadmap first.`);
      return;
    }
    if (!confirm(`Delete Sprint ${sprint.sprint_number}? Planned tickets go back to not planned.`)) return;
    for (const c of ["planned_sprint_fe_id", "planned_sprint_be_id"] as const) {
      const { error: pe } = await supabase.from("tickets").update({ [c]: null } as never).eq(c, sprint.id);
      if (pe) return toast.error(pe.message);
    }
    const { error } = await supabase.from("sprints").delete().eq("id", sprint.id);
    if (error) toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["sprints", sprint.project_id] });
    qc.invalidateQueries({ queryKey: ["planned_sprint_assignments", projectId] });
  };

  return {
    capFor,
    addedMembers,
    availableMembers,
    stackMembers,
    updateCap,
    addMember,
    removeMember,
    removeSprint,
  };
}
