import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/** A project counts as Thalamus-integrated once any ticket was received from Thalamus. */
export function useHasThalamus(projectId: string | undefined) {
  const { data } = useQuery({
    queryKey: ["hasThalamus", projectId],
    enabled: !!projectId,
    queryFn: async () => {
      const { count } = await supabase
        .from("tickets")
        .select("id", { count: "exact", head: true })
        .eq("project_id", projectId!)
        .eq("external_source", "thalamus");
      return (count ?? 0) > 0;
    },
  });
  return !!data;
}
