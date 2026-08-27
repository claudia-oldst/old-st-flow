import { useState } from "react";
import { X, Trash2, Tag, Code2, Users } from "lucide-react";
import { useStatuses } from "@/features/statuses/useStatuses";
import { useProjectEpics } from "@/features/epics/useProjectEpics";
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
import { cn } from "@/lib/utils";
import { DISCIPLINE_STATUS_LABEL, type DisciplineStatus } from "@/lib/types";
import { BulkAssignDialog } from "@/features/tickets/BulkAssignDialog";
import { BulkMenu, BulkMenuRow } from "./bulk-actions/BulkMenu";
import { BulkEpicPopover, BulkVersionPopover } from "./bulk-actions/BulkEpicVersion";
import { useBulkTicketActions } from "./bulk-actions/useBulkTicketActions";

const DISC_OPTS: DisciplineStatus[] = ["todo", "in_progress", "for_integration", "done"];

export function BulkActionsBar({
  projectId,
  selectedIds,
  onClear,
  canEdit,
  canEditStatus = false,
}: {
  projectId: string;
  selectedIds: string[];
  onClear: () => void;
  canEdit: boolean;
  canEditStatus?: boolean;
}) {
  const { statuses } = useStatuses();
  const { epics } = useProjectEpics(projectId);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const { busy, setStatus, setEpic, setFeStatus, setBeStatus, setVersion, doDelete } =
    useBulkTicketActions(selectedIds, onClear);

  const showStatus = canEdit || canEditStatus;

  if (selectedIds.length === 0) return null;

  const confirmAndDelete = async () => {
    setConfirmDelete(false);
    await doDelete();
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
            <button
              disabled={busy}
              onClick={() => setAssignOpen(true)}
              className="px-3 py-1.5 rounded-lg text-xs hover:bg-white/5 transition inline-flex items-center gap-1.5 text-dim hover:text-foreground"
            >
              <Users className="h-3.5 w-3.5" /> Assign
            </button>
          )}

          {showStatus && (
            <>
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
            </>
          )}

          {canEdit && (
            <>
              <BulkEpicPopover epics={epics} busy={busy} onSetEpic={setEpic} />
              <BulkVersionPopover
                busy={busy}
                onApply={async (v) => {
                  await setVersion(v);
                }}
              />



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
              onClick={confirmAndDelete}
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
