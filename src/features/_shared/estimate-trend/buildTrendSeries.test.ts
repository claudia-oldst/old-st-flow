import { describe, it, expect } from "vitest";
import { buildTrendSeries } from "./buildTrendSeries";
import type { TicketLite } from "./types";

const tk = (over: Partial<TicketLite> & { id: string; created_at: string }): TicketLite => ({
  epic_id: 1,
  ticket_type: "Standard",
  is_cr: false,
  cr_effective_at: null,
  original_fe_estimate: 0,
  original_be_estimate: 0,
  ...over,
});

const projectStart = new Date(2024, 0, 1).toISOString();
const cutoff = new Date(2024, 0, 11).getTime();

describe("buildTrendSeries", () => {
  it("returns empty when no tickets pass the filter", () => {
    expect(
      buildTrendSeries({
        tickets: [],
        changes: [],
        logs: [],
        projectStart,
        cutoffMs: cutoff,
        ticketFilter: () => true,
      }),
    ).toEqual([]);
  });

  it("folds non-CR original estimate in at created_at and accumulates actuals", () => {
    const tickets = [
      tk({
        id: "t1",
        created_at: new Date(2024, 0, 5).toISOString(),
        original_fe_estimate: 4,
        original_be_estimate: 6,
      }),
    ];
    const out = buildTrendSeries({
      tickets,
      changes: [],
      logs: [
        { ticket_id: "t1", hours: 3, logged_at: new Date(2024, 0, 7).toISOString() },
      ],
      projectStart,
      cutoffMs: cutoff,
      ticketFilter: () => true,
    });
    expect(out[0].original).toBe(0); // before ticket creation
    expect(out[out.length - 1].original).toBe(10);
    expect(out[out.length - 1].actual).toBe(3);
  });

  it("approved CR with cr_effective_at strictly between start and cutoff folds in on that day", () => {
    const decided = new Date(2024, 0, 6).toISOString();
    const tickets = [
      tk({
        id: "cr1",
        ticket_type: "CR",
        created_at: new Date(2024, 0, 2).toISOString(),
        is_cr: true,
        cr_effective_at: decided,
        original_fe_estimate: 3,
        original_be_estimate: 2,
      }),
    ];
    const out = buildTrendSeries({
      tickets,
      changes: [],
      logs: [],
      projectStart,
      cutoffMs: cutoff,
      ticketFilter: () => true,
    });
    const decidedMs = new Date(decided).getTime();
    const before = out.filter((b) => (b._t ?? 0) < decidedMs);
    const afterOrEqual = out.filter((b) => (b._t ?? 0) >= decidedMs);
    expect(before.every((b) => b.original === 0)).toBe(true);
    expect(afterOrEqual.every((b) => b.original === 5)).toBe(true);
  });

  it("approved CR with no cr_effective_at falls back to created_at", () => {
    const created = new Date(2024, 0, 4).toISOString();
    const tickets = [
      tk({
        id: "cr2",
        ticket_type: "CR",
        created_at: created,
        is_cr: true,
        cr_effective_at: null,
        original_fe_estimate: 7,
      }),
    ];
    const out = buildTrendSeries({
      tickets,
      changes: [],
      logs: [],
      projectStart,
      cutoffMs: cutoff,
      ticketFilter: () => true,
    });
    expect(out[out.length - 1].original).toBe(7);
  });

  it("excludes tickets the filter rejects (neither original nor logs contribute)", () => {
    const tickets = [
      tk({ id: "a", created_at: new Date(2024, 0, 2).toISOString(), original_fe_estimate: 5 }),
      tk({ id: "b", created_at: new Date(2024, 0, 2).toISOString(), original_fe_estimate: 99 }),
    ];
    const out = buildTrendSeries({
      tickets,
      changes: [],
      logs: [
        { ticket_id: "b", hours: 50, logged_at: new Date(2024, 0, 3).toISOString() },
      ],
      projectStart,
      cutoffMs: cutoff,
      ticketFilter: (id) => id === "a",
    });
    const last = out[out.length - 1];
    expect(last.original).toBe(5);
    expect(last.actual).toBe(0);
  });

  it("adds approved deltas to current and clamps actuals-minus-discounts at 0", () => {
    const tickets = [
      tk({
        id: "t1",
        created_at: new Date(2024, 0, 2).toISOString(),
        original_fe_estimate: 5,
      }),
    ];
    const out = buildTrendSeries({
      tickets,
      changes: [
        { ticket_id: "t1", delta: 3, created_at: new Date(2024, 0, 6).toISOString() },
      ],
      logs: [
        { ticket_id: "t1", hours: 2, logged_at: new Date(2024, 0, 7).toISOString() },
      ],
      discounts: [
        { hours: 100, created_at: new Date(2024, 0, 3).toISOString() },
      ],
      projectStart,
      cutoffMs: cutoff,
      ticketFilter: () => true,
    });
    const last = out[out.length - 1];
    expect(last.original).toBe(5);
    expect(last.current).toBe(0); // 5 + 3 − 100 clamped
    expect(last.actual).toBe(0);  // 2 − 100 clamped
  });

  it("returns empty when cutoff is before project start", () => {
    expect(
      buildTrendSeries({
        tickets: [tk({ id: "t1", created_at: projectStart })],
        changes: [],
        logs: [],
        projectStart,
        cutoffMs: new Date(2023, 11, 1).getTime(),
        ticketFilter: () => true,
      }),
    ).toEqual([]);
  });
});
