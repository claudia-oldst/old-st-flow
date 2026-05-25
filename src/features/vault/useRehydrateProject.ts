import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface RehydrateResult {
  ok?: true;
  missing_users?: string[];
}

// Caller identity now derived server-side from the JWT — no need to pass user_id.

export function useRehydrateProject() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (args: {
      projectId: string;
      memberMap?: Record<string, string>;
      deleteVault?: boolean;
    }): Promise<RehydrateResult> => {
      const { data, error } = await supabase.functions.invoke("rehydrate-project", {
        body: {
          project_id: args.projectId,
          member_map: args.memberMap ?? {},
          delete_vault: args.deleteVault ?? false,
        },
      });
      if (error) throw error;
      const payload = (data ?? {}) as RehydrateResult & { error?: string };
      if (payload.error) throw new Error(payload.error);
      return payload;
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
