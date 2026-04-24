import { useCurrentUser } from "@/store/currentUser";
import type { ProjectMember, ProjectRole } from "@/lib/types";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/** Returns the current user's project_role on the given project, or null. */
export function useProjectRole(projectId: string | undefined): ProjectRole | null {
  const user = useCurrentUser((s) => s.user);
  const [role, setRole] = useState<ProjectRole | null>(null);

  useEffect(() => {
    if (!projectId || !user) {
      setRole(null);
      return;
    }
    supabase
      .from("project_members")
      .select("role")
      .eq("project_id", projectId)
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => setRole((data?.role as ProjectRole) ?? null));
  }, [projectId, user]);

  return role;
}

export function isPMBA(role: ProjectRole | null) {
  return role === "PMBA";
}
