import { describe, it, expect } from "vitest";
import { monthRange, defaultMonths, buildRows, totalRow, type BillingPayload } from "./buildBilling";

const payload: BillingPayload = {
  project: { id: "p", name: "Amber", rate_per_hour: 48, start_date: "2026-04-10", cutoff: "2026-09-30T22:59:59Z" },
  epics: [
    { id: 1, epic_name: "Auth", original_std: 10, original_cr: 2, original_bug: 1, revised: 15 },
    { id: 2, epic_name: "Cart", original_std: 5, original_cr: null, original_bug: null, revised: 6 },
  ],
  logs: [
    { epic_id: 1, month: "2026-04", hours: 3 },
    { epic_id: 1, month: "2026-09", hours: 2 },
    { epic_id: 2, month: "2026-09", hours: 4 },
  ],
};

describe("billing", () => {
  it("lists months from project start to cutoff", () => {
    expect(monthRange("2026-04-10", "2026-09-30T22:59:59Z")).toEqual([
      "2026-04", "2026-05", "2026-06", "2026-07", "2026-08", "2026-09",
    ]);
  });
  it("defaults to the latest 5 months", () => {
    expect(defaultMonths(monthRange("2026-04-10", "2026-09-30T12:00:00Z"))).toEqual([
      "2026-05", "2026-06", "2026-07", "2026-08", "2026-09",
    ]);
  });
  it("total original is std + CR + bugs", () => {
    expect(buildRows(payload)[0].original).toBe(13);
  });
  it("actual total covers every month, not just selected", () => {
    expect(buildRows(payload)[0].actual).toBe(5);
  });
  it("totals sum across epics", () => {
    const t = totalRow(buildRows(payload));
    expect(t.original).toBe(18);
    expect(t.months["2026-09"]).toBe(6);
    expect(t.actual).toBe(9);
  });
});
