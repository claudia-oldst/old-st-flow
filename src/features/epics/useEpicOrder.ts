import { useMemo } from "react";
import { useProjectEpics } from "./useProjectEpics";

/** Map of epic id → display position for a project (PMBA-defined order). */
export function useEpicOrder(projectId: string | undefined): Map<number, number> {
  const { epics } = useProjectEpics(projectId);
  return useMemo(() => new Map(epics.map((e, i) => [e.id, i])), [epics]);
}

/** Position for an epic id; unknown/none sorts last. */
export function epicRank(order: Map<number, number>, id: number | null | undefined): number {
  if (id == null) return Number.MAX_SAFE_INTEGER;
  return order.get(id) ?? Number.MAX_SAFE_INTEGER - 1;
}
