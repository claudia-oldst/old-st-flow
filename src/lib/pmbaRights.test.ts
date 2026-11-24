import { describe, it, expect } from "vitest";
import { hasPmbaRights } from "@/lib/types";
describe("hasPmbaRights", () => {
  it("grants PMBA, Operations and Director", () => {
    for (const r of ["PMBA", "Operations", "Director"]) expect(hasPmbaRights(r)).toBe(true);
  });
  it("denies other roles", () => {
    for (const r of ["QA", "Frontend", "Backend", "Design", null]) expect(hasPmbaRights(r)).toBe(false);
  });
});
