import type { Sprint } from "../types";

type S = Pick<Sprint, "id" | "start_date" | "end_date">;

/** Default 6 sprints: current sprint 5th (4 before, 1 after). Falls back to the sprint closest to today. */
export function defaultGanttSprintIds(sprints: S[], today: string, count = 6): string[] {
  if (sprints.length <= count) return sprints.map((s) => s.id);
  const sorted = [...sprints].sort((a, b) => a.start_date.localeCompare(b.start_date));
  let idx = sorted.findIndex((s) => s.start_date <= today && today <= s.end_date);
  if (idx < 0) {
    const dist = (s: S) => Math.abs(new Date(s.start_date).getTime() - new Date(today).getTime());
    idx = sorted.reduce((best, s, i) => (dist(s) < dist(sorted[best]) ? i : best), 0);
  }
  let end = Math.min(sorted.length, idx + 2);
  let start = Math.max(0, end - count);
  end = Math.min(sorted.length, start + count);
  start = Math.max(0, end - count);
  return sorted.slice(start, end).map((s) => s.id);
}
