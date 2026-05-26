import { describe, it, expect } from "vitest";
import { computeEpicTotals, resolveChartRange } from "./useEpicChange";

const ticket = (over: Partial<Parameters<typeof computeEpicTotals>[0][number]> = {}) => ({
  original_fe_estimate: 0,
  original_be_estimate: 0,
  original_project_estimate: 0,
  current_fe_estimate: 0,
  current_be_estimate: 0,
  current_project_estimate: 0,
  actual_frontend_hours: 0,
  actual_backend_hours: 0,
  actual_project_hours: 0,
  ...over,
});

describe("computeEpicTotals", () => {
  it("sums originals across disciplines and tickets", () => {
    const t = computeEpicTotals(
      [ticket({ original_fe_estimate: 2, original_be_estimate: 3, original_project_estimate: 1 }), ticket({ original_fe_estimate: 4 })],
      [],
    );
    expect(t.original).toBe(10);
  });

  it("sums currentApproved from current estimates", () => {
    const t = computeEpicTotals(
      [ticket({ current_fe_estimate: 5, current_be_estimate: 5 })],
      [],
    );
    expect(t.currentApproved).toBe(10);
  });

  it("sums actuals across all three discipline columns", () => {
    const t = computeEpicTotals(
      [ticket({ actual_frontend_hours: 1, actual_backend_hours: 2, actual_project_hours: 3 })],
      [],
    );
    expect(t.actual).toBe(6);
  });

  it("projected = currentApproved + pending delta (approved already baked into current)", () => {
    const t = computeEpicTotals(
      [ticket({ current_fe_estimate: 10 })],
      [
        { delta: 4, status: "pending" } as never,
        { delta: -1, status: "pending" } as never,
        { delta: 99, status: "approved" } as never, // ignored: already in current
      ],
    );
    expect(t.projected).toBe(13);
  });

  it("discount reduces currentApproved, actual and projected but not original", () => {
    const t = computeEpicTotals(
      [
        ticket({
          original_fe_estimate: 10,
          current_fe_estimate: 10,
          actual_frontend_hours: 8,
        }),
      ],
      [],
      3,
    );
    expect(t.original).toBe(10);
    expect(t.currentApproved).toBe(7);
    expect(t.actual).toBe(5);
    expect(t.projected).toBe(7);
  });

  it("clamps negative results to zero", () => {
    const t = computeEpicTotals(
      [ticket({ current_fe_estimate: 2, actual_frontend_hours: 1 })],
      [],
      99,
    );
    expect(t.currentApproved).toBe(0);
    expect(t.actual).toBe(0);
    expect(t.projected).toBe(0);
  });
});

describe("resolveChartRange", () => {
  it("uses explicit range when provided", () => {
    const from = new Date("2025-01-01");
    const to = new Date("2025-02-01");
    const { start, end } = resolveChartRange({ from, to }, []);
    expect(start).toBe(from.getTime());
    expect(end).toBe(to.getTime());
  });

  it("guarantees end > start", () => {
    const sameDate = new Date("2025-01-01");
    const { start, end } = resolveChartRange({ from: sameDate, to: sameDate }, []);
    expect(end).toBeGreaterThan(start);
  });

  it("defaults to ~7 days back when no events", () => {
    const { start, end } = resolveChartRange(undefined, []);
    expect(end - start).toBeGreaterThanOrEqual(86_400_000);
  });
});
