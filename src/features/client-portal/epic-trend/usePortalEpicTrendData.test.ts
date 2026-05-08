import { describe, it, expect } from "vitest";
import { buildEpicTrendSeries, type TicketLite } from "./usePortalEpicTrendData";

const dayMs = 86_400_000;

const tk = (over: Partial<TicketLite> & { id: string; created_at: string }): TicketLite => ({
  epic_id: 1,
  ticket_type: "Standard",
  is_cr: false,
  cr_effective_at: null,
  cr_fe: 0,
  cr_be: 0,
  original_fe_estimate: 0,
  original_be_estimate: 0,
  ...over,
});

describe("buildEpicTrendSeries", () => {
  const projectStart = new Date(2024, 0, 1).toISOString();
  const cutoff = new Date(2024, 0, 11).getTime();

  it("returns empty when no tickets pass the filter", () => {
    const out = buildEpicTrendSeries({
      tickets: [],
      changes: [],
      logs: [],
      projectStart,
      cutoffMs: cutoff,
      ticketFilter: () => true,
    });
    expect(out).toEqual([]);
  });

  it("includes original estimate from ticket creation onward", () => {
    const tickets = [
      tk({
        id: "t1",
        created_at: new Date(2024, 0, 5).toISOString(),
        original_fe_estimate: 4,
        original_be_estimate: 6,
      }),
    ];
    const out = buildEpicTrendSeries({
      tickets,
      changes: [],
      logs: [],
      projectStart,
      cutoffMs: cutoff,
      ticketFilter: () => true,
    });
    // First sample is at start (Jan 1) — ticket not created yet → 0.
    expect(out[0].original).toBe(0);
    // Final sample is at cutoff — ticket exists → 10.
    expect(out[out.length - 1].original).toBe(10);
  });

  it("adds approved deltas to current and accumulates actuals from logs", () => {
    const tickets = [
      tk({
        id: "t1",
        created_at: new Date(2024, 0, 2).toISOString(),
        original_fe_estimate: 5,
      }),
    ];
    const out = buildEpicTrendSeries({
      tickets,
      changes: [
        { ticket_id: "t1", delta: 3, created_at: new Date(2024, 0, 6).toISOString() },
      ],
      logs: [
        { ticket_id: "t1", hours: 2, logged_at: new Date(2024, 0, 7).toISOString() },
      ],
      projectStart,
      cutoffMs: cutoff,
      ticketFilter: () => true,
    });
    const last = out[out.length - 1];
    expect(last.original).toBe(5);
    expect(last.current).toBe(8);
    expect(last.actual).toBe(2);
  });

  it("respects the ticket filter", () => {
    const tickets = [
      tk({ id: "a", created_at: new Date(2024, 0, 2).toISOString(), original_fe_estimate: 5 }),
      tk({ id: "b", created_at: new Date(2024, 0, 2).toISOString(), original_fe_estimate: 99 }),
    ];
    const out = buildEpicTrendSeries({
      tickets,
      changes: [],
      logs: [],
      projectStart,
      cutoffMs: cutoff,
      ticketFilter: (id) => id === "a",
    });
    expect(out[out.length - 1].original).toBe(5);
  });

  it("treats CR tickets via cr_effective_at + cr_fe/cr_be", () => {
    const tickets = [
      tk({
        id: "cr1",
        ticket_type: "CR",
        created_at: new Date(2024, 0, 2).toISOString(),
        is_cr: true,
        cr_effective_at: new Date(2024, 0, 8).toISOString(),
        cr_fe: 3,
        cr_be: 2,
      }),
    ];
    const out = buildEpicTrendSeries({
      tickets,
      changes: [],
      logs: [],
      projectStart,
      cutoffMs: cutoff,
      ticketFilter: () => true,
    });
    expect(out[out.length - 1].original).toBe(5);
    // Sample around day 4 (before cr_effective_at) should be 0
    const earlySample = out.find((s) => s._t! < new Date(2024, 0, 8).getTime());
    expect(earlySample?.original).toBe(0);
  });

  it("returns empty when cutoff is before start", () => {
    const out = buildEpicTrendSeries({
      tickets: [tk({ id: "t1", created_at: projectStart })],
      changes: [],
      logs: [],
      projectStart,
      cutoffMs: new Date(2023, 11, 1).getTime(),
      ticketFilter: () => true,
    });
    expect(out).toEqual([]);
  });

  void dayMs; // keep eslint happy
});
