import { useRef } from "react";
import { useQueryClient, type QueryClient, type QueryKey } from "@tanstack/react-query";
import { useRealtimeReload, type RealtimeChange } from "@/hooks/useRealtimeReload";
import { patchEpicInCaches, refreshTicketRows } from "./ticketCachePatch";

/** Short wait so a burst of row writes becomes one small request. */
export const PATCH_DEBOUNCE_MS = 300;

/** Ticket ids touched by a batch of realtime changes. */
export function changedTicketIds(changes: RealtimeChange[]): string[] {
  const ids = new Set<string>();
  for (const c of changes) {
    const key = c.table === "tickets" ? "id" : c.table === "ticket_assignees" ? "ticket_id" : null;
    if (!key) continue;
    for (const row of [c.new, c.old]) {
      const v = row?.[key];
      if (typeof v === "string") ids.add(v);
    }
  }
  return [...ids];
}

// One queue per project, shared by every list on screen, so two lists never
// download the same changed ticket twice.
const queues = new Map<string, { ids: Set<string>; timer?: ReturnType<typeof setTimeout> }>();

export function queueTicketRefresh(qc: QueryClient, projectId: string, ids: string[]) {
  if (ids.length === 0) return;
  const q = queues.get(projectId) ?? { ids: new Set<string>() };
  queues.set(projectId, q);
  ids.forEach((id) => q.ids.add(id));
  clearTimeout(q.timer);
  q.timer = setTimeout(() => flush(qc, projectId), PATCH_DEBOUNCE_MS);
}

function flush(qc: QueryClient, projectId: string) {
  const q = queues.get(projectId);
  if (!q) return;
  q.timer = undefined;
  // While the full list is still downloading, wait; later pages already carry
  // fresh data and the patch runs once the download finishes.
  if (qc.isFetching({ queryKey: ["projectTickets", projectId] })) {
    q.timer = setTimeout(() => flush(qc, projectId), 1_000);
    return;
  }
  const ids = [...q.ids];
  q.ids.clear();
  void refreshTicketRows(qc, projectId, ids).catch(() => {
    ids.forEach((id) => q.ids.add(id));
    q.timer = setTimeout(() => flush(qc, projectId), 5_000);
  });
}

/** Keep cached ticket lists live by patching only the rows that changed. */
export function useTicketListRealtime(projectId: string | undefined, _queryKey?: QueryKey) {
  const qc = useQueryClient();
  const pid = useRef(projectId);
  pid.current = projectId;
  useRealtimeReload(projectId ? [
    { table: "tickets", filter: `project_id=eq.${projectId}` },
    { table: "ticket_assignees" },
    { table: "project_epics", filter: `project_id=eq.${projectId}` },
  ] : null, (changes) => {
    const id = pid.current;
    if (!id) return;
    for (const c of changes) {
      if (c.table === "project_epics" && c.eventType !== "DELETE" && typeof c.new.id === "number") {
        patchEpicInCaches(qc, id, c.new.id, (c.new.epic_name as string | null) ?? null);
      }
    }
    queueTicketRefresh(qc, id, changedTicketIds(changes));
  }, !!projectId);
}
