import type {
  ChangeLite,
  LogLite,
  TicketLite,
} from "@/features/_shared/estimate-trend/types";
import type { EpicDiscount } from "@/features/discounts/applyDiscounts";
import { NO_EPIC_KEY, endOfDay } from "./dateUtils";

interface Params {
  tickets: TicketLite[];
  changes: ChangeLite[];
  logs: LogLite[];
  discounts: EpicDiscount[];
  epics: { id: number; epic_name: string | null }[];
  ticketEpic: Map<string, number | null>;
  asOf: Date;
}

export interface EpicSnapshot {
  key: string;
  name: string;
  original: number;
  current: number;
  actual: number;
  ticketIds: Set<string>;
}

function ticketEffectiveMs(t: TicketLite): number {
  if (t.is_cr) {
    const src = t.cr_effective_at ?? t.created_at;
    return new Date(src).getTime();
  }
  return new Date(t.created_at).getTime();
}

export function buildEpicSnapshots({
  tickets,
  changes,
  logs,
  discounts,
  epics,
  ticketEpic,
  asOf,
}: Params): EpicSnapshot[] {
  const asOfMs = endOfDay(asOf).getTime();

  const groups = new Map<
    string,
    { name: string; original: number; current: number; actual: number; ticketIds: Set<string> }
  >();

  tickets.forEach((t) => {
    const effMs = ticketEffectiveMs(t);
    const key = t.epic_id != null ? `e:${t.epic_id}` : NO_EPIC_KEY;
    const name =
      t.epic_id != null
        ? epics.find((e) => e.id === t.epic_id)?.epic_name ?? `Epic ${t.epic_id}`
        : "No epic";
    if (!groups.has(key)) {
      groups.set(key, { name, original: 0, current: 0, actual: 0, ticketIds: new Set() });
    }
    const g = groups.get(key)!;
    g.ticketIds.add(t.id);
    if (effMs > asOfMs) return;
    g.original += t.original_fe_estimate + t.original_be_estimate;
  });

  const ticketEff = new Map<string, number>();
  tickets.forEach((t) => ticketEff.set(t.id, ticketEffectiveMs(t)));
  changes.forEach((c) => {
    const tkEff = ticketEff.get(c.ticket_id);
    if (tkEff == null || !isFinite(tkEff)) return;
    const deltaEff = Math.max(new Date(c.created_at).getTime(), tkEff);
    if (deltaEff > asOfMs) return;
    const epicId = ticketEpic.get(c.ticket_id);
    const key = epicId != null ? `e:${epicId}` : NO_EPIC_KEY;
    const g = groups.get(key);
    if (!g) return;
    g.current += c.delta;
  });

  groups.forEach((g) => {
    g.current = g.original + g.current;
  });

  logs.forEach((l) => {
    if (new Date(l.logged_at).getTime() > asOfMs) return;
    const epicId = ticketEpic.get(l.ticket_id);
    const key = epicId != null ? `e:${epicId}` : NO_EPIC_KEY;
    const g = groups.get(key);
    if (!g) return;
    g.actual += l.hours;
  });

  discounts.forEach((d) => {
    if (new Date(d.created_at).getTime() > asOfMs) return;
    const key = `e:${d.epic_id}`;
    const g = groups.get(key);
    if (!g) return;
    const h = Number(d.hours) || 0;
    g.current = Math.max(0, g.current - h);
    g.actual = Math.max(0, g.actual - h);
  });

  return Array.from(groups.entries())
    .map(([key, v]) => ({ key, ...v }))
    .filter((g) => g.original > 0 || g.current > 0 || g.actual > 0)
    .sort((a, b) => b.current - a.current);
}
