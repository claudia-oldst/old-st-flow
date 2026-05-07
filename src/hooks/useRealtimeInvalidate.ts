import { useQueryClient, type QueryKey } from "@tanstack/react-query";
import { useRealtimeReload, type RealtimeTable } from "./useRealtimeReload";

/**
 * Subscribe to Postgres changes and invalidate a React Query key on any event.
 * Reuses the 50ms coalescing in `useRealtimeReload`.
 */
export function useRealtimeInvalidate(
  tables: RealtimeTable[] | null | undefined,
  queryKey: QueryKey,
  enabled: boolean = true,
) {
  const qc = useQueryClient();
  useRealtimeReload(
    tables,
    () => {
      qc.invalidateQueries({ queryKey });
    },
    enabled,
  );
}
