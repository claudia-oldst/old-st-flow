import { describe, expect, it } from "vitest";
import { cellState, defaultWorkingSprint, planCell, type Commitment } from "./cellRules";
import { sprintTotals } from "./sprintTotals";

const S5 = { id: "s5", sprint_number: 5, start_date: "2026-11-02", end_date: "2026-11-15" };
const S6 = { id: "s6", sprint_number: 6, start_date: "2026-11-16", end_date: "2026-11-29" };
const S7 = { id: "s7", sprint_number: 7, start_date: "2026-11-30", end_date: "2026-12-13" };
const sprints = [S5, S6, S7];
const today = "2026-11-20";
const base = { ticketId: "t1", discipline: "FE" as const, sprints, today };
const c = (sprint_id: string, unplanned = false): Commitment => ({ id: `c-${sprint_id}`, sprint_id, ticket_id: "t1", discipline: "FE", unplanned });

describe("sprint cell rules", () => {
  it("an empty cell becomes Planned and moves the planned sprint", () => {
    const p = planCell({ ...base, sprint: S7, plannedId: "s6", commitments: [] }, "planned");
    expect(p.planned).toBe("s7");
    expect(p.add).toBeNull();
  });

  it("committing a planned ticket is not unplanned", () => {
    const p = planCell({ ...base, sprint: S6, plannedId: "s6", commitments: [] }, "committed");
    expect(p.add?.unplanned).toBe(false);
    expect(p.planned).toBeUndefined();
  });

  it("committing an unplanned ticket flags it and sets planned to that sprint", () => {
    const p = planCell({ ...base, sprint: S6, plannedId: null, commitments: [] }, "committed");
    expect(p.add?.unplanned).toBe(true);
    expect(p.planned).toBe("s6");
  });

  it("committing in an open sprint removes commitments in other open sprints only", () => {
    const p = planCell({ ...base, sprint: S6, plannedId: "s7", commitments: [c("s5"), c("s7")] }, "committed");
    expect(p.remove.map((r) => r.sprint_id)).toEqual(["s7"]);
  });

  it("editing a closed sprint never changes other sprints or the planned sprint", () => {
    const p = planCell({ ...base, sprint: S5, plannedId: "s6", commitments: [c("s6")] }, "committed");
    expect(p.remove).toEqual([]);
    expect(p.planned).toBeUndefined();
    expect(p.add?.sprint_id).toBe("s5");
  });

  it("None clears the commitment and planned sprint here", () => {
    const p = planCell({ ...base, sprint: S6, plannedId: "s6", commitments: [c("s6")] }, "none");
    expect(p.remove).toHaveLength(1);
    expect(p.planned).toBeNull();
  });

  it("reads cell state", () => {
    expect(cellState({ sprint: S6, plannedId: "s6", commitments: [] })).toBe("planned");
    expect(cellState({ sprint: S6, plannedId: null, commitments: [c("s6")] })).toBe("committed");
    expect(cellState({ sprint: S7, plannedId: "s6", commitments: [] })).toBe("none");
  });

  it("defaults the working sprint to the one covering today", () => {
    expect(defaultWorkingSprint(sprints, today)?.id).toBe("s6");
    expect(defaultWorkingSprint(sprints, "2026-10-01")?.id).toBe("s5");
  });
});

describe("sprint totals", () => {
  const t = { id: "t1", current_fe_estimate: 10, current_be_estimate: 4, actual_frontend_hours: 3, actual_backend_hours: 6, assignees: [{ user_id: "u1", slot: "FE" }] };
  it("uses remaining hours for open sprints and counts per developer", () => {
    const r = sprintTotals(S6, [t], [c("s6", true)], [{ ticket_id: "t1", planned_sprint_fe_id: "s6", planned_sprint_be_id: "s6" }], today);
    expect(r.sprint.FE.committed).toBe(7);
    expect(r.sprint.FE.unplanned).toBe(7);
    expect(r.sprint.FE.planned).toBe(0);
    expect(r.sprint.BE.planned).toBe(0);
    expect(r.perDev.get("u1")?.FE.committed).toBe(7);
  });
  it("uses the full estimate for closed sprints", () => {
    const r = sprintTotals(S5, [t], [c("s5")], [], today);
    expect(r.sprint.FE.committed).toBe(10);
  });
});
