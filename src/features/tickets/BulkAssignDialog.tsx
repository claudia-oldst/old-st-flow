import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Users } from "lucide-react";
import { BulkAssignSlot } from "./bulk-assign/BulkAssignSlot";
import { useBulkAssign } from "./bulk-assign/useBulkAssign";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  ticketIds: string[];
  onSaved: () => void;
}

export function BulkAssignDialog({
  open,
  onOpenChange,
  projectId,
  ticketIds,
  onSaved,
}: Props) {
  const {
    feEligible,
    beEligible,
    otherEligible,
    feUserIds,
    setFeUserIds,
    beUserIds,
    setBeUserIds,
    otherUserIds,
    setOtherUserIds,
    projectUserIds,
    setProjectUserIds,
    toggle,
    busy,
    hasProj,
    hasStandard,
    partial,
    diff,
    handleSave,
  } = useBulkAssign({
    open,
    projectId,
    ticketIds,
    onSaved,
    onClose: () => onOpenChange(false),
  });

  const noChanges = diff.added === 0 && diff.removed === 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-strong">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-4 w-4" /> Assign to {ticketIds.length} ticket
            {ticketIds.length === 1 ? "" : "s"}
          </DialogTitle>
          <DialogDescription>
            Highlighted chips are currently assigned. Click to toggle on or off — changes apply to all selected tickets on save.
          </DialogDescription>
        </DialogHeader>

        {hasProj && hasStandard && (
          <div className="text-xs text-dim bg-white/5 hairline rounded-lg px-3 py-2">
            Selection mixes Proj tickets with Standard/Bug/CR tickets. FE/BE/Other picks apply only to non-Proj tickets; Project picks apply only to Proj tickets.
          </div>
        )}

        <div className="space-y-6 pt-2 max-h-[50vh] overflow-y-auto">
          {hasStandard && (
            <>
              <BulkAssignSlot
                label="Frontend"
                members={feEligible}
                selected={feUserIds}
                partial={partial.FE}
                onToggle={(id) => toggle(feUserIds, setFeUserIds, id)}
              />
              <BulkAssignSlot
                label="Backend"
                members={beEligible}
                selected={beUserIds}
                partial={partial.BE}
                onToggle={(id) => toggle(beUserIds, setBeUserIds, id)}
              />
              <BulkAssignSlot
                label="Project contributors"
                members={otherEligible}
                selected={otherUserIds}
                partial={partial.OtherStd}
                onToggle={(id) => toggle(otherUserIds, setOtherUserIds, id)}
              />
            </>
          )}
          {hasProj && (
            <BulkAssignSlot
              label={`Project team${hasStandard ? " (Proj tickets only)" : ""}`}
              members={otherEligible}
              selected={projectUserIds}
              partial={partial.Proj}
              onToggle={(id) => toggle(projectUserIds, setProjectUserIds, id)}
            />
          )}
        </div>

        <DialogFooter className="items-center sm:justify-between">
          <div className="text-xs text-dim font-mono">
            {noChanges ? (
              "No changes"
            ) : (
              <>
                {diff.added > 0 && <span className="text-emerald-400">+{diff.added} added</span>}
                {diff.added > 0 && diff.removed > 0 && <span className="text-dim"> · </span>}
                {diff.removed > 0 && <span className="text-rose-400">−{diff.removed} removed</span>}
              </>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={busy || noChanges}>
              Save assignments
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
