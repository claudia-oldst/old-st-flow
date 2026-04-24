import { useCurrentUser } from "@/store/currentUser";
import type { ProjectRole } from "@/lib/types";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Returns the current user's effective role for the given project.
 *
 * Priority:
 * 1. Project-specific role from `project_members` (if assigned)
 * 2. Global role from `team_members.role` (default for the user)
 */
export function useProjectRole(projectId: string | undefined): ProjectRole | null {
  const user = useCurrentUser((s) => s.user);
  const [role, setRole] = useState<ProjectRole | null>(user?.role ?? null);

  useEffect(() => {
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

  return role;
}

/** True if the role grants PM/BA permissions (project-level OR global). */
export function isPMBA(role: ProjectRole | null) {
  return role === "PMBA";
}
