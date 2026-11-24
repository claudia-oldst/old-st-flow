import type { QueryClient } from "@tanstack/react-query";
import { requestTicketPage } from "./ticketPageRequest";
import { normalizeTicket, type FetchResult, type TicketRow } from "./useProjectTickets";

type Paged = { rows: TicketRow[]; total: number };
type PagedOpts = { feedback?: boolean };

const fullKey = (projectId: string) => ["projectTickets", projectId] as const;
const pagedKey = (projectId: string) => ["projectTicketsPaged", projectId] as const;

/** Above this many changed tickets a single full reload is cheaper than patching. */
export const MAX_PATCH_IDS = 100;

function byPosition(a: TicketRow, b: TicketRow) {
  return a.position - b.position || a.ticket_number - b.ticket_number;
}

/** Replace, insert (by position) or remove rows in a full ticket list. Pure. */
export function mergeTicketRows(list: TicketRow[], ids: string[], fresh: Map<string, TicketRow>): TicketRow[] {
  const wanted = new Set(ids);
  const seen = new Set<string>();
  const next: TicketRow[] = [];
  for (const t of list) {
    if (!wanted.has(t.id)) { next.push(t); continue; }
    seen.add(t.id);
    const row = fresh.get(t.id);
    if (row) next.push(row);
  }
  const added = ids.filter((id) => !seen.has(id) && fresh.has(id)).map((id) => fresh.get(id)!);
  if (added.length === 0) return next;
  return [...next, ...added].sort(byPosition);
}

async function fetchRows(projectId: string, ids: string[], feedback: boolean) {
  const data = await requestTicketPage({
    _project_id: projectId,
    _filters: { ticketIds: ids, feedback } as never,
    _search: null, _sort_col: "position", _sort_dir: "asc", _page: 1, _page_size: 1000,
  });
  const rows = ((data as { rows?: unknown[] } | null)?.rows ?? []).map(normalizeTicket);
  return new Map(rows.map((r) => [r.id, r]));
}

/** Patch fields of one ticket in every cached list immediately (optimistic). */
export function patchTicketInCaches(qc: QueryClient, projectId: string, id: string, patch: Partial<TicketRow>) {
  const apply = (t: TicketRow) => (t.id === id ? { ...t, ...patch } : t);
  qc.setQueryData<FetchResult>(fullKey(projectId), (d) => d && { ...d, tickets: d.tickets.map(apply) });
  qc.setQueriesData<Paged>({ queryKey: pagedKey(projectId) }, (d) => d && { ...d, rows: d.rows.map(apply) });
}

/** Patch the epic name on already loaded tickets. */
export function patchEpicInCaches(qc: QueryClient, projectId: string, epicId: number, epicName: string | null) {
  patchWhere(qc, projectId, (t) => t.epic_id === epicId, { epic_name: epicName });
}

function patchWhere(qc: QueryClient, projectId: string, match: (t: TicketRow) => boolean, patch: Partial<TicketRow>) {
  const apply = (t: TicketRow) => (match(t) ? { ...t, ...patch } : t);
  qc.setQueryData<FetchResult>(fullKey(projectId), (d) => d && { ...d, tickets: d.tickets.map(apply) });
  qc.setQueriesData<Paged>({ queryKey: pagedKey(projectId) }, (d) => d && { ...d, rows: d.rows.map(apply) });
}

/**
 * Re-download only the given tickets and swap them into cached lists, keeping
 * every other row (and the user's scroll position) untouched.
 */
export async function refreshTicketRows(qc: QueryClient, projectId: string, ids: string[]) {
  const unique = [...new Set(ids)];
  if (unique.length === 0) return;
  if (unique.length > MAX_PATCH_IDS) {
    await qc.invalidateQueries({ queryKey: fullKey(projectId) }, { cancelRefetch: false });
    await qc.invalidateQueries({ queryKey: pagedKey(projectId) }, { cancelRefetch: false });
    return;
  }
  const paged = qc.getQueriesData<Paged>({ queryKey: pagedKey(projectId) });
  const needsFeedback = paged.some(([key]) => (key[2] as PagedOpts | undefined)?.feedback === true);
  const [normal, feedback] = await Promise.all([
    fetchRows(projectId, unique, false),
    needsFeedback ? fetchRows(projectId, unique, true) : Promise.resolve(new Map<string, TicketRow>()),
  ]);

  qc.setQueryData<FetchResult>(fullKey(projectId), (d) =>
    d && { ...d, tickets: mergeTicketRows(d.tickets, unique, normal), totalCount: d.totalCount + countDelta(d.tickets, unique, normal) });

  let pageMissing = false;
  for (const [key, data] of paged) {
    if (!data) continue;
    const fresh = (key[2] as PagedOpts | undefined)?.feedback ? feedback : normal;
    const onPage = new Set(data.rows.map((r) => r.id));
    if (unique.some((id) => fresh.has(id) && !onPage.has(id))) pageMissing = true;
    const rows = data.rows.flatMap((r) => (!unique.includes(r.id) ? [r] : fresh.has(r.id) ? [fresh.get(r.id)!] : []));
    qc.setQueryData<Paged>(key, { rows, total: data.total - (data.rows.length - rows.length) });
  }
  // A new ticket belongs on a server-sorted page: refetch those pages quietly
  // (they keep showing the previous rows until the new page arrives).
  if (pageMissing) void qc.invalidateQueries({ queryKey: pagedKey(projectId) }, { cancelRefetch: false });
}

function countDelta(list: TicketRow[], ids: string[], fresh: Map<string, TicketRow>) {
  const have = new Set(list.map((t) => t.id));
  let delta = 0;
  for (const id of ids) {
    if (have.has(id) && !fresh.has(id)) delta--;
    if (!have.has(id) && fresh.has(id)) delta++;
  }
  return delta;
}
