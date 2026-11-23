import { parseISO } from "date-fns";
import type { SprintDiscipline } from "../types";

export interface GanttSegment {
  sprintId: string;
  startDate: Date;
  endDate: Date;
  todo: number;
  in_progress: number;
  for_integration: number;
  done: number;
  /** Tickets whose latest sprint is later than this one (shown grey). */
  past: number;
  /** Later sprint label -> number of tickets carried there. */
  carriedTo: Record<string, number>;
  total: number;
  committed: number;
  planned: number;
}

export interface GanttEpicRow {
  epicId: number | null;
  epicName: string;
  /** Position in the project's epic order (lower first). */
  rank?: number;
  segments: GanttSegment[];
  isCommitted: boolean;
  startDate: Date;
  endDate: Date;
}

type DisciplineStatus = "todo" | "in_progress" | "for_integration" | "done";

export interface GanttSprintInput {
  id: string;
  start_date: string;
  end_date: string;
  sprint_number?: number | null;
}

export interface GanttTicketInput {
  id: string;
  epic_id: number | null;
  epic_name?: string | null;
  fe_status: DisciplineStatus | null;
  be_status: DisciplineStatus | null;
  planned_sprint_fe_id?: string | null;
  planned_sprint_be_id?: string | null;
}

export interface GanttCommitmentInput {
  ticket_id: string;
  sprint_id: string;
  discipline: string;
}

export interface GanttEpicInput {
  id: number;
  epic_name: string | null;
}

/**
 * Pure Gantt row builder shared by the authenticated app view and the
 * hash-scoped public client portal view.
 */
export function buildGanttRows(
  sprints: GanttSprintInput[],
  tickets: GanttTicketInput[],
  commitments: GanttCommitmentInput[],
  epics: GanttEpicInput[],
  discipline: SprintDiscipline,
): GanttEpicRow[] {
  if (!sprints.length) return [];

  const sprintById = new Map(sprints.map((s) => [s.id, s]));
  const epicNameById = new Map<number, string>();
  epics.forEach((e) => {
    if (e.epic_name) epicNameById.set(e.id, e.epic_name);
  });

  const sortedSprints = [...sprints].sort(
    (a, b) => parseISO(a.start_date).getTime() - parseISO(b.start_date).getTime(),
  );
  const fallbackStart = parseISO(sortedSprints[0].start_date);
  const fallbackEnd = parseISO(sortedSprints[0].end_date);

  const commitmentsByTicket = new Map<string, GanttCommitmentInput[]>();
  commitments.forEach((st) => {
    const arr = commitmentsByTicket.get(st.ticket_id) ?? [];
    arr.push(st);
    commitmentsByTicket.set(st.ticket_id, arr);
  });

  const epicSegments = new Map<
    string,
    {
      epicId: number | null;
      epicName: string;
      bySprint: Map<
        string,
        {
          todo: number;
          in_progress: number;
          for_integration: number;
          done: number;
          past: number;
          carriedTo: Record<string, number>;
          committed: number;
          planned: number;
        }
      >;
      anyCommitted: boolean;
    }
  >();

  // Only epics that actually have tickets get a row (scheduled or not).
  const epicIdsWithTickets = new Set(
    tickets
      .map((t) => t.epic_id)
      .filter((id): id is number => id !== null && id !== undefined),
  );

  epics.forEach((e) => {
    if (!e.epic_name) return;
    if (!epicIdsWithTickets.has(e.id)) return;
    epicSegments.set(`e:${e.id}`, {
      epicId: e.id,
      epicName: e.epic_name,
      bySprint: new Map(),
      anyCommitted: false,
    });
  });

  for (const t of tickets) {
    const entries = new Map<string, boolean>();
    for (const st of commitmentsByTicket.get(t.id) ?? []) {
      if (st.discipline !== discipline) continue;
      if (!sprintById.has(st.sprint_id)) continue;
      entries.set(st.sprint_id, true);
    }
    const plannedId =
      discipline === "FE" ? t.planned_sprint_fe_id : t.planned_sprint_be_id;
    if (plannedId && sprintById.has(plannedId) && !entries.has(plannedId)) {
      entries.set(plannedId, false);
    }
    if (!entries.size) continue;

    const epicKey =
      t.epic_id !== null && t.epic_id !== undefined ? `e:${t.epic_id}` : "none";
    let bucket = epicSegments.get(epicKey);
    if (!bucket) {
      const epicName =
        t.epic_id !== null && t.epic_id !== undefined
          ? epicNameById.get(t.epic_id) ?? t.epic_name ?? "Untitled epic"
          : "No epic";
      bucket = {
        epicId: t.epic_id ?? null,
        epicName,
        bySprint: new Map(),
        anyCommitted: false,
      };
      epicSegments.set(epicKey, bucket);
    }
    const startOf = (id: string) => parseISO(sprintById.get(id)!.start_date).getTime();
    const latestId = [...entries.keys()].reduce((a, b) => (startOf(b) > startOf(a) ? b : a));
    const latest = sprintById.get(latestId)!;
    const latestLabel = latest.sprint_number != null ? `S${latest.sprint_number}` : "later sprint";
    for (const [sprintId, committed] of entries) {
      if (committed) bucket.anyCommitted = true;

      let seg = bucket.bySprint.get(sprintId);
      if (!seg) {
        seg = {
          todo: 0,
          in_progress: 0,
          for_integration: 0,
          done: 0,
          past: 0,
          carriedTo: {},
          committed: 0,
          planned: 0,
        };
        bucket.bySprint.set(sprintId, seg);
      }
      if (sprintId === latestId) {
        const status = (discipline === "FE" ? t.fe_status : t.be_status) ?? "todo";
        seg[status] = (seg[status] ?? 0) + 1;
      } else {
        seg.past += 1;
        seg.carriedTo[latestLabel] = (seg.carriedTo[latestLabel] ?? 0) + 1;
      }
      if (committed) seg.committed += 1;
      else seg.planned += 1;
    }
  }

  const rows: GanttEpicRow[] = [];
  epicSegments.forEach((bucket) => {
    const segments: GanttSegment[] = [];
    bucket.bySprint.forEach((counts, sprintId) => {
      const total =
        counts.todo + counts.in_progress + counts.for_integration + counts.done + counts.past;
      if (total === 0) return;
      const sp = sprintById.get(sprintId)!;
      segments.push({
        sprintId,
        startDate: parseISO(sp.start_date),
        endDate: parseISO(sp.end_date),
        todo: counts.todo,
        in_progress: counts.in_progress,
        for_integration: counts.for_integration,
        done: counts.done,
        past: counts.past,
        carriedTo: counts.carriedTo,
        total,
        committed: counts.committed,
        planned: counts.planned,
      });
    });
    segments.sort((a, b) => a.startDate.getTime() - b.startDate.getTime());
    rows.push({
      epicId: bucket.epicId,
      epicName: bucket.epicName,
      segments,
      isCommitted: bucket.anyCommitted,
      startDate: segments[0]?.startDate ?? fallbackStart,
      endDate: segments[segments.length - 1]?.endDate ?? fallbackEnd,
    });
  });

  const epicRankById = new Map(epics.map((e, i) => [e.id, i]));
  rows.forEach((r) => {
    r.rank = r.epicId != null ? epicRankById.get(r.epicId) ?? epics.length : Number.MAX_SAFE_INTEGER;
  });
  rows.sort((a, b) => a.rank! - b.rank! || a.epicName.localeCompare(b.epicName));

  return rows;
}

/** Adds segment `s` into `cur` (used when merging FE and BE rows). */
export function addGanttSegment(cur: GanttSegment, s: GanttSegment): void {
  cur.todo += s.todo;
  cur.in_progress += s.in_progress;
  cur.for_integration += s.for_integration;
  cur.done += s.done;
  cur.past += s.past;
  cur.total += s.total;
  cur.committed += s.committed;
  cur.planned += s.planned;
  const carried = { ...cur.carriedTo };
  for (const [k, n] of Object.entries(s.carriedTo)) carried[k] = (carried[k] ?? 0) + n;
  cur.carriedTo = carried;
}
