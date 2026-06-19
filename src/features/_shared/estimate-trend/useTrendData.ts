import { useQuery } from "@tanstack/react-query";
import { useRealtimeInvalidate } from "@/hooks/useRealtimeInvalidate";
import { fetchTrendData, type TrendDataset } from "./fetchTrendData";

const EMPTY: TrendDataset = {
  tickets: [],
  changes: [],
  logs: [],
  projectStart: null,
  ticketEpic: new Map(),
};

/**
 * React-query wrapper around {@link fetchTrendData} with realtime invalidation
 * on the four tables that can move any line on the chart.
 *
 * Returned `dataset` is safe to destructure even before the first fetch
 * resolves — it falls back to an `EMPTY` shape rather than `undefined`.
 */
export function useTrendData(projectId: string | undefined) {
  const queryKey = ["estimateTrend", projectId] as const;
  const query = useQuery({
    queryKey,
    enabled: !!projectId,
    queryFn: () => fetchTrendData(projectId!),
  });

  useRealtimeInvalidate(
    projectId
      ? [
          { table: "projects", filter: `id=eq.${projectId}` },
          { table: "tickets", filter: `project_id=eq.${projectId}` },
          { table: "ticket_estimate_changes" },
          { table: "time_logs" },
        ]
      : null,
    queryKey,
    !!projectId,
  );

  return {
    dataset: query.data ?? EMPTY,
    isLoading: query.isPending && !!projectId,
    isError: query.isError,
  };
}
