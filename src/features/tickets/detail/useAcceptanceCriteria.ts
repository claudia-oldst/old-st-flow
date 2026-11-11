import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export async function fetchAcceptanceCriteria(ticketId: string, signal?: AbortSignal): Promise<string | null> {
  const request = supabase.from("tickets").select("acceptance_criteria").eq("id", ticketId).single();
  const { data, error } = await (signal ? request.abortSignal(signal) : request);
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Ticket could not be found");
  return data.acceptance_criteria;
}

export function useAcceptanceCriteria(ticketId: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: ["ticketAC", ticketId],
    enabled: !!ticketId && enabled,
    queryFn: ({ signal }) => {
      if (!ticketId) throw new Error("Ticket is required");
      return fetchAcceptanceCriteria(ticketId, signal);
    },
  });
}
