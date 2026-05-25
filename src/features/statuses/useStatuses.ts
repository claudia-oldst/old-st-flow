import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useRealtimeInvalidate } from "@/hooks/useRealtimeInvalidate";
import type { Status } from "@/lib/types";

export function useStatuses() {
  const qc = useQueryClient();
  const queryKey = ["statuses"] as const;

  const query = useQuery({
    queryKey,
    queryFn: async (): Promise<Status[]> => {
      const { data, error } = await supabase.from("statuses").select("*").order("position");
      if (error) {
        throw new Error(`Could not load statuses: ${error.message}`);
      }
      return data ?? [];
    },
  });

  useRealtimeInvalidate([{ table: "statuses" }], queryKey);

  return {
    statuses: query.data ?? [],
    loading: query.isPending,
    error: query.error instanceof Error ? query.error.message : query.error ? String(query.error) : null,
    reload: () => qc.invalidateQueries({ queryKey }),
  };
}
