import { describe, expect, it } from "vitest";
import { computeFacts, pickTopEpics } from "../../../../supabase/functions/_shared/clientEmail";

const log = (epic_id: number | null, hours: number, ticket_type = "Standard") =>
  ({ epic_id, hours, ticket_type, note: null, ticket_title: "t" });

describe("client email figures", () => {
  it("ignores epics under 5% of the month", () => {
    const top = pickTopEpics([{ id: 1, name: "A", hours: 96 }, { id: 2, name: "B", hours: 4 }], 100);
    expect(top.map((e) => e.name)).toEqual(["A"]);
  });
  it("lists at most 8 epics, biggest first", () => {
    const epics = [16, 14, 13, 12, 11, 10, 9, 8, 7].map((h, i) => ({ id: i, name: `E${i}`, hours: h }));
    expect(pickTopEpics(epics, 100).map((e) => e.hours)).toEqual([16, 14, 13, 12, 11, 10, 9, 8]);
  });
  it("amount owed is (hours − discounts) × rate, and bug/CR hours are split out", () => {
    const f = computeFacts(
      [log(1, 10), log(1, 5, "Bug"), log(2, 5, "CR")],
      [{ epic_id: 1, hours: 2, reason: "rework" }],
      new Map([[1, "Alpha"], [2, "Beta"]]),
      50,
    );
    expect(f.totalHours).toBe(20);
    expect(f.bugHours).toBe(5);
    expect(f.crHours).toBe(5);
    expect(f.amountOwed).toBe(900);
    expect(f.discounts).toEqual([{ epic: "Alpha", hours: 2, reasons: ["rework"] }]);
  });
});
