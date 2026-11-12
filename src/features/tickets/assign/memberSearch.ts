import type { ProjectMember, TeamMember } from "@/lib/types";

type M = ProjectMember & { member: TeamMember };

export function matchesMember(m: M, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const mem = m.member as TeamMember & { email?: string | null };
  return [mem.name, mem.email, m.role].some((v) => (v ?? "").toString().toLowerCase().includes(q));
}

/** Filter by query, always keeping already-selected people visible. */
export function filterMembers<T extends M>(list: T[], query: string, selected: Set<string>): T[] {
  return list.filter((m) => selected.has(m.user_id) || matchesMember(m, query));
}
