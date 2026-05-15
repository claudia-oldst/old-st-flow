import type { TicketRow } from "@/features/tickets/useProjectTickets";

export const crEstimate = (t: Pick<TicketRow, "current_fe_estimate" | "current_be_estimate" | "current_project_estimate">): number =>
  (t.current_fe_estimate ?? 0) +
  (t.current_be_estimate ?? 0) +
  (t.current_project_estimate ?? 0);

export interface CRTotals {
  original: number;
  current: number;
  projected: number;
  actual: number;
}

export function computeCRTotals(
  baselineTickets: TicketRow[],
  allCRs: TicketRow[],
  discountHours = 0,
): CRTotals {
  const original = baselineTickets.reduce(
    (a, t) => a + t.original_fe_estimate + t.original_be_estimate + t.original_project_estimate,
    0,
  );
  const approvedDelta = allCRs
    .filter((c) => c.cr_approval === "approved")
    .reduce((a, c) => a + crEstimate(c), 0);
  const pendingDelta = allCRs
    .filter((c) => c.cr_approval === "pending")
    .reduce((a, c) => a + crEstimate(c), 0);
  const actual = baselineTickets
    .concat(allCRs.filter((c) => c.cr_approval === "approved"))
    .reduce(
      (a, t) => a + t.actual_frontend_hours + t.actual_backend_hours + t.actual_project_hours,
      0,
    );
  const d = Math.max(0, discountHours);
  return {
    original,
    current: Math.max(0, original + approvedDelta - d),
    projected: Math.max(0, original + approvedDelta + pendingDelta - d),
    actual: Math.max(0, actual - d),
  };
}

export function partitionCRs<T extends { cr_approval: string | null }>(crs: T[]) {
  return {
    approved: crs.filter((c) => c.cr_approval === "approved"),
    pending: crs.filter((c) => c.cr_approval === "pending"),
    rejected: crs.filter((c) => c.cr_approval === "rejected"),
  };
}
