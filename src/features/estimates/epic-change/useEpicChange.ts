import type { ChangeRow } from "../useAllEstimateChanges";

export interface EpicChangeTicket {
  original_fe_estimate: number;
  original_be_estimate: number;
  original_project_estimate: number;
  current_fe_estimate: number;
  current_be_estimate: number;
  current_project_estimate: number;
  actual_frontend_hours: number;
  actual_backend_hours: number;
  actual_project_hours: number;
}

export interface EpicChangeTotals {
  original: number;
  currentApproved: number;
  actual: number;
  projected: number;
}

export function computeEpicTotals(
  tickets: EpicChangeTicket[],
  matchedChanges: Pick<ChangeRow, "delta" | "status">[],
  discountHours = 0,
): EpicChangeTotals {
  const original = tickets.reduce(
    (a, t) => a + t.original_fe_estimate + t.original_be_estimate + t.original_project_estimate,
    0,
  );
  const currentApproved = tickets.reduce(
    (a, t) => a + t.current_fe_estimate + t.current_be_estimate + t.current_project_estimate,
    0,
  );
  const actual = tickets.reduce(
    (a, t) => a + t.actual_frontend_hours + t.actual_backend_hours + t.actual_project_hours,
    0,
  );
  // Approved deltas are already baked into current_*_estimate. Only pending
  // deltas should be added on top to project "if all approved".
  const pendingDelta = matchedChanges
    .filter((c) => c.status === "pending")
    .reduce((a, c) => a + (Number(c.delta) || 0), 0);
  const d = Math.max(0, discountHours);
  return {
    original,
    currentApproved: Math.max(0, currentApproved - d),
    actual: Math.max(0, actual - d),
    projected: Math.max(0, currentApproved + pendingDelta - d),
  };
}

export function resolveChartRange(
  range: { from: Date; to: Date } | undefined,
  events: Pick<ChangeRow, "created_at">[],
): { start: number; end: number } {
  let start: number;
  let end: number;
  if (range) {
    start = range.from.getTime();
    end = range.to.getTime();
  } else {
    const ts = events
      .map((c) => new Date(c.created_at).getTime())
      .filter((n) => !Number.isNaN(n))
      .sort((a, b) => a - b);
    start = ts[0] ?? Date.now() - 86_400_000 * 7;
    end = Date.now();
  }
  if (end <= start) end = start + 86_400_000;
  return { start, end };
}
