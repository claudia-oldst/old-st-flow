import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { TicketRow } from "@/features/tickets/useProjectTickets";

export function useTicketEditor({
  ticket,
  userId,
  onChange,
  onClose,
  reloadChanges,
}: {
  ticket: TicketRow | null;
  userId: string | undefined;
  onChange: () => void;
  onClose: () => void;
  reloadChanges: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState("");
  const [feEst, setFeEst] = useState("");
  const [beEst, setBeEst] = useState("");
  const [projEst, setProjEst] = useState("");

  useEffect(() => {
    if (!ticket) return;
    setTitle(ticket.title);
    setFeEst(String(ticket.current_fe_estimate));
    setBeEst(String(ticket.current_be_estimate));
    setProjEst(String(ticket.current_project_estimate));
    setEditing(false);
  }, [ticket]);

  const handleSaveEdit = async () => {
    if (!ticket) return;
    const isProj = ticket.ticket_type === "Proj";
    const fe = parseFloat(feEst) || 0;
    const be = parseFloat(beEst) || 0;
    const pj = parseFloat(projEst) || 0;
    const prevFE = ticket.current_fe_estimate;
    const prevBE = ticket.current_be_estimate;
    const prevProj = ticket.current_project_estimate;

    const patch: any = { title: title.trim() };
    if (isProj) {
      patch.current_project_estimate = pj;
    } else {
      patch.current_fe_estimate = fe;
      patch.current_be_estimate = be;
    }
    const { error } = await supabase
      .from("tickets")
      .update(patch)
      .eq("id", ticket.id);
    if (error) return toast.error(error.message);

    const audit: any[] = [];
    const baseAudit = (discipline: string, prev: number, next: number) => ({
      ticket_id: ticket.id,
      user_id: userId,
      discipline,
      previous_hours: prev,
      new_hours: next,
      reason: "PMBA edit",
      status: "approved",
      decided_by: userId,
      decided_at: new Date().toISOString(),
    });
    if (!isProj && fe !== prevFE) audit.push(baseAudit("FE", prevFE, fe));
    if (!isProj && be !== prevBE) audit.push(baseAudit("BE", prevBE, be));
    if (isProj && pj !== prevProj) audit.push(baseAudit("Project", prevProj, pj));
    if (audit.length && userId) {
      await supabase.from("ticket_estimate_changes").insert(audit);
    }

    toast.success("Saved");
    setEditing(false);
    onChange();
    reloadChanges();
  };

  const handleDelete = async () => {
    if (!ticket) return;
    if (!confirm("Delete this ticket and all its time logs?")) return;
    const { error } = await supabase.from("tickets").delete().eq("id", ticket.id);
    if (error) return toast.error(error.message);
    toast.success("Ticket deleted");
    onClose();
    onChange();
  };

  return {
    editing, setEditing,
    title, setTitle,
    feEst, setFeEst,
    beEst, setBeEst,
    projEst, setProjEst,
    handleSaveEdit, handleDelete,
  };
}
