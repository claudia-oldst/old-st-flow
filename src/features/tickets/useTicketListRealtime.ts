import { useEffect, useRef } from "react";
import { useQueryClient, type QueryKey } from "@tanstack/react-query";
import { useRealtimeReload } from "@/hooks/useRealtimeReload";

/** Coalesce live changes and defer refreshes until the full project download finishes. */
export function useTicketListRealtime(projectId: string | undefined, queryKey: QueryKey) {
  const qc = useQueryClient();
  const keyRef = useRef(queryKey);
  keyRef.current = queryKey;
  const queued = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const refreshRef = useRef<() => void>(() => {});
  refreshRef.current = () => {
    if (!queued.current || !projectId) return;
    if (qc.isFetching({ queryKey: ["projectTickets", projectId] })) return;
    queued.current = false;
    void qc.invalidateQueries({ queryKey: keyRef.current }, { cancelRefetch: false });
  };
  const schedule = () => {
    queued.current = true;
    clearTimeout(timer.current);
    timer.current = setTimeout(() => { timer.current = undefined; refreshRef.current(); }, 3_000);
  };
  useRealtimeReload(projectId ? [
    { table: "tickets", filter: `project_id=eq.${projectId}` },
    { table: "ticket_assignees" },
    { table: "project_epics", filter: `project_id=eq.${projectId}` },
  ] : null, schedule, !!projectId);
  useEffect(() => {
    const unsubscribe = qc.getQueryCache().subscribe(() => {
      if (queued.current && !timer.current) refreshRef.current();
    });
    return () => { unsubscribe(); clearTimeout(timer.current); timer.current = undefined; queued.current = false; };
  }, [qc, projectId]);
}
