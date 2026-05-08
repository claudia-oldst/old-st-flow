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
import { cn } from "@/lib/utils";
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
    mode,
    setMode,
    busy,
    totalPicked,
    hasProj,
    hasStandard,
    handleSave,
  } = useBulkAssign({
    open,
    projectId,
    ticketIds,
    onSaved,
    onClose: () => onOpenChange(false),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-strong">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-4 w-4" /> Assign to {ticketIds.length} ticket
            {ticketIds.length === 1 ? "" : "s"}
          </DialogTitle>
          <DialogDescription>
            Pick developers and choose whether to add them to existing assignees or replace all current assignees.
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-1 p-1 rounded-lg bg-white/5 hairline w-fit">
          <button
            onClick={() => setMode("add")}
            className={cn(
              "px-3 py-1 text-xs rounded-md transition",
              mode === "add" ? "bg-foreground text-background" : "text-dim hover:text-foreground"
            )}
          >
            Add to existing
          </button>
          <button
            onClick={() => setMode("replace")}
            className={cn(
              "px-3 py-1 text-xs rounded-md transition",
              mode === "replace" ? "bg-foreground text-background" : "text-dim hover:text-foreground"
            )}
          >
            Replace all
          </button>
        </div>

        {mode === "replace" && totalPicked === 0 && (
          <div className="text-xs text-amber-400/90 bg-amber-500/5 hairline rounded-lg px-3 py-2">
            Saving with no one selected will clear all assignees on the selected tickets.
          </div>
        )}

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
                onToggle={(id) => toggle(feUserIds, setFeUserIds, id)}
              />
              <BulkAssignSlot
                label="Backend"
                members={beEligible}
                selected={beUserIds}
                onToggle={(id) => toggle(beUserIds, setBeUserIds, id)}
              />
              <BulkAssignSlot
                label="Project contributors"
                members={otherEligible}
                selected={otherUserIds}
                onToggle={(id) => toggle(otherUserIds, setOtherUserIds, id)}
              />
            </>
          )}
          {hasProj && (
            <BulkAssignSlot
              label={`Project team${hasStandard ? " (Proj tickets only)" : ""}`}
              members={otherEligible}
              selected={projectUserIds}
              onToggle={(id) => toggle(projectUserIds, setProjectUserIds, id)}
            />
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={busy}>
            {mode === "replace" ? "Replace assignees" : "Add assignees"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
