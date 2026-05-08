import { describe, it, expect } from "vitest";
import { buildChangeRequestGroups } from "./buildChangeRequestGroups";
import type { ChangeRow } from "../useAllEstimateChanges";

function makeChange(over: Partial<ChangeRow> & { ticket: ChangeRow["ticket"] }): ChangeRow {
  return {
    id: over.id ?? Math.random().toString(36).slice(2),
    ticket_id: over.ticket.id,
    user_id: "u-1",
    discipline: "FE",
    previous_hours: 0,
    new_hours: 0,
    delta: 1,
    reason: null,
    status: "pending",
    decided_by: null,
    decided_at: null,
    created_at: new Date(2024, 0, 1).toISOString(),
    requester: null,
    ...over,
  };
}

const baseTicket = (id: string, epic_id: number | null, project_id = "p-1"): ChangeRow["ticket"] => ({
  id,
  formatted_id: `OLD-${id}`,
  title: `Ticket ${id}`,
  project_id,
  epic_id,
  original_fe_estimate: 0,
  original_be_estimate: 0,
  original_project_estimate: 0,
  current_fe_estimate: 0,
  current_be_estimate: 0,
  current_project_estimate: 0,
  actual_frontend_hours: 0,
  actual_backend_hours: 0,
  actual_project_hours: 0,
});

describe("buildChangeRequestGroups", () => {
  const projects = [{ id: "p-1", acronym: "OLD" }];
  const epics = [
    { id: 10, epic_name: "Epic A" },
    { id: 20, epic_name: "Epic B" },
  ];

  it("returns empty array for no input", () => {
    expect(
      buildChangeRequestGroups({ matching: [], projectChanges: [], projects, epics }),
    ).toEqual([]);
  });

  it("groups by epic id and uses No epic for null", () => {
    const t1 = baseTicket("t1", 10);
    const t2 = baseTicket("t2", 10);
    const t3 = baseTicket("t3", null);
    const out = buildChangeRequestGroups({
      matching: [
        makeChange({ ticket: t1, created_at: "2024-01-01T00:00:00Z" }),
        makeChange({ ticket: t2, created_at: "2024-01-02T00:00:00Z" }),
        makeChange({ ticket: t3, created_at: "2024-01-03T00:00:00Z" }),
      ],
      projectChanges: [],
      projects,
      epics,
    });
    expect(out).toHaveLength(2);
    // Sorted by latest change desc → No epic group (t3 → 2024-01-03) first
    expect(out[0].epicName).toBe("No epic");
    expect(out[1].epicName).toBe("Epic A");
    expect(out[1].tickets).toHaveLength(2);
  });

  it("attaches approved project changes per ticket", () => {
    const t1 = baseTicket("t1", 10);
    const out = buildChangeRequestGroups({
      matching: [makeChange({ ticket: t1 })],
      projectChanges: [
        makeChange({ ticket: t1, status: "approved", id: "approved-1" }),
        makeChange({ ticket: t1, status: "pending", id: "pending-skip" }),
      ],
      projects,
      epics,
    });
    expect(out[0].approvedChanges.map((c) => c.id)).toEqual(["approved-1"]);
  });

  it("falls back to a placeholder epic name when not in the epic map", () => {
    const t = baseTicket("t1", 99);
    const out = buildChangeRequestGroups({
      matching: [makeChange({ ticket: t })],
      projectChanges: [],
      projects,
      epics,
    });
    expect(out[0].epicName).toBe("Epic 99");
  });
});
