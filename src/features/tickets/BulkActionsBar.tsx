import { useState } from "react";
import { X, Trash2, Tag, Layers, Hash, Code2, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useStatuses } from "@/features/statuses/useStatuses";
import { useProjectEpics } from "@/features/epics/useProjectEpics";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { DISCIPLINE_STATUS_LABEL, type DisciplineStatus } from "@/lib/types";
import { BulkAssignDialog } from "@/features/tickets/BulkAssignDialog";
import { BulkMenu, BulkMenuRow } from "./bulk-actions/BulkMenu";
import { syncTicketsToGithub } from "@/features/github/syncTicket";

const DISC_OPTS: DisciplineStatus[] = ["todo", "in_progress", "for_integration", "done"];

type TicketPatch = {
  status_id?: string | null;
  project_status_override?: boolean;
  epic_id?: number | null;
  fe_status?: DisciplineStatus;
  be_status?: DisciplineStatus;
  version?: string | null;
};

export function BulkActionsBar({
  projectId,
  selectedIds,
  onClear,
  canEdit,
}: {
  projectId: string;
  selectedIds: string[];
  onClear: () => void;
  canEdit: boolean;
}) {
  const { statuses } = useStatuses();
  const { epics } = useProjectEpics(projectId);
  const [versionOpen, setVersionOpen] = useState(false);
  const [versionVal, setVersionVal] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  if (selectedIds.length === 0) return null;

  const update = async (patch: TicketPatch, msg: string) => {
    setBusy(true);
    const { error } = await supabase.from("tickets").update(patch).in("id", selectedIds);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success(
      `${msg} for ${selectedIds.length} ticket${selectedIds.length === 1 ? "" : "s"}`
    );
  };

  const setStatus = (status_id: string | null) =>
    update({ status_id, project_status_override: status_id !== null }, "Status updated");
  const setEpic = (epic_id: number | null) => update({ epic_id }, "Epic updated");
  const setFeStatus = (fe_status: DisciplineStatus) =>
    update({ fe_status }, "FE status updated");
  const setBeStatus = (be_status: DisciplineStatus) =>
    update({ be_status }, "BE status updated");

  const applyVersion = async () => {
    const v = versionVal.trim() || null;
    await update({ version: v }, "Version updated");
    setVersionOpen(false);
    setVersionVal("");
  };

  const doDelete = async () => {
    setBusy(true);
    const { error } = await supabase.from("tickets").delete().in("id", selectedIds);
    setBusy(false);
    setConfirmDelete(false);
    if (error) return toast.error(error.message);
    toast.success(
      `Deleted ${selectedIds.length} ticket${selectedIds.length === 1 ? "" : "s"}`
    );
    onClear();
  };

  return (
    <>
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-bottom-2 duration-200">
        <div className="glass-strong hairline rounded-2xl shadow-2xl px-2 py-1.5 flex items-center gap-1">
          <div className="flex items-center gap-2 px-3 py-1.5 border-r border-white/10">
            <span className="inline-flex items-center justify-center min-w-6 h-6 px-1.5 rounded-md bg-accent text-background text-xs font-mono font-medium">
              {selectedIds.length}
            </span>
            <span className="text-xs text-dim">selected</span>
          </div>

          {canEdit && (
            <>
              <button
                disabled={busy}
                onClick={() => setAssignOpen(true)}
                className="px-3 py-1.5 rounded-lg text-xs hover:bg-white/5 transition inline-flex items-center gap-1.5 text-dim hover:text-foreground"
              >
                <Users className="h-3.5 w-3.5" /> Assign
              </button>

              <BulkMenu icon={Tag} label="Status" title="Set status" disabled={busy}>
                {statuses.map((s) => (
                  <BulkMenuRow key={s.id} onClick={() => setStatus(s.id)}>
                    <span className="h-2 w-2 rounded-full" style={{ background: s.color }} />
                    <span className="truncate">{s.name}</span>
                  </BulkMenuRow>
                ))}
              </BulkMenu>

              <BulkMenu
                icon={Code2}
                label="FE"
                title="Set FE status"
                disabled={busy}
                width="w-44"
              >
                {DISC_OPTS.map((s) => (
                  <BulkMenuRow key={s} onClick={() => setFeStatus(s)}>
                    {DISCIPLINE_STATUS_LABEL[s]}
                  </BulkMenuRow>
                ))}
              </BulkMenu>

              <BulkMenu
                icon={Code2}
                label="BE"
                title="Set BE status"
                disabled={busy}
                width="w-44"
              >
                {DISC_OPTS.map((s) => (
                  <BulkMenuRow key={s} onClick={() => setBeStatus(s)}>
                    {DISCIPLINE_STATUS_LABEL[s]}
                  </BulkMenuRow>
                ))}
              </BulkMenu>

              <Popover>
                <PopoverTrigger asChild>
                  <button
                    disabled={busy}
                    className="px-3 py-1.5 rounded-lg text-xs hover:bg-white/5 transition inline-flex items-center gap-1.5 text-dim hover:text-foreground"
                  >
                    <Layers className="h-3.5 w-3.5" /> Epic
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-56 p-1 max-h-72 overflow-auto" align="center" side="top">
                  <div className="text-[10px] uppercase tracking-wider text-dimmer px-2 py-1.5">
                    Set epic
                  </div>
                  <BulkMenuRow onClick={() => setEpic(null)}>
                    <span className="text-dim">No epic</span>
                  </BulkMenuRow>
                  {epics.map((e) => (
                    <BulkMenuRow key={e.id} onClick={() => setEpic(e.id)}>
                      <span className="truncate">{e.epic_name ?? "Untitled epic"}</span>
                    </BulkMenuRow>
                  ))}
                </PopoverContent>
              </Popover>

              <Popover open={versionOpen} onOpenChange={setVersionOpen}>
                <PopoverTrigger asChild>
                  <button
                    disabled={busy}
                    className="px-3 py-1.5 rounded-lg text-xs hover:bg-white/5 transition inline-flex items-center gap-1.5 text-dim hover:text-foreground"
                  >
                    <Hash className="h-3.5 w-3.5" /> Version
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-56 p-2" align="center" side="top">
                  <div className="text-[10px] uppercase tracking-wider text-dimmer px-1 pb-1.5">
                    Set version
                  </div>
                  <Input
                    autoFocus
                    value={versionVal}
                    onChange={(e) => setVersionVal(e.target.value)}
                    placeholder="e.g. v1 (blank to clear)"
                    className="h-8 text-xs"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") applyVersion();
                    }}
                  />
                  <Button size="sm" className="w-full mt-2 h-7 text-xs" onClick={applyVersion}>
                    Apply
                  </Button>
                </PopoverContent>
              </Popover>

              <div className="w-px h-6 bg-white/10 mx-1" />

              <button
                disabled={busy}
                onClick={() => setConfirmDelete(true)}
                className="px-3 py-1.5 rounded-lg text-xs hover:bg-destructive/15 transition inline-flex items-center gap-1.5 text-dim hover:text-destructive"
              >
                <Trash2 className="h-3.5 w-3.5" /> Delete
              </button>
            </>
          )}

          <div className={cn("w-px h-6 bg-white/10", canEdit ? "mx-1" : "")} />

          <button
            onClick={onClear}
            className="px-2 py-1.5 rounded-lg hover:bg-white/5 transition text-dim hover:text-foreground"
            aria-label="Clear selection"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      <BulkAssignDialog
        open={assignOpen}
        onOpenChange={setAssignOpen}
        projectId={projectId}
        ticketIds={selectedIds}
        onSaved={() => {}}
      />

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete {selectedIds.length} ticket{selectedIds.length === 1 ? "" : "s"}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. All time logs and assignees for these tickets will also be removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={doDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
