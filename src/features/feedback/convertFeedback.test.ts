import { describe, it, expect } from "vitest";
import { buildConvertArgs } from "./convertFeedback";

const base = { type: "Standard" as const, epicId: 1, parentTicketId: null };

describe("buildConvertArgs", () => {
  it("rejects a Bug without a parent", () => {
    expect(buildConvertArgs({ ...base, type: "Bug" }, 1)).toEqual({ error: "A bug needs a parent ticket" });
  });
  it("requires an epic", () => {
    expect(buildConvertArgs({ ...base, epicId: null }, null)).toEqual({ error: "Choose an epic" });
  });
  it("keeps the parent for a Standard ticket", () => {
    const r = buildConvertArgs({ ...base, parentTicketId: "p1" }, 1) as any;
    expect(r.args._parent_id).toBe("p1");
  });
  it("adopts the parent's epic when it differs", () => {
    const r = buildConvertArgs({ ...base, parentTicketId: "p1", epicId: 7 }, 1) as any;
    expect(r.args._epic_id).toBe(7);
  });
  it("never sends estimates or status", () => {
    const r = buildConvertArgs(base, 1) as any;
    expect(Object.keys(r.args).sort()).toEqual(["_epic_id", "_new_type", "_parent_id"]);
  });
});
