import { describe, it, expect } from "vitest";
import {
  discountTotalsByDiscipline,
  discountTotalsByEpic,
  discountsBefore,
  sumTotals,
  type EpicDiscount,
} from "./applyDiscounts";

const d = (over: Partial<EpicDiscount> = {}): EpicDiscount => ({
  id: "d-1",
  project_id: "p-1",
  epic_id: 1,
  discipline: "FE",
  hours: 1,
  reason: "n/a",
  created_by: null,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
  ...over,
});

describe("discountTotalsByDiscipline", () => {
  it("returns zeros when empty", () => {
    expect(discountTotalsByDiscipline([])).toEqual({ FE: 0, BE: 0, Project: 0 });
  });

  it("sums hours per discipline", () => {
    const totals = discountTotalsByDiscipline([
      d({ discipline: "FE", hours: 2 }),
      d({ discipline: "FE", hours: 1.5 }),
      d({ discipline: "BE", hours: 3 }),
      d({ discipline: "Project", hours: 4 }),
    ]);
    expect(totals).toEqual({ FE: 3.5, BE: 3, Project: 4 });
  });

  it("coerces string hours via Number()", () => {
    const totals = discountTotalsByDiscipline([
      d({ discipline: "FE", hours: "2.5" as unknown as number }),
    ]);
    expect(totals.FE).toBe(2.5);
  });
});

describe("discountTotalsByEpic", () => {
  it("groups discounts by epic id", () => {
    const map = discountTotalsByEpic([
      d({ epic_id: 1, discipline: "FE", hours: 2 }),
      d({ epic_id: 1, discipline: "BE", hours: 3 }),
      d({ epic_id: 2, discipline: "FE", hours: 4 }),
    ]);
    expect(map.get(1)).toEqual({ FE: 2, BE: 3, Project: 0 });
    expect(map.get(2)).toEqual({ FE: 4, BE: 0, Project: 0 });
    expect(map.size).toBe(2);
  });
});

describe("sumTotals", () => {
  it("adds FE + BE + Project", () => {
    expect(sumTotals({ FE: 1, BE: 2, Project: 3 })).toBe(6);
  });
});

describe("discountsBefore", () => {
  it("includes rows with created_at at or before the cutoff", () => {
    const cutoff = new Date("2026-02-01T00:00:00Z").getTime();
    const list = [
      d({ id: "a", created_at: "2026-01-15T00:00:00Z" }),
      d({ id: "b", created_at: "2026-02-01T00:00:00Z" }),
      d({ id: "c", created_at: "2026-02-02T00:00:00Z" }),
    ];
    expect(discountsBefore(list, cutoff).map((r) => r.id)).toEqual(["a", "b"]);
  });
});
