import { describe, it, expect } from "vitest";
import { activeRows, isActiveMember } from "./activeMembers";

describe("active members", () => {
  it("excludes inactive people from pickers", () => {
    const rows = [{ member: { is_active: true } }, { member: { is_active: false } }, { member: null }];
    expect(activeRows(rows)).toHaveLength(1);
    expect(isActiveMember({ is_active: false })).toBe(false);
    expect(isActiveMember({})).toBe(true);
  });
});
