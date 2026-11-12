import { describe, it, expect } from "vitest";
import { filterMembers, matchesMember } from "./memberSearch";

const mk = (id: string, name: string, role: string, email = "") =>
  ({ user_id: id, role, member: { name, email } }) as any;
const list = [mk("1", "Claudia Smith", "PMBA", "claudia@old.st"), mk("2", "Bongani Dube", "Frontend", "bd@old.st")];

describe("member search", () => {
  it("matches name case-insensitively", () => expect(matchesMember(list[0], "CLAU")).toBe(true));
  it("matches email", () => expect(matchesMember(list[1], "bd@")).toBe(true));
  it("matches role", () => expect(filterMembers(list, "front", new Set()).map((m) => m.user_id)).toEqual(["2"]));
  it("keeps selected people even when not matching", () =>
    expect(filterMembers(list, "bongani", new Set(["1"])).map((m) => m.user_id)).toEqual(["1", "2"]));
});
