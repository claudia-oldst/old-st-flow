import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { versionOptions } from "@/features/health/versionFilter";

/**
 * Distinct ticket versions for a project, formatted as multi-select options
 * (named versions sorted first, "No version" last).
 */
export function useProjectVersions(projectId: string | undefined) {
  const query = useQuery({
    queryKey: ["projectVersions", projectId],
    enabled: !!projectId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tickets")
        .select("version")
        .eq("project_id", projectId!);
      if (error) throw error;
      return versionOptions((data ?? []).map((r) => r.version as string | null));
    },
  });

  return { options: query.data ?? [], loading: query.isPending && !!projectId };
}
