import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { formatSupabaseError } from "@/lib/formatSupabaseError";
import type { PlannedSprintAssignment } from "../useSprintBoard";
import type { SprintDiscipline } from "../types";
import type { CellPlan, Commitment } from "./cellRules";
import { isEmptyPlan } from "./cellRules";

export interface TicketPlan { ticketId: string; discipline: SprintDiscipline; plan: CellPlan }
type PlannedPatch = { ticketId: string; discipline: SprintDiscipline; value: string | null };

/** Only real columns — cached rows also carry a joined `sprint` object. */
const pickRow = (r: Partial<Commitment> & Omit<Commitment, "id">) => {
  const row: Record<string, unknown> = { sprint_id: r.sprint_id, ticket_id: r.ticket_id, discipline: r.discipline, unplanned: r.unplanned };
  if (r.id) row.id = r.id;
  const uid = (r as { assigned_user_id?: string | null }).assigned_user_id;
  if (uid) row.assigned_user_id = uid;
  return row;
};

const col = (d: SprintDiscipline) => (d === "FE" ? "planned_sprint_fe_id" : "planned_sprint_be_id");

/**
 * Applies sprint-cell plans with optimistic cache patches, then writes to the
 * database. Only sprint_tickets and tickets.planned_sprint_* change — never
 * assignees — so no Slack notification is triggered.
 */
export function useRoadmapMutations(projectId: string) {
  const qc = useQueryClient();
  const stKey = ["project_sprint_tickets", projectId];
  const plKey = ["planned_sprint_assignments", projectId];

  const patchCaches = useCallback(
    (removeIds: Set<string>, add: Commitment[], planned: PlannedPatch[]) => {
      qc.setQueryData<Commitment[]>(stKey, (prev = []) => [...prev.filter((c) => !removeIds.has(c.id)), ...add]);
      if (!planned.length) return;
      const byTicket = new Map<string, PlannedPatch[]>();
      planned.forEach((p) => byTicket.set(p.ticketId, [...(byTicket.get(p.ticketId) ?? []), p]));
      qc.setQueryData<PlannedSprintAssignment[]>(plKey, (prev = []) =>
        prev.map((row) => {
          const ps = byTicket.get(row.ticket_id);
          if (!ps) return row;
          const next = { ...row };
          ps.forEach((p) => { next[col(p.discipline)] = p.value; });
          return next;
        }),
      );
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [qc, projectId],
  );

  const write = useCallback(
    async (removeIds: string[], add: Omit<Commitment, "id">[] | Commitment[], planned: PlannedPatch[]) => {
      if (removeIds.length) {
        const { error } = await supabase.from("sprint_tickets").delete().in("id", removeIds);
        if (error) throw error;
      }
      let inserted: Commitment[] = [];
      if (add.length) {
        const { data, error } = await supabase
          .from("sprint_tickets")
          .upsert(add.map(pickRow) as never, { onConflict: "sprint_id,ticket_id,discipline" })
          .select("id, sprint_id, ticket_id, discipline, unplanned");
        if (error) throw error;
        inserted = (data ?? []) as Commitment[];
      }
      const groups = new Map<string, string[]>();
      planned.forEach((p) => {
        const k = `${p.discipline}|${p.value ?? ""}`;
        groups.set(k, [...(groups.get(k) ?? []), p.ticketId]);
      });
      for (const [k, ids] of groups) {
        const [d, v] = k.split("|") as [SprintDiscipline, string];
        const { error } = await supabase.from("tickets").update({ [col(d)]: v || null } as never).in("id", ids);
        if (error) throw error;
      }
      return inserted;
    },
    [],
  );

  /** Apply plans; returns true on success. Shows a toast with Undo. */
  const apply = useCallback(
    async (plans: TicketPlan[], message: string) => {
      const real = plans.filter((p) => !isEmptyPlan(p.plan));
      if (!real.length) return true;
      const prevPlanned = qc.getQueryData<PlannedSprintAssignment[]>(plKey) ?? [];
      const prevById = new Map(prevPlanned.map((r) => [r.ticket_id, r]));
      const removed = real.flatMap((p) => p.plan.remove);
      const adds = real.flatMap((p) => (p.plan.add ? [p.plan.add] : []));
      const temp = adds.map((a, i) => ({ ...a, id: `tmp-${Date.now()}-${i}` }));
      const planned: PlannedPatch[] = real
        .filter((p) => p.plan.planned !== undefined)
        .map((p) => ({ ticketId: p.ticketId, discipline: p.discipline, value: p.plan.planned ?? null }));
      const undoPlanned: PlannedPatch[] = planned.map((p) => ({
        ...p,
        value: prevById.get(p.ticketId)?.[col(p.discipline)] ?? null,
      }));

      patchCaches(new Set(removed.map((r) => r.id)), temp, planned);
      try {
        const inserted = await write(removed.map((r) => r.id), adds, planned);
        qc.setQueryData<Commitment[]>(stKey, (prev = []) => [
          ...prev.filter((c) => !temp.some((t) => t.id === c.id) && !inserted.some((i) => i.id === c.id)),
          ...inserted,
        ]);
        toast.success(message, {
          action: {
            label: "Undo",
            onClick: async () => {
              patchCaches(new Set(inserted.map((i) => i.id)), removed, undoPlanned);
              try {
                await write(inserted.map((i) => i.id), removed, undoPlanned);
              } catch (e) {
                toast.error(`Undo failed: ${formatSupabaseError(e as never)}`);
              }
              qc.invalidateQueries({ queryKey: stKey });
            },
          },
        });
        return true;
      } catch (e) {
        toast.error(formatSupabaseError(e as never));
        qc.invalidateQueries({ queryKey: stKey });
        qc.invalidateQueries({ queryKey: plKey });
        return false;
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [qc, projectId, patchCaches, write],
  );

  return { apply };
}
