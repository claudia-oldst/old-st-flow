import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/store/currentUser";
import { toast } from "sonner";

/** Star / unstar a project for the current user. */
export function useToggleFavorite(onChanged?: () => void) {
  const user = useCurrentUser((s) => s.user);

  return useCallback(
    async (projectId: string, next: boolean) => {
      if (!user) return;
      const { error } = next
        ? await supabase.from("project_favorites").insert({ user_id: user.id, project_id: projectId })
        : await supabase
            .from("project_favorites")
            .delete()
            .eq("user_id", user.id)
            .eq("project_id", projectId);

      if (error) {
        toast.error(error.message);
        return;
      }
      onChanged?.();
    },
    [user, onChanged],
  );
}
