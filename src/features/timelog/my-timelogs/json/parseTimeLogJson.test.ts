import { describe, it, expect } from "vitest";
import { parseTimeLogJson, matchProject, matchTicket } from "./parseTimeLogJson";

const projects = [
  { id: "1", name: "Project Cousteau", acronym: "COU" },
  { id: "2", name: "Old St Internal", acronym: "OSI" },
  { id: "3", name: "Project Amber", acronym: "AMB" },
];

describe("parseTimeLogJson", () => {
  it("reads the example fields", () => {
    const r = parseTimeLogJson('[{"Project":"Cousteau","reason":"Standup","date":"2026-11-26","time (h)":1,"time (m)":8}]');
    if (!r.ok) throw new Error();
    expect(r.drafts[0]).toMatchObject({ project: "Cousteau", note: "Standup", durH: "1", durM: "8" });
    expect(r.drafts[0].date?.getDate()).toBe(26);
  });
  it("infers duration from start and end time", () => {
    const r = parseTimeLogJson('{"start time":"09:00","end time":"10:30"}');
    if (!r.ok) throw new Error();
    expect(r.drafts[0]).toMatchObject({ startTime: "09:00", durH: "1", durM: "30" });
  });
  it("makes one row per ticket", () => {
    const r = parseTimeLogJson('{"tickets":["COU-1","COU-2"]}');
    if (!r.ok) throw new Error();
    expect(r.drafts.map((d) => d.ticket)).toEqual(["COU-1", "COU-2"]);
  });
  it("leaves skipped fields blank instead of failing", () => {
    const r = parseTimeLogJson("[{}]");
    expect(r.ok && r.drafts[0].project).toBeUndefined();
  });
  it("rejects invalid JSON", () => {
    expect(parseTimeLogJson("{").ok).toBe(false);
  });
});

describe("matchProject", () => {
  it("Cousteau matches Project Cousteau", () => expect(matchProject("Cousteau", projects)?.id).toBe("1"));
  it("matches acronym", () => expect(matchProject("amb", projects)?.id).toBe("3"));
  it("matches reordered words", () => expect(matchProject("Internal Old St", projects)?.id).toBe("2"));
  it("no match stays blank", () => expect(matchProject("Ceiba", projects)).toBeNull());
});

describe("matchTicket", () => {
  it("matches padded ids", () =>
    expect(matchTicket("cou-34", [{ formatted_id: "COU-034", title: "x" }])?.formatted_id).toBe("COU-034"));
});
