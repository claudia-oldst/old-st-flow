import { describe, it, expect } from "vitest";
import { deriveStatusId } from "./evaluateRule";

const rules = [
  { fe_statuses: ["todo"], be_statuses: ["todo"], operator: "AND", status_id: "TO DO" },
  { fe_statuses: [], be_statuses: [], operator: "AND", status_id: "OTHER" },
] as never[];
const base = { isNew: true, fe: null, be: null, override: false, hasLogs: false };

describe("deriveStatusId", () => {
  it("new ticket with both sides blank goes to BACKLOG", () => {
    expect(deriveStatusId(rules, base, "BACKLOG")).toBe("BACKLOG");
  });
  it("assigning FE (fe becomes todo) follows the rules: todo + todo -> TO DO", () => {
    expect(deriveStatusId(rules, { ...base, isNew: false, fe: "todo" }, "BACKLOG")).toBe("TO DO");
  });
  it("removing the last assignee later does not go back to BACKLOG", () => {
    expect(deriveStatusId(rules, { ...base, isNew: false }, "BACKLOG")).toBe("TO DO");
  });
  it("a ticket with time logged never goes to BACKLOG", () => {
    expect(deriveStatusId(rules, { ...base, hasLogs: true }, "BACKLOG")).toBe("TO DO");
  });
  it("manual override keeps the current status", () => {
    expect(deriveStatusId(rules, { ...base, override: true }, "BACKLOG")).toBeNull();
  });
});
