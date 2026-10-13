import { describe, expect, it } from "vitest";
import { makeTicket } from "@/test/fixtures/tickets";
import { donenessHours } from "./doneness";

const statuses = [
  { id: "s-active", category: "active" },
  { id: "s-done", category: "done" },
] as any;

describe("donenessHours", () => {
  it("weights FE status by current FE estimate", () => {
    const tickets = [
      makeTicket({ fe_status: "in_progress", current_fe_estimate: 10 }),
      makeTicket({ fe_status: "done", current_fe_estimate: 5 }),
      makeTicket({ fe_status: "todo", current_fe_estimate: 3 }),
    ];
    expect(donenessHours(tickets, statuses, "FE", "current")).toEqual({
      todo: 3, in_progress: 10, for_integration: 0, done: 5,
    });
  });

  it("uses the original estimate for the original basis", () => {
    const tickets = [makeTicket({ be_status: "for_integration", original_be_estimate: 8, current_be_estimate: 12 })];
    expect(donenessHours(tickets, statuses, "BE", "original").for_integration).toBe(8);
  });

  it("maps Project tickets from their status category like the board", () => {
    const tickets = [makeTicket({ ticket_type: "Proj", status_id: "s-active", current_project_estimate: 20 })];
    expect(donenessHours(tickets, statuses, "Project", "current").in_progress).toBe(20);
  });

  it("leaves out unapproved CRs", () => {
    const tickets = [makeTicket({ ticket_type: "CR", cr_approval: "pending", fe_status: "done", current_fe_estimate: 9 })];
    expect(donenessHours(tickets, statuses, "FE", "current").done).toBe(0);
  });
});
