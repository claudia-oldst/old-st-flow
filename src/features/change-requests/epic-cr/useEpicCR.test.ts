import { describe, it, expect } from "vitest";
import { crEstimate, computeCRTotals, partitionCRs } from "./useEpicCR";

const t = (over: Record<string, unknown> = {}) =>
  ({
    original_fe_estimate: 0,
    original_be_estimate: 0,
    original_project_estimate: 0,
    current_fe_estimate: 0,
    current_be_estimate: 0,
    current_project_estimate: 0,
    actual_frontend_hours: 0,
    actual_backend_hours: 0,
    actual_project_hours: 0,
    cr_approval: "pending",
    ...over,
  }) as never;

describe("crEstimate", () => {
  it("sums FE + BE + Project current estimates", () => {
    expect(
      crEstimate({ current_fe_estimate: 1, current_be_estimate: 2, current_project_estimate: 3 }),
    ).toBe(6);
  });

  it("treats nulls as zero", () => {
    expect(
      crEstimate({
        current_fe_estimate: null as never,
        current_be_estimate: 2,
        current_project_estimate: null as never,
      }),
    ).toBe(2);
  });
});

describe("computeCRTotals", () => {
  it("original ignores CRs", () => {
    const totals = computeCRTotals(
      [t({ original_fe_estimate: 5 })],
      [t({ cr_approval: "approved", current_fe_estimate: 99 })],
    );
    expect(totals.original).toBe(5);
  });

  it("current = original + approved CR estimates", () => {
    const totals = computeCRTotals(
      [t({ original_fe_estimate: 10 })],
      [
        t({ cr_approval: "approved", current_fe_estimate: 3 }),
        t({ cr_approval: "pending", current_fe_estimate: 100 }),
      ],
    );
    expect(totals.current).toBe(13);
  });

  it("projected adds pending on top of current", () => {
    const totals = computeCRTotals(
      [t({ original_fe_estimate: 10 })],
      [t({ cr_approval: "pending", current_fe_estimate: 4 })],
    );
    expect(totals.projected).toBe(14);
  });

  it("actual includes approved CR actual hours", () => {
    const totals = computeCRTotals(
      [t({ actual_frontend_hours: 2 })],
      [t({ cr_approval: "approved", actual_backend_hours: 3 })],
    );
    expect(totals.actual).toBe(5);
  });
});

describe("partitionCRs", () => {
  it("splits by cr_approval", () => {
    const p = partitionCRs([
      { cr_approval: "approved" },
      { cr_approval: "pending" },
      { cr_approval: "pending" },
      { cr_approval: "rejected" },
    ]);
    expect(p.approved).toHaveLength(1);
    expect(p.pending).toHaveLength(2);
    expect(p.rejected).toHaveLength(1);
  });
});
