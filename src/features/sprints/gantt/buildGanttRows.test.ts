import { describe, it, expect } from "vitest";
import { buildGanttRows } from "./buildGanttRows";

const sprints = [1, 2, 3, 4].map((n) => ({
  id: `s${n}`,
  start_date: `2026-0${n}-01`,
  end_date: `2026-0${n}-14`,
  sprint_number: n,
}));

describe("buildGanttRows", () => {
  it("shows every committed sprint and the planned sprint", () => {
    const rows = buildGanttRows(
      sprints,
      [{ id: "t1", epic_id: 1, fe_status: "todo", be_status: null, planned_sprint_fe_id: "s4" }],
      [
        { ticket_id: "t1", sprint_id: "s1", discipline: "FE" },
        { ticket_id: "t1", sprint_id: "s3", discipline: "FE" },
      ],
      [{ id: 1, epic_name: "Epic" }],
      "FE",
    );
    const segs = rows[0].segments;
    expect(segs.map((s) => s.sprintId).sort()).toEqual(["s1", "s3", "s4"]);
    expect(segs.reduce((a, s) => a + s.committed, 0)).toBe(2);
    expect(segs.reduce((a, s) => a + s.planned, 0)).toBe(1);
  });

  it("only the latest sprint shows status; earlier ones are carried", () => {
    const rows = buildGanttRows(
      sprints,
      [{ id: "t1", epic_id: 1, fe_status: "in_progress", be_status: null }],
      ["s2", "s3", "s4"].map((sprint_id) => ({ ticket_id: "t1", sprint_id, discipline: "FE" })),
      [{ id: 1, epic_name: "Epic" }],
      "FE",
    );
    const by = Object.fromEntries(rows[0].segments.map((s) => [s.sprintId, s]));
    expect(by.s2.past).toBe(1);
    expect(by.s2.in_progress).toBe(0);
    expect(by.s2.carriedTo).toEqual({ S4: 1 });
    expect(by.s3.past).toBe(1);
    expect(by.s4.in_progress).toBe(1);
    expect(by.s4.past).toBe(0);
  });
});
