import { hasPmbaRights } from "@/lib/types";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/store/currentUser";

export const FAVORITES_CHANGED = "pulse:favorites-changed";

export interface QuickProject {
  id: string;
  name: string;
  acronym: string;
  starred: boolean;
}

/** Active projects the user can open, starred first (then by name). */
export function useQuickProjects() {
  const user = useCurrentUser((s) => s.user);
  const [projects, setProjects] = useState<QuickProject[]>([]);

  const load = useCallback(async () => {
    if (!user) return;
    let q = supabase.from("projects").select("id,name,acronym").eq("is_archived", false).order("name");
    if (!hasPmbaRights(user.role)) {
      const { data: mem } = await supabase.from("project_members").select("project_id").eq("user_id", user.id);
      const ids = (mem ?? []).map((r) => r.project_id);
      if (!ids.length) return setProjects([]);
      q = q.in("id", ids);
    }
    const [{ data }, { data: favs }] = await Promise.all([
      q,
      supabase.from("project_favorites").select("project_id").eq("user_id", user.id),
    ]);
    const fav = new Set((favs ?? []).map((f) => f.project_id));
    const rows = (data ?? []).map((p) => ({ ...p, acronym: p.acronym ?? "", starred: fav.has(p.id) }));
    rows.sort((a, b) => Number(b.starred) - Number(a.starred) || a.name.localeCompare(b.name));
    setProjects(rows);
  }, [user]);

  useEffect(() => {
    load();
    window.addEventListener(FAVORITES_CHANGED, load);
    return () => window.removeEventListener(FAVORITES_CHANGED, load);
  }, [load]);

  return projects;
}
