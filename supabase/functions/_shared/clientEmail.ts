// Pure figures for the AI-drafted monthly client email. No Deno/npm imports so
// the frontend tests can import it too.

export interface EmailLog {
  hours: number;
  note: string | null;
  ticket_title: string;
  ticket_type: string;
  epic_id: number | null;
}
export interface EmailDiscount {
  epic_id: number | null;
  hours: number;
  reason: string;
}

export interface EpicFigure {
  id: number | null;
  name: string;
  hours: number;
}

export interface EmailFacts {
  totalHours: number;
  topEpics: EpicFigure[];
  /** True when other epics with logged hours were not listed. */
  hasOtherEpics: boolean;
  bugHours: number;
  crHours: number;
  discountHours: number;
  discounts: { epic: string; hours: number; reasons: string[] }[];
  amountOwed: number;
}

const r1 = (n: number) => Math.round(n * 10) / 10;

/** Up to 4 epics with the most hours, ignoring any under 5% of the month. */
export function pickTopEpics(epics: EpicFigure[], total: number, max = 4): EpicFigure[] {
  if (total <= 0) return [];
  return epics
    .filter((e) => e.hours > 0 && e.hours / total >= 0.05)
    .sort((a, b) => b.hours - a.hours)
    .slice(0, max);
}

export function computeFacts(
  logs: EmailLog[],
  discounts: EmailDiscount[],
  epicNames: Map<number, string>,
  rate: number,
): EmailFacts {
  const name = (id: number | null) => (id == null ? "No Epic" : epicNames.get(id) ?? "Untitled epic");
  const byEpic = new Map<number | null, number>();
  let total = 0, bug = 0, cr = 0;
  for (const l of logs) {
    const h = Number(l.hours) || 0;
    total += h;
    if (l.ticket_type === "Bug") bug += h;
    if (l.ticket_type === "CR") cr += h;
    byEpic.set(l.epic_id, (byEpic.get(l.epic_id) ?? 0) + h);
  }
  const all = [...byEpic].map(([id, hours]) => ({ id, name: name(id), hours: r1(hours) }));
  const topEpics = pickTopEpics(all, total);
  const dMap = new Map<number | null, { hours: number; reasons: string[] }>();
  let discountHours = 0;
  for (const d of discounts) {
    const h = Number(d.hours) || 0;
    discountHours += h;
    const cur = dMap.get(d.epic_id) ?? { hours: 0, reasons: [] };
    cur.hours += h;
    if (d.reason) cur.reasons.push(d.reason);
    dMap.set(d.epic_id, cur);
  }
  const billed = Math.max(0, total - discountHours);
  return {
    totalHours: r1(total),
    topEpics,
    hasOtherEpics: all.filter((e) => e.hours > 0).length > topEpics.length,
    bugHours: r1(bug),
    crHours: r1(cr),
    discountHours: r1(discountHours),
    discounts: [...dMap].map(([id, v]) => ({ epic: name(id), hours: r1(v.hours), reasons: v.reasons })),
    amountOwed: Math.round(billed * rate * 100) / 100,
  };
}
