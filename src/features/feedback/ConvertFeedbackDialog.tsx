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
import { convertOne, draftFromTicket, planAll } from "./convertFeedback";

/** Converts one or many Feedback tickets using the shared create-ticket row per ticket. */
export function ConvertFeedbackDialog({ open, onOpenChange, tickets, onConverted }: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  tickets: TicketRow[];
  onConverted: () => void;
}) {
  const { statuses } = useStatuses();
  const [drafts, setDrafts] = useState<Draft[]>(() => tickets.map(draftFromTicket));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [members, setMembers] = useState<(ProjectMember & { member: TeamMember })[]>([]);
  const [busy, setBusy] = useState(false);
  const projectId = tickets[0]?.project_id;
  const idsKey = tickets.map((t) => t.id).join(",");

  useEffect(() => { if (open) { setDrafts(tickets.map(draftFromTicket)); setErrors({}); } }, [open, idsKey]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!open || !projectId) return;
    supabase.from("project_members").select("*, member:team_members(*)").eq("project_id", projectId)
      .then(({ data }) => setMembers((data as any) ?? []));
  }, [open, projectId]);

  const submit = async () => {
    const plans = planAll(drafts, tickets);
    const errs: Record<string, string> = {};
    plans.forEach((p) => { if (p.error) errs[p.ticket.id] = p.error; });
    setErrors(errs);
    if (Object.keys(errs).length) return toast.error(`${Object.keys(errs).length} row(s) need fixing before converting`);
    setBusy(true);
    const done = new Set<string>();
    for (const p of plans) {
      try { await convertOne(p.ticket, p.plan!); done.add(p.ticket.id); }
      catch (e: any) { errs[p.ticket.id] = e.message ?? "Could not convert"; }
    }
    setBusy(false);
    setErrors(errs);
    if (done.size) { toast.success(`Converted ${done.size} ticket${done.size > 1 ? "s" : ""}`); onConverted(); }
    const left = drafts.filter((d) => !done.has(d.key));
    if (!left.length) onOpenChange(false);
    else { setDrafts(left); toast.error(`${left.length} ticket(s) could not be converted`); }
  };

  const n = drafts.length;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-strong max-w-4xl">
        <DialogHeader>
          <DialogTitle>{n > 1 ? `Convert ${n} tickets` : "Convert to ticket"}</DialogTitle>
          <div className="text-xs text-dim mt-1">
            Time logs, discussion and original estimates are kept. Anything you don't change stays as it is.
          </div>
        </DialogHeader>
        <div className="max-h-[60vh] overflow-y-auto space-y-2 pr-1">
          {drafts.map((d, i) => (
            <div key={d.key}>
              <DraftRow
                draft={d} idx={i} statuses={statuses} members={members} projectId={projectId}
                canDelete={n > 1} isLast={false}
                onChange={(p) => setDrafts((ds) => ds.map((x) => (x.key === d.key ? { ...x, ...p } : x)))}
                onRemove={() => setDrafts((ds) => ds.filter((x) => x.key !== d.key))}
                onEnterAtLast={() => {}}
              />
              {errors[d.key] && <div className="text-xs text-destructive mt-1 px-1">{errors[d.key]}</div>}
            </div>
          ))}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={busy}>Cancel</Button>
          <Button onClick={submit} disabled={busy || !n}>{n > 1 ? `Convert ${n} tickets` : "Convert ticket"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
