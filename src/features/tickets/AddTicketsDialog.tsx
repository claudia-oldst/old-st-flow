import { useEffect, useMemo, useState } from "react";
import { Plus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useStatuses } from "@/features/statuses/useStatuses";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { ProjectMember, TeamMember, TicketType } from "@/lib/types";
import { Draft, Slot, newDraft } from "./add-dialog/types";
import { DraftRow } from "./add-dialog/DraftRow";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  onCreated: () => void | Promise<void>;
  defaultType?: TicketType;
}

export function AddTicketsDialog({ open, onOpenChange, projectId, onCreated, defaultType = "Standard" }: Props) {
  const { statuses } = useStatuses();
  const defaultStatusId = useMemo(
    () => statuses.find((s) => s.category === "backlog")?.id ?? statuses[0]?.id ?? null,
    [statuses]
  );

  const [drafts, setDrafts] = useState<Draft[]>([newDraft(null, defaultType)]);
  const [members, setMembers] = useState<(ProjectMember & { member: TeamMember })[]>([]);
  const [busy, setBusy] = useState(false);

  // Reset on open & seed first draft with default status
  useEffect(() => {
    if (open) {
      setDrafts([newDraft(defaultStatusId, defaultType)]);
    }
  }, [open, defaultStatusId, defaultType]);

  // Backfill statusId on drafts that don't have one once statuses load
  useEffect(() => {
    if (!defaultStatusId) return;
    setDrafts((prev) =>
      prev.map((d) => (d.statusId ? d : { ...d, statusId: defaultStatusId }))
    );
  }, [defaultStatusId]);

  // Load project members for assign popover
  useEffect(() => {
    if (!open) return;
    supabase
      .from("project_members")
      .select("*, member:team_members(*)")
      .eq("project_id", projectId)
      .then(({ data }) => setMembers((data as any) ?? []));
  }, [open, projectId]);

  const update = (key: string, patch: Partial<Draft>) =>
    setDrafts((prev) => prev.map((d) => (d.key === key ? { ...d, ...patch } : d)));

  const remove = (key: string) =>
    setDrafts((prev) => (prev.length === 1 ? prev : prev.filter((d) => d.key !== key)));

  const addAnother = () => setDrafts((prev) => [...prev, newDraft(defaultStatusId, defaultType)]);

  const validDrafts = drafts.filter((d) => d.title.trim().length > 0);

  const submit = async () => {
    if (validDrafts.length === 0) return;
    setBusy(true);
    const payload = validDrafts.map((d) => {
      const isProj = d.type === "Proj";
      const fe = parseFloat(d.fe) || 0;
      const be = parseFloat(d.be) || 0;
      const proj = parseFloat(d.proj) || 0;
      return {
        project_id: projectId,
        title: d.title.trim(),
        ticket_type: d.type,
        status_id: d.statusId,
        epic_id: d.epicId,
        original_fe_estimate: isProj ? 0 : fe,
        original_be_estimate: isProj ? 0 : be,
        current_fe_estimate: isProj ? 0 : fe,
        current_be_estimate: isProj ? 0 : be,
        original_project_estimate: isProj ? proj : 0,
        current_project_estimate: isProj ? proj : 0,
        ticket_number: 0,
        formatted_id: "",
      };
    });

    const { data: created, error } = await supabase
      .from("tickets")
      .insert(payload as any)
      .select("id");

    if (error || !created) {
      setBusy(false);
      return toast.error(error?.message ?? "Failed to create tickets");
    }

    const assigneeRows: { ticket_id: string; user_id: string; slot: Slot }[] = [];
    created.forEach((row: any, idx: number) => {
      const d = validDrafts[idx];
      if (!d) return;
      const isProj = d.type === "Proj";
      if (isProj) {
        d.assignees.project.forEach((uid) =>
          assigneeRows.push({ ticket_id: row.id, user_id: uid, slot: "Project" })
        );
      } else {
        d.assignees.fe.forEach((uid) =>
          assigneeRows.push({ ticket_id: row.id, user_id: uid, slot: "FE" })
        );
        d.assignees.be.forEach((uid) =>
          assigneeRows.push({ ticket_id: row.id, user_id: uid, slot: "BE" })
        );
        d.assignees.project.forEach((uid) =>
          assigneeRows.push({ ticket_id: row.id, user_id: uid, slot: "Project" })
        );
      }
    });

    if (assigneeRows.length > 0) {
      const { error: aErr } = await supabase.from("ticket_assignees").insert(assigneeRows);
      if (aErr) {
        toast.error("Tickets created, but assignment failed: " + aErr.message);
      }
    }

    try {
      await onCreated();
    } catch {
      /* parent handles its own errors */
    }
    setBusy(false);
    toast.success(
      `Created ${created.length} ticket${created.length === 1 ? "" : "s"}`
    );
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="glass-strong max-w-5xl"
        onKeyDown={(e) => {
          if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
            e.preventDefault();
            submit();
          }
        }}
      >
        <DialogHeader>
          <DialogTitle>Add tickets</DialogTitle>
          <div className="text-xs text-dim mt-1">
            Add one or more tickets. Use “Add another ticket” to queue more before saving.
          </div>
        </DialogHeader>

        <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
          {drafts.map((d, idx) => (
            <DraftRow
              key={d.key}
              draft={d}
              idx={idx}
              statuses={statuses}
              members={members}
              projectId={projectId}
              canDelete={drafts.length > 1}
              isLast={idx === drafts.length - 1}
              onChange={(patch) => update(d.key, patch)}
              onRemove={() => remove(d.key)}
              onEnterAtLast={addAnother}
            />
          ))}
        </div>

        <DialogFooter className="flex sm:justify-between sm:flex-row flex-col gap-2">
          <Button
            variant="ghost"
            onClick={addAnother}
            type="button"
            className="gap-2 sm:mr-auto"
          >
            <Plus className="h-4 w-4" /> Add another ticket
          </Button>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={busy}>
              Cancel
            </Button>
            <Button onClick={submit} disabled={busy || validDrafts.length === 0}>
              Create {validDrafts.length} ticket{validDrafts.length === 1 ? "" : "s"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
