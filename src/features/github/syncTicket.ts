import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

/**
 * Fire-and-forget GitHub issue sync for a ticket.
 * Silent when the project has no repo configured.
 * Shows a toast on hard failure but never blocks the calling flow.
 */
export async function syncTicketToGithub(ticketId: string): Promise<void> {
  try {
    const { data, error } = await supabase.functions.invoke(
      "github-sync-ticket",
      { body: { ticket_id: ticketId } },
    );
    if (error) {
      console.error("[github-sync-ticket] invoke error", error);
      toast.error(`GitHub sync failed: ${error.message}`);
      return;
    }
    if (data?.skipped) return;
    if (data?.ok === false) {
      toast.error(`GitHub sync failed: ${data.error ?? "unknown"}`);
    }
  } catch (e) {
    console.error("[github-sync-ticket] threw", e);
  }
}
