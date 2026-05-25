import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// Caller identity now derived server-side from the JWT — no need to pass user_id.

export function useArchiveProject() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (projectId: string) => {
      const { data, error } = await supabase.functions.invoke("archive-project", {
        body: { project_id: projectId },
      });
      if (error) throw error;
      const payload = (data ?? {}) as {
        error?: string;
        ok?: true;
        vault_storage_path?: string;
        checksum?: string;
        counts?: Record<string, number>;
        cached_total_hours?: number;
        cached_total_cost?: number;
      };
      if (payload.error) throw new Error(payload.error);
      return payload;
    },
    onSuccess: () => {
      toast.success("Project archived to vault");
      qc.invalidateQueries({ queryKey: ["projects"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useVaultDownload() {
  return async (projectId: string, kind: "json" | "xlsx") => {
    const { data, error } = await supabase.functions.invoke("vault-download-url", {
      body: { project_id: projectId, kind },
    });
    const payload = (data ?? {}) as { url?: string; error?: string };
    if (error || payload.error) {
      toast.error(error?.message ?? payload.error ?? "Download failed");
      return;
    }
    if (payload.url) window.open(payload.url, "_blank");
  };
}
