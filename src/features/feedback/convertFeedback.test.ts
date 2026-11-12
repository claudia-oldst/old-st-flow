import { describe, it, expect } from "vitest";
import { buildConvert, draftFromTicket } from "./convertFeedback";

const t: any = {
  id: "t1", title: "Fix login", epic_id: 1, status_id: "s1", version: "1.0",
  current_fe_estimate: 3, current_be_estimate: 0, current_project_estimate: 0,
  parent_ticket_id: null, parent: null,
  assignees: [{ user_id: "u1", slot: "FE" }],
};

describe("buildConvert", () => {
  it("unchanged row only changes the type", () => {
    const r = buildConvert(draftFromTicket(t), t) as any;
    expect(r.args._new_type).toBe("Standard");
    expect(r.patch).toEqual({});
    expect(r.addAssignees).toEqual([]);
    expect(r.removeAssignees).toEqual([]);
  });
  it("changed estimate sends only that field", () => {
    const r = buildConvert({ ...draftFromTicket(t), fe: "5" }, t) as any;
    expect(r.patch).toEqual({ current_fe_estimate: 5 });
  });
  it("rejects a Bug without a parent", () => {
    expect(buildConvert({ ...draftFromTicket(t), type: "Bug" }, t)).toEqual({ error: "A bug needs a parent ticket" });
  });
  it("requires an epic", () => {
    expect(buildConvert({ ...draftFromTicket(t), epicId: null }, t)).toEqual({ error: "Choose an epic" });
  });
  it("adopts a parent's epic", () => {
    const r = buildConvert({ ...draftFromTicket(t), parentTicketId: "p1", epicId: 7 }, t) as any;
    expect(r.args).toEqual({ _new_type: "Standard", _parent_id: "p1", _epic_id: 7 });
  });
});
