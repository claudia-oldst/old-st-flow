import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/store/currentUser";
import { toast } from "sonner";

export function useArchiveProject() {
  const qc = useQueryClient();
  const userId = useCurrentUser((s) => s.user?.id);

  return useMutation({
    mutationFn: async (projectId: string) => {
      if (!userId) throw new Error("Not signed in");
      const { data, error } = await supabase.functions.invoke("archive-project", {
        body: { project_id: projectId, user_id: userId },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      return data as {
        ok: true;
        vault_storage_path: string;
        checksum: string;
        counts: Record<string, number>;
        cached_total_hours: number;
        cached_total_cost: number;
      };
    },
    onSuccess: () => {
      toast.success("Project archived to vault");
      qc.invalidateQueries({ queryKey: ["projects"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useVaultDownload() {
  const userId = useCurrentUser((s) => s.user?.id);
  return async (projectId: string, kind: "json" | "xlsx") => {
    if (!userId) {
      toast.error("Not signed in");
      return;
    }
    const { data, error } = await supabase.functions.invoke("vault-download-url", {
      body: { project_id: projectId, user_id: userId, kind },
    });
    if (error || (data as any)?.error) {
      toast.error(error?.message ?? (data as any)?.error ?? "Download failed");
      return;
    }
    const url = (data as any)?.url as string;
    if (url) window.open(url, "_blank");
  };
}
