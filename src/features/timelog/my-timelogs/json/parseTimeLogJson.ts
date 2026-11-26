/** Pure parsing/matching for "Log via JSON" on My Timelogs. Unknown or missing fields are left blank. */
export interface JsonLogDraft {
  key: string;
  project?: string;
  ticket?: string;
  note?: string;
  date?: Date;
  startTime?: string;
  durH?: string;
  durM?: string;
}

const norm = (k: string) => k.toLowerCase().replace(/[^a-z]/g, "");
const ALIASES: Record<string, string[]> = {
  project: ["project", "projectname"],
  tickets: ["ticket", "tickets", "ticketid", "ticketids"],
  note: ["reason", "note", "notes", "description", "desc"],
  date: ["date", "day"],
  h: ["h", "hours", "hrs", "timeh", "timehours"],
  m: ["m", "minutes", "mins", "timem", "timeminutes"],
  start: ["start", "starttime", "from"],
  end: ["end", "endtime", "to"],
};

function pick(obj: Record<string, unknown>, field: keyof typeof ALIASES): unknown {
  for (const [k, v] of Object.entries(obj)) if (ALIASES[field].includes(norm(k))) return v;
  return undefined;
}
const str = (v: unknown) => (typeof v === "string" || typeof v === "number" ? String(v).trim() : "");

function toTime(v: unknown): string | undefined {
  const m = /^(\d{1,2})[:.h](\d{2})/.exec(str(v));
  if (!m || +m[1] > 23 || +m[2] > 59) return undefined;
  return `${m[1].padStart(2, "0")}:${m[2]}`;
}
function toDate(v: unknown): Date | undefined {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(str(v));
  if (!m) return undefined;
  const d = new Date(+m[1], +m[2] - 1, +m[3]);
  return isNaN(d.getTime()) ? undefined : d;
}
const mins = (t: string) => +t.slice(0, 2) * 60 + +t.slice(3);

export function parseTimeLogJson(
  text: string,
): { ok: true; drafts: JsonLogDraft[] } | { ok: false; error: string } {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch (e) {
    return { ok: false, error: `Not valid JSON: ${(e as Error).message}` };
  }
  const list = Array.isArray(data) ? data : [data];
  const drafts: JsonLogDraft[] = [];
  list.forEach((raw, i) => {
    const o = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
    const base: Omit<JsonLogDraft, "key" | "ticket"> = {};
    if (str(pick(o, "project"))) base.project = str(pick(o, "project"));
    if (str(pick(o, "note"))) base.note = str(pick(o, "note"));
    base.date = toDate(pick(o, "date"));
    const start = toTime(pick(o, "start"));
    const end = toTime(pick(o, "end"));
    if (start) base.startTime = start;
    const h = str(pick(o, "h")).replace(/\D/g, "");
    const m = str(pick(o, "m")).replace(/\D/g, "");
    if (h || m) {
      base.durH = h;
      base.durM = m;
    } else if (start && end && mins(end) > mins(start)) {
      const d = mins(end) - mins(start);
      base.durH = String(Math.floor(d / 60));
      base.durM = String(d % 60);
    }
    const t = pick(o, "tickets");
    const refs = (Array.isArray(t) ? t : str(t).split(/[,;]/)).map(str).filter(Boolean);
    if (refs.length === 0) drafts.push({ key: `${i}`, ...base });
    refs.forEach((ticket, j) => drafts.push({ key: `${i}-${j}`, ...base, ticket }));
  });
  return { ok: true, drafts };
}

const words = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, " ").split(" ").filter((w) => w && w !== "project");

/** Best match by exact name, acronym, then word overlap ("Cousteau" → "Project Cousteau"). Ties → null. */
export function matchProject<P extends { id: string; name: string; acronym: string }>(
  query: string | undefined,
  projects: P[],
): P | null {
  if (!query) return null;
  const q = query.trim().toLowerCase();
  const exact = projects.find((p) => p.name.toLowerCase() === q || p.acronym.toLowerCase() === q);
  if (exact) return exact;
  const qw = words(query);
  if (qw.length === 0) return null;
  let best: P | null = null;
  let bestScore = 0;
  let tie = false;
  for (const p of projects) {
    const pw = words(p.name);
    const hits = qw.filter((w) => pw.some((x) => x === w || x.startsWith(w) || w.startsWith(x))).length;
    if (hits === 0) continue;
    const score = hits / Math.max(qw.length, pw.length);
    if (score > bestScore) [best, bestScore, tie] = [p, score, false];
    else if (score === bestScore) tie = true;
  }
  return tie ? null : best;
}

/** Match a ticket by formatted id (case-insensitive, padding-tolerant) or exact title. */
export function matchTicket<T extends { formatted_id: string; title: string }>(
  query: string | undefined,
  tickets: T[],
): T | null {
  if (!query) return null;
  const q = query.trim().toLowerCase();
  const key = (s: string) => s.toLowerCase().replace(/-0*(\d+)$/, "-$1");
  return (
    tickets.find((t) => key(t.formatted_id) === key(q)) ??
    tickets.find((t) => t.title.toLowerCase() === q) ??
    null
  );
}
