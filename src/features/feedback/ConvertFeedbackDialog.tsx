import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { DraftRow } from "@/features/tickets/add-dialog/DraftRow";
import type { Draft } from "@/features/tickets/add-dialog/types";
import { useStatuses } from "@/features/statuses/useStatuses";
import type { TicketRow } from "@/features/tickets/useProjectTickets";
import type { ProjectMember, TeamMember } from "@/lib/types";
import { buildConvert, draftFromTicket } from "./convertFeedback";

export function ConvertFeedbackDialog({ open, onOpenChange, ticket, onConverted }: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  ticket: TicketRow;
  onConverted: () => void;
}) {
  const { statuses } = useStatuses();
  const [draft, setDraft] = useState<Draft>(() => draftFromTicket(ticket));
  const [members, setMembers] = useState<(ProjectMember & { member: TeamMember })[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (open) setDraft(draftFromTicket(ticket)); }, [open, ticket.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!open) return;
    supabase.from("project_members").select("*, member:team_members(*)").eq("project_id", ticket.project_id)
      .then(({ data }) => setMembers((data as any) ?? []));
  }, [open, ticket.project_id]);

  const submit = async () => {
    const r = buildConvert(draft, ticket);
    if ("error" in r) return toast.error(r.error);
    setBusy(true);
    try {
      const { data, error } = await supabase.rpc("convert_feedback_ticket" as any, { _ticket_id: ticket.id, ...r.args });
      if (error) throw error;
      if (Object.keys(r.patch).length) {
        const { error: e } = await supabase.from("tickets").update(r.patch as any).eq("id", ticket.id);
        if (e) throw e;
      }
      for (const a of r.removeAssignees) {
        const { error: e } = await supabase.from("ticket_assignees").delete()
          .eq("ticket_id", ticket.id).eq("user_id", a.user_id).eq("slot", a.slot);
        if (e) throw e;
      }
      if (r.addAssignees.length) {
        const { error: e } = await supabase.from("ticket_assignees")
          .insert(r.addAssignees.map((a) => ({ ...a, ticket_id: ticket.id })) as any);
        if (e) throw e;
      }
      toast.success(`Converted to ${draft.type} · ${data}`);
      onOpenChange(false);
      onConverted();
    } catch (e: any) {
      toast.error(e.message ?? "Could not convert");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-strong max-w-4xl">
        <DialogHeader>
          <DialogTitle>Convert to ticket</DialogTitle>
          <div className="text-xs text-dim mt-1">
            Time logs, discussion and original estimates are kept. Anything you don't change stays as it is.
          </div>
        </DialogHeader>
        <DraftRow
          draft={draft} idx={0} statuses={statuses} members={members} projectId={ticket.project_id}
          canDelete={false} isLast={false}
          onChange={(p) => setDraft((d) => ({ ...d, ...p }))}
          onRemove={() => {}} onEnterAtLast={() => {}}
        />
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={busy}>Cancel</Button>
          <Button onClick={submit} disabled={busy}>Convert ticket</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
