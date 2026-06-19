import { format } from "date-fns";
import type {
  ChangeLite,
  DiscountLite,
  LogLite,
  TicketLite,
  TrendBucket,
} from "./types";

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
function endOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

export interface BuildTrendInputs {
  tickets: TicketLite[];
  changes: ChangeLite[];
  logs: LogLite[];
  discounts?: DiscountLite[];
  projectStart: Date | string | null;
  cutoffMs: number;
  /** In-memory filter applied to both tickets, changes, and logs. */
  ticketFilter: (ticketId: string) => boolean;
}

/**
 * Effective time at which a ticket's "Original" estimate is counted into the
 * trend curve. Non-CR tickets count from `created_at`. Approved CRs count from
 * `cr_effective_at` (which the fetcher sets to `cr_decided_at ?? created_at`).
 *
 * This is intentionally simpler than the older "wait for first FE/BE log"
 * heuristic the Health page used — it matches the Client Portal and makes the
 * Original line more honest (committed scope shows immediately on creation).
 */
function ticketEffectiveMs(t: TicketLite): number {
  if (t.is_cr) {
    const src = t.cr_effective_at ?? t.created_at;
    return new Date(src).getTime();
  }
  return new Date(t.created_at).getTime();
}

/**
 * Pure builder for the Original / Current / Actual trend series. Used by both
 * the Project Health page and the Client Portal. See ADR in
 * `.lovable/plan.md` for the merge rationale.
 */
export function buildTrendSeries({
  tickets,
  changes,
  logs,
  discounts = [],
  projectStart,
  cutoffMs,
  ticketFilter,
}: BuildTrendInputs): TrendBucket[] {
  const relevant = tickets.filter((t) => ticketFilter(t.id));
  if (relevant.length === 0) return [];

  const firstMs = Math.min(...relevant.map(ticketEffectiveMs));
  const startMs = projectStart
    ? startOfDay(new Date(projectStart)).getTime()
    : startOfDay(new Date(firstMs)).getTime();
  const end = endOfDay(new Date(cutoffMs)).getTime();
  if (end < startMs) return [];

  const dayMs = 86_400_000;
  const totalDays = Math.max(1, Math.ceil((end - startMs) / dayMs));
  // Cap samples around ~120 buckets for readable charts on long projects.
  const stride = Math.max(1, Math.ceil(totalDays / 120));

  const ticketEff = new Map(relevant.map((tk) => [tk.id, ticketEffectiveMs(tk)] as const));

  const sampleAt = (c: number): { original: number; current: number; actual: number } => {
    let original = 0;
    let deltas = 0;
    let actual = 0;
    relevant.forEach((tk) => {
      const eff = ticketEff.get(tk.id) ?? Infinity;
      if (eff > c) return;
      original += tk.original_fe_estimate + tk.original_be_estimate;
    });
    changes.forEach((ch) => {
      if (!ticketFilter(ch.ticket_id)) return;
      const tkEff = ticketEff.get(ch.ticket_id);
      if (tkEff == null) return;
      // Delta only takes effect once both the change exists AND the ticket is
      // "live" — for approved CRs that means after cr_effective_at.
      const deltaEff = Math.max(new Date(ch.created_at).getTime(), tkEff);
      if (deltaEff > c) return;
      deltas += ch.delta;
    });
    logs.forEach((l) => {
      if (!ticketFilter(l.ticket_id)) return;
      if (new Date(l.logged_at).getTime() > c) return;
      actual += l.hours;
    });
    let discounted = 0;
    discounts.forEach((d) => {
      if (new Date(d.created_at).getTime() > c) return;
      discounted += Number(d.hours) || 0;
    });
    return {
      original,
      current: Math.max(0, original + deltas - discounted),
      actual: Math.max(0, actual - discounted),
    };
  };

  const buckets: TrendBucket[] = [];
  for (let t = startMs; t <= end; t += stride * dayMs) {
    const s = sampleAt(t);
    buckets.push({ label: format(new Date(t), "d MMM"), ...s, _t: t });
  }
  const lastT = buckets[buckets.length - 1]?._t ?? -Infinity;
  if (lastT < end) {
    const s = sampleAt(end);
    buckets.push({ label: format(new Date(end), "d MMM"), ...s, _t: end });
  }
  return buckets;
}
