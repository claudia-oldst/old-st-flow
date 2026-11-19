import { describe, it, expect } from "vitest";
import { buildConvert, draftFromTicket, planAll } from "./convertFeedback";

const t: any = {
  id: "t1", title: "Fix login", epic_id: 1, status_id: "s1", version: "1.0",
  current_fe_estimate: 3, current_be_estimate: 0, current_project_estimate: 0,
  parent_ticket_id: null, parent: null,
  assignees: [{ user_id: "u1", slot: "FE" }],
};
const withParent: any = { ...t, parent_ticket_id: "p1", parent: { title: "Login page" } };

describe("draftFromTicket", () => {
  it("defaults a feedback conversion to a Bug", () => {
    expect(draftFromTicket(t).type).toBe("Bug");
  });
});

describe("buildConvert", () => {
  it("unchanged row only changes the type", () => {
    const r = buildConvert(draftFromTicket(withParent), withParent) as any;
    expect(r.args._new_type).toBe("Bug");
    expect(r.args._parent_id).toBe("p1");
    expect(r.patch).toEqual({});
    expect(r.addAssignees).toEqual([]);
    expect(r.removeAssignees).toEqual([]);
  });
  it("changed estimate sends only that field", () => {
    const r = buildConvert({ ...draftFromTicket(withParent), fe: "5" }, withParent) as any;
    expect(r.patch).toEqual({ current_fe_estimate: 5 });
  });
  it("rejects a Bug without a parent", () => {
    expect(buildConvert(draftFromTicket(t), t)).toEqual({ error: "A bug needs a parent ticket" });
  });
  it("requires an epic", () => {
    expect(buildConvert({ ...draftFromTicket(withParent), epicId: null }, withParent)).toEqual({ error: "Choose an epic" });
  });
  it("adopts a parent's epic", () => {
    const r = buildConvert({ ...draftFromTicket(withParent), epicId: 7 }, withParent) as any;
    expect(r.args).toEqual({ _new_type: "Bug", _parent_id: "p1", _epic_id: 7 });
  });
});

describe("planAll (bulk convert)", () => {
  it("flags invalid rows without blocking valid ones", () => {
    const t2 = { ...withParent, id: "t2" };
    const r = planAll([draftFromTicket(withParent), { ...draftFromTicket(t2), epicId: null }], [withParent, t2]);
    expect(r[0].error).toBeNull();
    expect(r[0].plan).not.toBeNull();
    expect(r[1].error).toBe("Choose an epic");
  });
});
