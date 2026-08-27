import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { ChangeRow } from "@/features/estimates/useAllEstimateChanges";

/**
 * Approve / reject handling for estimate revision requests, including the
 * rejection dialog state. Approval also applies the delta to the ticket.
 */
export function useChangeDecisions({
  user,
  reload,
}: {
  user: { id: string; name: string } | null;
  reload: () => void;
}) {
  const [rejectTarget, setRejectTarget] = useState<ChangeRow | null>(null);
  const [rejectBusy, setRejectBusy] = useState(false);

  const handleApprove = async (row: ChangeRow) => {
    if (!user) return toast.error("Sign in first");
    if (row.status !== "pending") return toast.message("Already decided");
    const { error: updErr, data: updated } = await supabase
      .from("ticket_estimate_changes")
      .update({ status: "approved", decided_by: user.id, decided_at: new Date().toISOString() })
      .eq("id", row.id)
      .eq("status", "pending")
      .select("id")
      .maybeSingle();
    if (updErr) return toast.error(updErr.message);
    if (!updated) return toast.message("Already decided");

    const t = row.ticket;
    if (t) {
      const patch =
        row.discipline === "FE"
          ? { current_fe_estimate: t.current_fe_estimate + row.delta }
          : row.discipline === "BE"
            ? { current_be_estimate: t.current_be_estimate + row.delta }
            : { current_project_estimate: t.current_project_estimate + row.delta };
      const { error: tErr } = await supabase.from("tickets").update(patch).eq("id", t.id);
      if (tErr) return toast.error(tErr.message);
    }
    toast.success("Estimate revision approved");
    reload();
  };

  const handleReject = (row: ChangeRow) => {
    if (!user) return toast.error("Sign in first");
    if (row.status !== "pending") return toast.message("Already decided");
    setRejectTarget(row);
  };

  const confirmReject = async (rejectionReason: string) => {
    const row = rejectTarget;
    if (!row || !user) return;
    setRejectBusy(true);
    const base = (row.reason ?? "").trim();
    const stamp = `Rejected by ${user.name}: ${rejectionReason}`;
    const combinedReason = base ? `${base}\n\n— ${stamp}` : `— ${stamp}`;
    const { error } = await supabase
      .from("ticket_estimate_changes")
      .update({
        status: "rejected",
        decided_by: user.id,
        decided_at: new Date().toISOString(),
        reason: combinedReason,
      })
      .eq("id", row.id)
      .eq("status", "pending");
    setRejectBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Estimate revision rejected");
    setRejectTarget(null);
    reload();
  };

  return { rejectTarget, setRejectTarget, rejectBusy, handleApprove, handleReject, confirmReject };
}
