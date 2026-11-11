import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
export function useParentTicket(id: string | null | undefined, enabled: boolean) {
  return useQuery({
    queryKey: ["ticketParent", id], enabled: !!id && enabled,
    queryFn: async ({ signal }) => {
      if (!id) throw new Error("Parent is required");
      const { data, error } = await supabase.from("tickets").select("id, formatted_id, title").eq("id", id).abortSignal(signal).single();
      if (error) throw error;
      return data;
    },
  });
}
