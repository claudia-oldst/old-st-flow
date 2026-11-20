import { describe, expect, it } from "vitest";
import { overlappingSprint } from "./EditSprintPopover";

const others = [{ sprint_number: 2, start_date: "2026-11-16", end_date: "2026-11-29" }];
describe("sprint date overlap", () => {
  it("blocks dates that overlap another sprint", () => {
    expect(overlappingSprint("2026-11-10", "2026-11-16", others)?.sprint_number).toBe(2);
  });
  it("allows dates that touch but don't overlap", () => {
    expect(overlappingSprint("2026-11-02", "2026-11-15", others)).toBeUndefined();
  });
});
