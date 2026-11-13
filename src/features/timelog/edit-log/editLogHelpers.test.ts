import { describe, it, expect } from "vitest";
import { usedExcludingLog, allowedDisciplines } from "./editLogHelpers";

describe("usedExcludingLog", () => {
  const log = { ticketId: "a", discipline: "FE" as const, hours: 2 };
  it("excludes own hours when ticket and discipline unchanged", () => {
    expect(usedExcludingLog(5, log, { ticketId: "a", discipline: "FE" })).toBe(3);
  });
  it("counts full actual when moved to another ticket", () => {
    expect(usedExcludingLog(5, log, { ticketId: "b", discipline: "FE" })).toBe(5);
  });
  it("counts full actual when discipline changes", () => {
    expect(usedExcludingLog(5, log, { ticketId: "a", discipline: "BE" })).toBe(5);
  });
});

describe("allowedDisciplines", () => {
  it("Proj tickets only allow Project", () => {
    expect(allowedDisciplines({ ticket_type: "Proj", disciplines: ["FE"] }, "FE")).toEqual(["Project"]);
  });
  it("follows assignment", () => {
    expect(allowedDisciplines({ ticket_type: "Standard", disciplines: ["BE"] }, "FE")).toEqual(["BE"]);
  });
});
