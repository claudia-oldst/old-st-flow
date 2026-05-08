import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/store/currentUser";
import { toast } from "sonner";

export interface RehydrateResult {
  ok?: true;
  missing_users?: string[];
}

export function useRehydrateProject() {
  const qc = useQueryClient();
  const userId = useCurrentUser((s) => s.user?.id);

  return useMutation({
    mutationFn: async (args: {
      projectId: string;
      memberMap?: Record<string, string>;
      deleteVault?: boolean;
    }): Promise<RehydrateResult> => {
      if (!userId) throw new Error("Not signed in");
      const { data, error } = await supabase.functions.invoke("rehydrate-project", {
        body: {
          project_id: args.projectId,
          user_id: userId,
          member_map: args.memberMap ?? {},
          delete_vault: args.deleteVault ?? false,
        },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      return data as RehydrateResult;
    },
    onSuccess: (data) => {
      if (data.ok) {
        toast.success("Project restored from vault");
        qc.invalidateQueries({ queryKey: ["projects"] });
      }
    },
    onError: (e: Error) => toast.error(e.message),
  });
}
