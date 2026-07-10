import { useMemo } from "react";
import { parseISO } from "date-fns";
import { useProjectTickets } from "@/features/tickets/useProjectTickets";
import { useProjectEpics } from "@/features/epics/useProjectEpics";
import {
  useProjectMembers,
  useProjectSprintTickets,
  usePlannedSprintAssignments,
} from "../useSprintBoard";
import { memberDisciplines, type Sprint, type SprintDiscipline } from "../types";

export interface GanttSegment {
  sprintId: string;
  startDate: Date;
  endDate: Date;
  todo: number;
  in_progress: number;
  for_integration: number;
  done: number;
  total: number;
  committed: number;
  planned: number;
}

export interface GanttEpicRow {
  epicId: number | null;
  epicName: string;
  segments: GanttSegment[];
  isCommitted: boolean;
  startDate: Date;
  endDate: Date;
}

export function useGanttData(
  projectId: string,
  sprints: Sprint[],
  discipline: SprintDiscipline,
): GanttEpicRow[] {
  const { tickets } = useProjectTickets(projectId);
  const { data: sprintTickets = [] } = useProjectSprintTickets(projectId);
  const { data: members = [] } = useProjectMembers(projectId);
  const { data: planned = [] } = usePlannedSprintAssignments(projectId);
  const { epics } = useProjectEpics(projectId);

  return useMemo<GanttEpicRow[]>(() => {
    if (!sprints.length) return [];

    const sprintById = new Map(sprints.map((s) => [s.id, s]));
    const memberDiscMap = new Map<string, SprintDiscipline[]>();
    members.forEach((m) => memberDiscMap.set(m.user_id, memberDisciplines(m.role)));
    const plannedByTicket = new Map(planned.map((p) => [p.ticket_id, p]));
    const epicNameById = new Map<number, string>();
    epics.forEach((e) => {
      if (e.epic_name) epicNameById.set(e.id, e.epic_name);
    });

    // Fallback range for epics with no segments — use the earliest sprint.
    const sortedSprints = [...sprints].sort(
      (a, b) => parseISO(a.start_date).getTime() - parseISO(b.start_date).getTime(),
    );
    const fallbackStart = parseISO(sortedSprints[0].start_date);
    const fallbackEnd = parseISO(sortedSprints[0].end_date);

    // Group commitments by ticket for fast lookup.
    const commitmentsByTicket = new Map<string, typeof sprintTickets>();
    sprintTickets.forEach((st) => {
      const arr = commitmentsByTicket.get(st.ticket_id) ?? [];
      arr.push(st);
      commitmentsByTicket.set(st.ticket_id, arr);
    });

    interface TicketResolution {
      sprintId: string;
      committed: boolean;
    }

    // epicKey -> sprintId -> aggregation
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
            committed: number;
            planned: number;
          }
        >;
        anyCommitted: boolean;
      }
    >();

    // Seed buckets for every known epic so they render even without tickets/plans.
    epics.forEach((e) => {
      if (!e.epic_name) return;
      epicSegments.set(`e:${e.id}`, {
        epicId: e.id,
        epicName: e.epic_name,
        bySprint: new Map(),
        anyCommitted: false,
      });
    });

    for (const t of tickets) {



      // Resolve effective sprint.
      let res: TicketResolution | null = null;
      const commits = commitmentsByTicket.get(t.id) ?? [];
      for (const st of commits) {
        if (!st.assigned_user_id) continue;
        const discs = memberDiscMap.get(st.assigned_user_id) ?? [];
        if (discs.includes(discipline)) {
          res = { sprintId: st.sprint_id, committed: true };
          break;
        }
      }
      if (!res) {
        const p = plannedByTicket.get(t.id);
        const plannedId =
          discipline === "FE" ? p?.planned_sprint_fe_id : p?.planned_sprint_be_id;
        if (plannedId) res = { sprintId: plannedId, committed: false };
      }
      if (!res) continue;
      if (!sprintById.has(res.sprintId)) continue;

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
      if (res.committed) bucket.anyCommitted = true;

      let seg = bucket.bySprint.get(res.sprintId);
      if (!seg) {
        seg = {
          todo: 0,
          in_progress: 0,
          for_integration: 0,
          done: 0,
          committed: 0,
          planned: 0,
        };
        bucket.bySprint.set(res.sprintId, seg);
      }
      const status = discipline === "FE" ? t.fe_status : t.be_status;
      seg[status] = (seg[status] ?? 0) + 1;
      if (res.committed) seg.committed += 1;
      else seg.planned += 1;
    }

    const rows: GanttEpicRow[] = [];
    epicSegments.forEach((bucket) => {
      const segments: GanttSegment[] = [];
      bucket.bySprint.forEach((counts, sprintId) => {
        const total =
          counts.todo + counts.in_progress + counts.for_integration + counts.done;
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

    rows.sort((a, b) =>
      a.epicName.localeCompare(b.epicName, undefined, { sensitivity: "base" }),
    );

    return rows;
  }, [tickets, sprintTickets, members, planned, epics, sprints, discipline]);
}

