import { format } from "date-fns";
import type { TicketRow } from "@/features/tickets/useProjectTickets";
import type { EpicDiscount } from "@/features/discounts/applyDiscounts";
import { ALL_EPICS_KEY, NO_EPIC_KEY, endOfDay, startOfDay } from "./dateUtils";
import { ticketEffectiveMs, type TimeLogLite } from "./ticketEffectiveMs";
import type { ChangeLite } from "./buildEpicSnapshots";

interface Params {
  tickets: TicketRow[];
  changes: ChangeLite[];
  logs: TimeLogLite[];
  discounts: EpicDiscount[];
  ticketEpic: Map<string, number | null>;
  selectedEpic: string;
  asOf: Date;
  projectStart: Date | null;
}

export interface TrendBucket {
  date: number;
  label: string;
  original: number;
  current: number;
  actual: number;
}

export function buildTrendData({
  tickets,
  changes,
  logs,
  discounts,
  ticketEpic,
  selectedEpic,
  asOf,
  projectStart,
}: Params): TrendBucket[] {
  if (tickets.length === 0) return [];

  const ticketFilter = (ticketId: string) => {
    if (selectedEpic === ALL_EPICS_KEY) return true;
    const epicId = ticketEpic.get(ticketId);
    if (selectedEpic === NO_EPIC_KEY) return epicId == null;
    return `e:${epicId}` === selectedEpic;
  };

  const discountFilter = (epicId: number) => {
    if (selectedEpic === ALL_EPICS_KEY) return true;
    if (selectedEpic === NO_EPIC_KEY) return false;
    return `e:${epicId}` === selectedEpic;
  };
  const relevantDiscounts = discounts.filter((d) => discountFilter(d.epic_id));

  const relevantTickets = tickets.filter(
    (t) => ticketFilter(t.id) && !(t.ticket_type === "CR" && t.cr_approval !== "approved"),
  );
  if (relevantTickets.length === 0 && relevantDiscounts.length === 0) return [];

  const ticketEffMs = new Map<string, number>();
  relevantTickets.forEach((t) => ticketEffMs.set(t.id, ticketEffectiveMs(t)));

  const firstTicketMs = relevantTickets.length > 0
    ? Math.min(...Array.from(ticketEffMs.values()).filter((v) => isFinite(v)))
    : Date.now();
  const startMs = projectStart
    ? startOfDay(projectStart).getTime()
    : startOfDay(new Date(firstTicketMs)).getTime();
  const start = startMs;
  const end = endOfDay(asOf).getTime();
  if (end < start) return [];

  const dayMs = 86_400_000;
  const totalDays = Math.max(1, Math.ceil((end - start) / dayMs));
  const stride = Math.max(1, Math.ceil(totalDays / 120));

  const buckets: TrendBucket[] = [];

  const sampleAt = (cutoff: number) => {
    let original = 0;
    let deltas = 0;
    let actual = 0;
    relevantTickets.forEach((tk) => {
      const eff = ticketEffMs.get(tk.id) ?? Infinity;
      if (eff > cutoff) return;
      original += tk.original_fe_estimate + tk.original_be_estimate;
    });
    changes.forEach((c) => {
      if (c.status !== "approved") return;
      if (!ticketFilter(c.ticket_id)) return;
      const tkEff = ticketEffMs.get(c.ticket_id);
      if (tkEff == null) return;
      const deltaEff = Math.max(new Date(c.created_at).getTime(), tkEff);
      if (deltaEff > cutoff) return;
      deltas += c.delta;
    });
    logs.forEach((l) => {
      if (new Date(l.logged_at).getTime() > cutoff) return;
      if (!ticketFilter(l.ticket_id)) return;
      actual += l.hours;
    });
    let discounted = 0;
    relevantDiscounts.forEach((d) => {
      if (new Date(d.created_at).getTime() > cutoff) return;
      discounted += Number(d.hours) || 0;
    });
    return {
      original,
      current: Math.max(0, original + deltas - discounted),
      actual: Math.max(0, actual - discounted),
    };
  };

  for (let t = start; t <= end; t += stride * dayMs) {
    const s = sampleAt(t);
    buckets.push({ date: t, label: format(new Date(t), "d MMM"), ...s });
  }
  if (buckets.length === 0 || buckets[buckets.length - 1].date < end) {
    const s = sampleAt(end);
    buckets.push({ date: end, label: format(new Date(end), "d MMM"), ...s });
  }

  return buckets;
}
