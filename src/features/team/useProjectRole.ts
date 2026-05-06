import { useCurrentUser } from "@/store/currentUser";
import type { ProjectRole } from "@/lib/types";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useRealtimeReload } from "@/hooks/useRealtimeReload";

/**
 * Returns the current user's effective role for the given project.
 *
 * Priority:
 * 1. Project-specific role from `project_members` (if assigned)
 * 2. Global role from `team_members.role` (default for the user)
 */
export function useProjectRole(projectId: string | undefined): ProjectRole | null {
  const user = useCurrentUser((s) => s.user);
  const [role, setRole] = useState<ProjectRole | null>(null);

  const reload = useCallback(() => {
    if (!user) {
      setRole(null);
      return;
    }
    if (!projectId) {
      setRole(user.role ?? null);
      return;
    }
    supabase
      .from("project_members")
      .select("role")
      .eq("project_id", projectId)
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        setRole((data?.role as ProjectRole) ?? user.role ?? null);
      });
  }, [projectId, user]);

  useEffect(() => {
    reload();
  }, [reload]);

  useRealtimeReload(
    projectId
      ? [
          { table: "project_members", filter: `project_id=eq.${projectId}` },
          { table: "team_members" },
        ]
      : null,
    reload,
    !!projectId && !!user,
  );

  return role;
}

/** True if the role grants PM/BA permissions (project-level OR global). */
export function isPMBA(role: ProjectRole | null) {
  return role === "PMBA";
}
