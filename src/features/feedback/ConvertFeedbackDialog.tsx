import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useStatuses } from "@/features/statuses/useStatuses";
import { DraftRow } from "@/features/tickets/add-dialog/DraftRow";
import { newDraft, type Draft, type Slot } from "@/features/tickets/add-dialog/types";
import type { TicketRow } from "@/features/tickets/useProjectTickets";
import type { ProjectMember, TeamMember } from "@/lib/types";
import { buildConvertPatch } from "./convertFeedback";

const str = (n: number | null | undefined) => (n == null ? "" : String(n));

function draftFrom(t: TicketRow, statusId: string | null): Draft {
  const pick = (slot: Slot) => new Set(t.assignees.filter((a) => a.slot === slot).map((a) => a.user_id));
  return {
    ...newDraft(statusId, "Standard"),
    title: t.title,
    epicId: t.epic_id,
    fe: str(t.current_fe_estimate),
    be: str(t.current_be_estimate),
    proj: str(t.current_project_estimate),
    version: t.version ?? "",
    parentTicketId: t.parent_ticket_id,
    parentTitle: t.parent?.title ?? null,
    assignees: { fe: pick("FE"), be: pick("BE"), project: pick("Project") },
  };
}

export function ConvertFeedbackDialog({ open, onOpenChange, ticket, onConverted }: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  ticket: TicketRow;
  onConverted: () => void;
}) {
  const { statuses } = useStatuses();
  const backlog = useMemo(() => statuses.find((s) => s.category === "backlog")?.id ?? null, [statuses]);
  const [draft, setDraft] = useState<Draft>(() => draftFrom(ticket, backlog));
  const [members, setMembers] = useState<(ProjectMember & { member: TeamMember })[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setDraft(draftFrom(ticket, backlog));
    supabase.from("project_members").select("*, member:team_members(*)").eq("project_id", ticket.project_id)
      .then(({ data }) => setMembers((data as any) ?? []));
  }, [open, ticket, backlog]);

  const submit = async () => {
    const r = buildConvertPatch(draft);
    if ("error" in r) return toast.error(r.error);
    setBusy(true);
    const fail = (m: string) => { setBusy(false); toast.error(m); };
    const { error } = await supabase.from("tickets").update(r.patch as any).eq("id", ticket.id);
    if (error) return fail(error.message);
    const isProj = draft.type === "Proj";
    const rows = (["fe", "be", "project"] as const).flatMap((k) =>
      isProj && k !== "project" ? [] : [...draft.assignees[k]].map((uid) => ({
        ticket_id: ticket.id, user_id: uid, slot: (k === "fe" ? "FE" : k === "be" ? "BE" : "Project") as Slot,
      })));
    await supabase.from("ticket_assignees").delete().eq("ticket_id", ticket.id);
    if (rows.length) {
      const { error: aErr } = await supabase.from("ticket_assignees").insert(rows);
      if (aErr) return fail(aErr.message);
    }
    const { data, error: cErr } = await supabase.rpc("convert_feedback_ticket" as any, {
      _ticket_id: ticket.id, _new_type: draft.type, _parent_id: draft.type === "Bug" ? draft.parentTicketId : null,
    });
    if (cErr) return fail(cErr.message);
    setBusy(false);
    toast.success(`Converted to ${draft.type} · ${data}`);
    onOpenChange(false);
    onConverted();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-strong max-w-5xl">
        <DialogHeader>
          <DialogTitle>Convert to ticket</DialogTitle>
          <div className="text-xs text-dim mt-1">Confirm the ticket details. It will get the project's next ticket number.</div>
        </DialogHeader>
        <DraftRow
          draft={draft} idx={0} statuses={statuses} members={members} projectId={ticket.project_id}
          canDelete={false} isLast onChange={(p) => setDraft((d) => ({ ...d, ...p }))}
          onRemove={() => {}} onEnterAtLast={submit}
        />
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={busy}>Cancel</Button>
          <Button onClick={submit} disabled={busy}>Convert ticket</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
