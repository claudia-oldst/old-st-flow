import type { ChangeRow } from "../useAllEstimateChanges";

const NO_EPIC_KEY = (projectId: string) => `noepic:${projectId}`;

interface BuildArgs {
  matching: ChangeRow[];
  projectChanges: ChangeRow[];
  projects: Array<{ id: string; acronym: string }>;
  epics: Array<{ id: number; epic_name: string }>;
}

export function buildChangeRequestGroups({ matching, projectChanges, projects, epics }: BuildArgs) {
  const projectMap = new Map(projects.map((p) => [p.id, p]));
  const epicMap = new Map(epics.map((e) => [e.id, e]));

  const buckets = new Map<
    string,
    {
      key: string;
      epicName: string;
      projectAcronym: string;
      projectId: string;
      ticketIds: Set<string>;
      ticketsById: Map<string, ChangeRow["ticket"]>;
      changes: ChangeRow[];
    }
  >();

  matching.forEach((c) => {
    if (!c.ticket) return;
    const projId = c.ticket.project_id;
    const proj = projectMap.get(projId);
    const key = c.ticket.epic_id != null ? `e:${c.ticket.epic_id}` : NO_EPIC_KEY(projId);
    const epicName =
      c.ticket.epic_id != null
        ? epicMap.get(c.ticket.epic_id)?.epic_name ?? `Epic ${c.ticket.epic_id}`
        : "No epic";
    if (!buckets.has(key)) {
      buckets.set(key, {
        key,
        epicName,
        projectAcronym: proj?.acronym ?? "?",
        projectId: projId,
        ticketIds: new Set(),
        ticketsById: new Map(),
        changes: [],
      });
    }
    const b = buckets.get(key)!;
    b.changes.push(c);
    b.ticketIds.add(c.ticket.id);
    b.ticketsById.set(c.ticket.id, c.ticket);
  });

  const approvedByTicket = new Map<string, ChangeRow[]>();
  projectChanges.forEach((c) => {
    if (c.status !== "approved" || !c.ticket) return;
    const arr = approvedByTicket.get(c.ticket.id) ?? [];
    arr.push(c);
    approvedByTicket.set(c.ticket.id, arr);
  });

  return Array.from(buckets.values())
    .map((b) => {
      const tickets = Array.from(b.ticketsById.values()).filter(Boolean) as NonNullable<
        ChangeRow["ticket"]
      >[];
      const approvedChanges: ChangeRow[] = [];
      b.ticketIds.forEach((tid) => {
        (approvedByTicket.get(tid) ?? []).forEach((c) => approvedChanges.push(c));
      });
      return { ...b, tickets, approvedChanges };
    })
    .sort((a, b) => {
      const la = Math.max(...a.changes.map((c) => new Date(c.created_at).getTime()), 0);
      const lb = Math.max(...b.changes.map((c) => new Date(c.created_at).getTime()), 0);
      return lb - la;
    });
}
