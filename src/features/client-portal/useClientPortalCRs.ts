import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useRealtimeInvalidate } from "@/hooks/useRealtimeInvalidate";

export interface ClientCRTicket {
  id: string;
  formatted_id: string;
  title: string;
  ticket_type: "CR";
  epic_id: number | null;
  acceptance_criteria: string | null;
  current_fe_estimate: number;
  current_be_estimate: number;
  current_project_estimate: number;
  original_fe_estimate: number;
  original_be_estimate: number;
  original_project_estimate: number;
  actual_frontend_hours: number;
  actual_backend_hours: number;
  actual_project_hours: number;
  cr_approval: "pending" | "approved" | "rejected";
  cr_decided_at: string | null;
  created_at: string;
}

export interface ClientBaselineTicket {
  id: string;
  epic_id: number | null;
  original_fe_estimate: number;
  original_be_estimate: number;
  original_project_estimate: number;
  current_fe_estimate: number;
  current_be_estimate: number;
  current_project_estimate: number;
  actual_frontend_hours: number;
  actual_backend_hours: number;
  actual_project_hours: number;
}

export interface ClientPortalCRPayload {
  project: { id: string; acronym: string; name: string };
  epics: Array<{ id: number; epic_name: string | null }>;
  baseline_tickets: ClientBaselineTicket[];
  cr_tickets: ClientCRTicket[];
}

export function useClientPortalCRsByHash(hash: string | undefined) {
  const queryKey = ["clientPortalCRs", hash] as const;

  const query = useQuery({
    queryKey,
    enabled: !!hash,
    queryFn: async (): Promise<ClientPortalCRPayload | null> => {
      const { data } = await supabase.rpc("get_client_portal_change_requests", {
        _hash: hash!,
      });
      return (data as unknown as ClientPortalCRPayload) ?? null;
    },
  });

  const projectId = query.data?.project?.id;
  useRealtimeInvalidate(
    projectId
      ? [{ table: "tickets", filter: `project_id=eq.${projectId}` }]
      : null,
    queryKey,
    !!projectId,
  );

  return {
    data: query.data ?? null,
    loading: query.isPending && !!hash,
    refresh: () => query.refetch(),
  };
}
