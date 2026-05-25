import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/store/currentUser";

/**
 * Returns whether the current user has access to the given project.
 * PMBA users always have access; everyone else must have a `project_members` row.
 * `loading` is true while the membership check is in flight.
 */
export function useProjectAccess(projectId: string | undefined) {
  const user = useCurrentUser((s) => s.user);
  const isPMBA = user?.role === "PMBA";

  const query = useQuery({
    queryKey: ["projectAccess", projectId, user?.id],
    enabled: !!user && !!projectId && !isPMBA,
    queryFn: async () => {
      const { data } = await supabase
        .from("project_members")
        .select("user_id")
        .eq("project_id", projectId!)
        .eq("user_id", user!.id)
        .maybeSingle();
      return !!data;
    },
  });

  if (!user) return { allowed: false, loading: false };
  if (isPMBA) return { allowed: true, loading: false };
  return { allowed: !!query.data, loading: query.isPending };
}
