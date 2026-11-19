import { describe, it, expect } from "vitest";
import { aggregateLogs, localLogDate, type ExportLog } from "./teamTimeExport";

const log = (o: Partial<ExportLog>): ExportLog => ({
  hours: 1, logged_at: "2026-11-10T10:00:00Z", logged_tz_offset: 120,
  user: { name: "Ann", email: "ann@old.st" },
  ticket: { formatted_id: "COU-001", title: "Login", ticket_type: "Standard", project: { name: "Cousteau" } },
  ...o,
});

describe("team time export", () => {
  it("uses the logger's local day", () => {
    expect(localLogDate("2026-11-09T23:30:00Z", 120)).toBe("2026-11-10");
    expect(localLogDate("2026-11-09T23:30:00Z", null)).toBe("2026-11-09");
  });
  it("includes logs on the end date late at night local time, excludes next day", () => {
    const rows = aggregateLogs([
      log({ logged_at: "2026-11-30T21:59:00Z" }), // 23:59 SAST Nov 30
      log({ logged_at: "2026-11-30T22:01:00Z" }), // 00:01 SAST Dec 1
    ], "2026-11-01", "2026-11-30");
    expect(rows[0].hours).toBe(1);
  });
  it("sums per person, project and ticket and skips Feedback", () => {
    const rows = aggregateLogs([
      log({ hours: 1.5 }), log({ hours: 2 }),
      log({ ticket: { formatted_id: "FB-1", title: "x", ticket_type: "Feedback", project: { name: "Cousteau" } } }),
    ], "2026-11-01", "2026-11-30");
    expect(rows).toEqual([{ project: "Cousteau", ticket: "COU-001 - Login", name: "Ann", email: "ann@old.st", hours: 3.5 }]);
  });
});
