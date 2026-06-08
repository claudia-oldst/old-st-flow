import { describe, it, expect } from "vitest";
import { ticketInputSchema, MAX_TICKET_TITLE, MAX_TICKET_HOURS } from "./ticket";

const base = { title: "Fix bug", ticket_type: "Bug" as const, epic_id: 1 };

describe("ticketInputSchema", () => {
  it("accepts a minimal ticket", () => {
    expect(ticketInputSchema.safeParse(base).success).toBe(true);
  });

  it("rejects ticket without epic_id", () => {
    expect(
      ticketInputSchema.safeParse({ title: "x", ticket_type: "Bug" as const }).success,
    ).toBe(false);
  });

  it("rejects empty title", () => {
    expect(ticketInputSchema.safeParse({ ...base, title: "  " }).success).toBe(false);
  });

  it("rejects title over max", () => {
    expect(
      ticketInputSchema.safeParse({ ...base, title: "x".repeat(MAX_TICKET_TITLE + 1) }).success,
    ).toBe(false);
  });

  it("rejects negative estimates", () => {
    expect(ticketInputSchema.safeParse({ ...base, fe_estimate: -1 }).success).toBe(false);
  });

  it("rejects estimates over the cap", () => {
    expect(
      ticketInputSchema.safeParse({ ...base, fe_estimate: MAX_TICKET_HOURS + 1 }).success,
    ).toBe(false);
  });

  it("rejects unknown ticket_type", () => {
    expect(
      ticketInputSchema.safeParse({ title: "x", ticket_type: "Other" as never, epic_id: 1 }).success,
    ).toBe(false);
  });
});
