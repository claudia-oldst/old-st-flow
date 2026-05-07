import { useCurrentUser } from "@/store/currentUser";
import type { ProjectRole } from "@/lib/types";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useRealtimeInvalidate } from "@/hooks/useRealtimeInvalidate";

/**
 * Returns the current user's effective role for the given project.
 * Project-specific role from `project_members` overrides global `team_members.role`.
 */
export function useProjectRole(projectId: string | undefined): ProjectRole | null {
  const user = useCurrentUser((s) => s.user);
  const queryKey = ["projectRole", projectId, user?.id] as const;

  const query = useQuery({
    queryKey,
    enabled: !!user && !!projectId,
    queryFn: async (): Promise<ProjectRole | null> => {
      const { data } = await supabase
        .from("project_members")
        .select("role")
        .eq("project_id", projectId!)
        .eq("user_id", user!.id)
        .maybeSingle();
      return (data?.role as ProjectRole) ?? user!.role ?? null;
    },
  });

  useRealtimeInvalidate(
    projectId
      ? [
          { table: "project_members", filter: `project_id=eq.${projectId}` },
          { table: "team_members" },
        ]
      : null,
    queryKey,
    !!projectId && !!user,
  );

  if (!user) return null;
  if (!projectId) return user.role ?? null;
  return query.data ?? null;
}

/** True if the role grants PM/BA permissions (project-level OR global). */
export function isPMBA(role: ProjectRole | null) {
  return role === "PMBA";
}
