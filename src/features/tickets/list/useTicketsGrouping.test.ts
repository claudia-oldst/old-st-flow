import { renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { makeTicket } from "@/test/fixtures/tickets";
import type { Status } from "@/lib/types";
import { useTicketsGrouping } from "./useTicketsGrouping";

describe("Feedback grouping", () => {
  it("groups Feedback by existing overall statuses, keeping tickets without a status", () => {
    const statuses: Status[] = [
      { id: "s-todo", name: "Backlog", category: "backlog", color: "", position: 0, created_at: "", updated_at: "" },
      { id: "s-review", name: "Review", category: "active", color: "", position: 1, created_at: "", updated_at: "" },
    ];
    const backlog = makeTicket({ ticket_type: "Feedback", status_id: "s-todo" });
    const review = makeTicket({ ticket_type: "Feedback", status_id: "s-review" });
    const unset = makeTicket({ ticket_type: "Feedback", status_id: null });
    const { result } = renderHook(() => useTicketsGrouping({ tickets: [review, backlog, unset], statuses, groupBy: "status" }));
    expect(result.current.map((g) => [g.key, g.tickets.map((t) => t.id)])).toEqual([
      ["s-todo", [backlog.id]], ["s-review", [review.id]], ["_none", [unset.id]],
    ]);
  });
});