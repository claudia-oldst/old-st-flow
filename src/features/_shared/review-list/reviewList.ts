/** Pure helpers shared by the Change Requests and Estimate Revisions tabs. */

export type ReviewGroupBy = "none" | "epic" | "approval" | "requester";
export type ReviewSort = "newest" | "oldest" | "ticket" | "hours";

export const DEFAULT_REVIEW_GROUP: ReviewGroupBy = "epic";
export const DEFAULT_REVIEW_STATUS = ["pending", "approved"];

const DAY = 86_400_000;
const STATUS_ORDER = ["pending", "approved", "rejected"];
const STATUS_LABEL: Record<string, string> = { pending: "Pending", approved: "Approved", rejected: "Rejected" };

/** Chart span: a little before the first request, ending today. */
export function historyRange(timestamps: number[], now = Date.now()): { start: number; end: number } {
  const valid = timestamps.filter((n) => Number.isFinite(n));
  if (valid.length === 0) return { start: now - 7 * DAY, end: now };
  const first = Math.min(...valid);
  const span = Math.max(0, now - first);
  const pad = Math.max(2 * DAY, span * 0.05);
  return { start: first - pad, end: Math.max(now, first + DAY) };
}

export interface GroupKeyInfo {
  epicKey: string;
  epicName: string;
  epicRank: number;
  status: string;
  requesterId: string | null;
  requesterName: string;
}

export interface ReviewGroup<T> {
  key: string;
  title: string;
  isEpic: boolean;
  items: T[];
}

export function groupReviewItems<T>(
  items: T[],
  groupBy: ReviewGroupBy,
  info: (item: T) => GroupKeyInfo,
): ReviewGroup<T>[] {
  if (groupBy === "none") return [{ key: "all", title: "All", isEpic: false, items }];
  const map = new Map<string, ReviewGroup<T> & { rank: number | string }>();
  items.forEach((it) => {
    const i = info(it);
    let key: string; let title: string; let rank: number | string;
    if (groupBy === "epic") { key = i.epicKey; title = i.epicName; rank = i.epicRank; }
    else if (groupBy === "approval") {
      key = `s:${i.status}`; title = STATUS_LABEL[i.status] ?? i.status;
      rank = STATUS_ORDER.indexOf(i.status) === -1 ? 99 : STATUS_ORDER.indexOf(i.status);
    } else { key = `r:${i.requesterId ?? "none"}`; title = i.requesterName || "Unknown"; rank = title.toLowerCase(); }
    if (!map.has(key)) map.set(key, { key, title, isEpic: groupBy === "epic", items: [], rank });
    map.get(key)!.items.push(it);
  });
  return Array.from(map.values())
    .sort((a, b) => (typeof a.rank === "number" && typeof b.rank === "number"
      ? a.rank - b.rank : String(a.rank).localeCompare(String(b.rank))))
    .map(({ rank: _r, ...g }) => g);
}

export interface SortInfo { created: number; ticket: string; hours: number }

export function sortReviewItems<T>(items: T[], sort: ReviewSort, info: (item: T) => SortInfo): T[] {
  const arr = [...items];
  const cmp: Record<ReviewSort, (a: SortInfo, b: SortInfo) => number> = {
    newest: (a, b) => b.created - a.created,
    oldest: (a, b) => a.created - b.created,
    ticket: (a, b) => a.ticket.localeCompare(b.ticket, undefined, { numeric: true }),
    hours: (a, b) => Math.abs(b.hours) - Math.abs(a.hours),
  };
  return arr.sort((a, b) => cmp[sort](info(a), info(b)));
}

export function matchesSearch(q: string, ...fields: Array<string | null | undefined>): boolean {
  const s = q.trim().toLowerCase();
  if (!s) return true;
  return fields.some((f) => (f ?? "").toLowerCase().includes(s));
}
