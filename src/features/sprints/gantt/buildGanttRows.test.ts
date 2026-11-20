import { describe, it, expect } from "vitest";
import { buildGanttRows } from "./buildGanttRows";

const sprints = [1, 2, 3, 4].map((n) => ({
  id: `s${n}`,
  start_date: `2026-0${n}-01`,
  end_date: `2026-0${n}-14`,
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
});
