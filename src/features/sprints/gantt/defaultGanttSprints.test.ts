import { describe, it, expect } from "vitest";
import { defaultGanttSprintIds } from "./defaultGanttSprints";

const mk = (n: number) => Array.from({ length: n }, (_, i) => ({
  id: `s${i + 1}`,
  start_date: `2026-${String(i + 1).padStart(2, "0")}-01`,
  end_date: `2026-${String(i + 1).padStart(2, "0")}-20`,
}));

describe("defaultGanttSprintIds", () => {
  it("puts the current sprint 5th of 6", () => {
    expect(defaultGanttSprintIds(mk(10), "2026-07-10")).toEqual(["s3", "s4", "s5", "s6", "s7", "s8"]);
  });
  it("shows the last 6 when current is the latest", () => {
    expect(defaultGanttSprintIds(mk(10), "2026-10-10")).toEqual(["s5", "s6", "s7", "s8", "s9", "s10"]);
  });
  it("shows the first 6 when current is early", () => {
    expect(defaultGanttSprintIds(mk(10), "2026-02-10")).toEqual(["s1", "s2", "s3", "s4", "s5", "s6"]);
  });
});
