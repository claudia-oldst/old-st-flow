import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { EpicSelect } from "@/features/epics/EpicSelect";
import { ParentTicketSelect } from "@/features/tickets/ParentTicketSelect";
import type { TicketRow } from "@/features/tickets/useProjectTickets";
import type { TicketType } from "@/lib/types";
import { buildConvertArgs, type ConvertForm } from "./convertFeedback";

const initial = (t: TicketRow): ConvertForm => ({
  type: "Standard", epicId: t.epic_id, parentTicketId: t.parent_ticket_id,
});

export function ConvertFeedbackDialog({ open, onOpenChange, ticket, onConverted }: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  ticket: TicketRow;
  onConverted: () => void;
}) {
  const [form, setForm] = useState<ConvertForm>(() => initial(ticket));
  const [fromParent, setFromParent] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (open) { setForm(initial(ticket)); setFromParent(false); } }, [open, ticket]);

  const submit = async () => {
    const r = buildConvertArgs(form, ticket.epic_id);
    if ("error" in r) return toast.error(r.error);
    setBusy(true);
    const { data, error } = await supabase.rpc("convert_feedback_ticket" as any, { _ticket_id: ticket.id, ...r.args });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success(`Converted to ${form.type} · ${data}`);
    onOpenChange(false);
    onConverted();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-strong max-w-xl">
        <DialogHeader>
          <DialogTitle>Convert to ticket</DialogTitle>
          <div className="text-xs text-dim mt-1">
            Everything on this ticket is kept — status, estimates, assignees, time logs and discussion. Only the type changes, and it gets the project's next ticket number.
          </div>
        </DialogHeader>
        <div className="space-y-3">
          <div className="text-sm font-medium truncate">{ticket.title}</div>
          <div className="grid grid-cols-3 gap-2 items-start">
            <Select value={form.type} onValueChange={(v) => setForm((f) => ({ ...f, type: v as TicketType }))}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Standard">Standard</SelectItem>
                <SelectItem value="Bug">Bug</SelectItem>
                <SelectItem value="CR">CR</SelectItem>
                <SelectItem value="Proj">Proj</SelectItem>
              </SelectContent>
            </Select>
            {form.type !== "Proj" && (
              <ParentTicketSelect
                projectId={ticket.project_id}
                value={form.parentTicketId}
                size="sm"
                placeholder={form.type === "Bug" ? "Parent ticket (required)…" : "Parent ticket (optional)…"}
                onChange={(id, parent) => {
                  const adopt = parent?.epic_id != null;
                  setFromParent(adopt);
                  setForm((f) => ({ ...f, parentTicketId: id, epicId: adopt ? parent!.epic_id : f.epicId }));
                }}
              />
            )}
            <div>
              <EpicSelect projectId={ticket.project_id} value={form.epicId} size="sm"
                onChange={(id) => { setFromParent(false); setForm((f) => ({ ...f, epicId: id })); }} />
              {fromParent && <div className="text-[10px] text-dimmer mt-1">From parent</div>}
              {form.epicId === null && <div className="text-[10px] text-primary mt-1">Epic required</div>}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={busy}>Cancel</Button>
          <Button onClick={submit} disabled={busy}>Convert ticket</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
