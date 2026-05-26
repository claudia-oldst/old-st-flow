import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useProjectRepoUrl(projectId: string | undefined) {
  const { data } = useQuery({
    queryKey: ["projectRepoUrl", projectId],
    enabled: !!projectId,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("github_repo_url")
        .eq("id", projectId!)
        .maybeSingle();
      if (error) return null;
      return data?.github_repo_url ?? null;
    },
  });
  return data ?? null;
}
