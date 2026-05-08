import { describe, it, expect } from "vitest";
import { applyFilters, activeFilterCount, EMPTY_FILTERS } from "./applyFilters";
import { makeTicket, withFeAssignee, withBeAssignee } from "@/test/fixtures/tickets";

describe("applyFilters", () => {
  it("returns all when no filters active", () => {
    const tickets = [makeTicket(), makeTicket(), makeTicket()];
    expect(applyFilters(tickets, EMPTY_FILTERS)).toHaveLength(3);
    expect(activeFilterCount(EMPTY_FILTERS)).toBe(0);
  });

  it("filters by epic id including the _none bucket", () => {
    const tickets = [
      makeTicket({ epic_id: 1 }),
      makeTicket({ epic_id: 2 }),
      makeTicket({ epic_id: null }),
    ];
    expect(applyFilters(tickets, { ...EMPTY_FILTERS, epicIds: ["1"] })).toHaveLength(1);
    expect(applyFilters(tickets, { ...EMPTY_FILTERS, epicIds: ["_none"] })).toHaveLength(1);
    expect(applyFilters(tickets, { ...EMPTY_FILTERS, epicIds: ["1", "2"] })).toHaveLength(2);
  });

  it("filters by version (none when blank)", () => {
    const tickets = [
      makeTicket({ version: "v1" }),
      makeTicket({ version: " " }),
      makeTicket({ version: null }),
    ];
    expect(applyFilters(tickets, { ...EMPTY_FILTERS, versions: ["v1"] })).toHaveLength(1);
    expect(applyFilters(tickets, { ...EMPTY_FILTERS, versions: ["_none"] })).toHaveLength(2);
  });

  it("filters by FE status only when an FE assignee exists", () => {
    const tickets = [
      withFeAssignee(makeTicket({ fe_status: "in_progress" })),
      makeTicket({ fe_status: "in_progress" }), // no FE assignee → excluded
    ];
    const out = applyFilters(tickets, { ...EMPTY_FILTERS, feStatuses: ["in_progress"] });
    expect(out).toHaveLength(1);
  });

  it("filters by assignee user id, including _unassigned", () => {
    const tickets = [
      withFeAssignee(makeTicket(), "u-1"),
      withBeAssignee(makeTicket(), "u-2"),
      makeTicket(), // unassigned
    ];
    expect(applyFilters(tickets, { ...EMPTY_FILTERS, assigneeIds: ["u-1"] })).toHaveLength(1);
    expect(
      applyFilters(tickets, { ...EMPTY_FILTERS, assigneeIds: ["_unassigned"] }),
    ).toHaveLength(1);
    expect(
      applyFilters(tickets, { ...EMPTY_FILTERS, assigneeIds: ["u-1", "u-2"] }),
    ).toHaveLength(2);
  });

  it("filters by ticket type", () => {
    const tickets = [
      makeTicket({ ticket_type: "Bug" }),
      makeTicket({ ticket_type: "Standard" }),
    ];
    expect(applyFilters(tickets, { ...EMPTY_FILTERS, types: ["Bug"] })).toHaveLength(1);
  });

  it("filters by health buckets", () => {
    const tickets = [
      withFeAssignee(
        makeTicket({ current_fe_estimate: 10, actual_frontend_hours: 12 }),
      ), // bad
      withFeAssignee(
        makeTicket({ current_fe_estimate: 10, actual_frontend_hours: 1 }),
      ), // good
    ];
    expect(applyFilters(tickets, { ...EMPTY_FILTERS, health: ["bad"] })).toHaveLength(1);
    expect(applyFilters(tickets, { ...EMPTY_FILTERS, health: ["good"] })).toHaveLength(1);
    expect(applyFilters(tickets, { ...EMPTY_FILTERS, health: ["warn"] })).toHaveLength(0);
  });

  it("combines multiple filter dimensions (AND across dims, OR within)", () => {
    const tickets = [
      withFeAssignee(makeTicket({ ticket_type: "Bug", epic_id: 1 }), "u-1"),
      withFeAssignee(makeTicket({ ticket_type: "Bug", epic_id: 2 }), "u-1"),
      withFeAssignee(makeTicket({ ticket_type: "Standard", epic_id: 1 }), "u-1"),
    ];
    const out = applyFilters(tickets, {
      ...EMPTY_FILTERS,
      types: ["Bug"],
      epicIds: ["1"],
    });
    expect(out).toHaveLength(1);
  });
});
