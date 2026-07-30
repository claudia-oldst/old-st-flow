import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

/**
 * Slack notification opt-in/out per project member.
 * A missing row means enabled (notifications are opt-out).
 */
export function useNotificationPrefs(projectId: string, open: boolean) {
  const [prefs, setPrefs] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("project_notification_prefs")
      .select("user_id, slack_enabled")
      .eq("project_id", projectId);
    setLoading(false);
    if (error) return toast.error(error.message);
    const map: Record<string, boolean> = {};
    for (const row of data ?? []) map[row.user_id] = row.slack_enabled;
    setPrefs(map);
  }, [projectId]);

  useEffect(() => {
    if (open) void load();
  }, [open, load]);

  const isEnabled = (userId: string) => prefs[userId] !== false;

  const setEnabled = async (userId: string, enabled: boolean) => {
    setPrefs((p) => ({ ...p, [userId]: enabled }));
    const { error } = await supabase
      .from("project_notification_prefs")
      .upsert(
        { project_id: projectId, user_id: userId, slack_enabled: enabled },
        { onConflict: "project_id,user_id" },
      );
    if (error) {
      toast.error(error.message);
      void load();
    }
  };

  return { prefs, loading, isEnabled, setEnabled, reload: load };
}
