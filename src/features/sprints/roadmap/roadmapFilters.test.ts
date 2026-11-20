import { describe, expect, it } from "vitest";
import { applyFilters, emptyFilters, isSplit, isUnfinished, type FilterCtx, type FilterTicket } from "./roadmapFilters";

const S5 = { id: "s5", sprint_number: 5, start_date: "2026-11-02", end_date: "2026-11-15" };
const S6 = { id: "s6", sprint_number: 6, start_date: "2026-11-16", end_date: "2026-11-29" };
const t = (o: Partial<FilterTicket> = {}): FilterTicket => ({
  id: "t1", ticket_type: "Standard", status_id: "st", epic_id: 1, fe_status: "in_progress", be_status: "todo",
  current_fe_estimate: 8, current_be_estimate: 4, assignees: [], ...o,
});
const ctx = (commits: Array<[string, string]>, planned: { fe: string | null; be: string | null } = { fe: null, be: null }): FilterCtx => ({
  working: S6, previous: S5,
  commitsByTicket: new Map([["t1", commits.map(([sprint_id, discipline], i) => ({ id: `c${i}`, sprint_id, ticket_id: "t1", discipline, unplanned: false }))]]),
  plannedByTicket: new Map([["t1", planned]]),
  devDoneStatusIds: new Set(["devdone"]),
});

describe("roadmap filters", () => {
  it("Unfinished from the previous sprint: committed in S5, not done, not in S6", () => {
    expect(isUnfinished(t(), ctx([["s5", "FE"]]))).toBe(true);
    expect(isUnfinished(t(), ctx([["s5", "FE"], ["s6", "FE"]]))).toBe(false);
    expect(isUnfinished(t({ fe_status: "done" }), ctx([["s5", "FE"]]))).toBe(false);
  });
  it("marks a ticket when only one discipline is in the working sprint", () => {
    expect(isSplit(t(), ctx([["s6", "FE"]]))).toBe(true);
    expect(isSplit(t({ current_be_estimate: 0 }), ctx([["s6", "FE"]]))).toBe(false);
    expect(isSplit(t(), ctx([["s6", "FE"]], { fe: null, be: "s6" }))).toBe(false);
  });
  it("shows Dev done and Proj tickets but always hides Feedback", () => {
    const rows = [t({ id: "a", status_id: "devdone" }), t({ id: "b", ticket_type: "Proj" }), t({ id: "c", ticket_type: "Feedback" }), t({ id: "d" })];
    expect(applyFilters(rows, emptyFilters, ctx([])).map((r) => r.id)).toEqual(["a", "b", "d"]);
  });
});
