import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/store/currentUser";
import { useProjectRole, isPMBA } from "@/features/team/useProjectRole";
import { formatHours } from "@/lib/utils";
import { toast } from "sonner";

export type AdjustSlot = "FE" | "BE" | "Proj";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  ticketId: string;
  projectId: string;
  currentFE: number;
  currentBE: number;
  actualFE: number;
  actualBE: number;
  /** Optional Proj discipline values, required when allowedSlots includes "Proj". */
  currentProj?: number;
  actualProj?: number;
  /** Disciplines the user is allowed to request changes for. */
  allowedSlots: AdjustSlot[];
  defaultSlot?: AdjustSlot;
  /** Optional contextual blurb shown at the top (e.g. "Used X of Yh — add more to log"). */
  helperText?: string;
  onSaved: () => void;
}

export function RequestMoreTimeDialog({
  open,
  onOpenChange,
  ticketId,
  projectId,
  currentFE,
  currentBE,
  actualFE,
  actualBE,
  currentProj = 0,
  actualProj = 0,
  allowedSlots,
  defaultSlot,
  helperText,
  onSaved,
}: Props) {
  const user = useCurrentUser((s) => s.user);
  const role = useProjectRole(projectId);
  const canAutoApprove = isPMBA(role);
  const [slot, setSlot] = useState<AdjustSlot>(
    defaultSlot ?? allowedSlots[0] ?? "FE"
  );
  const [hours, setHours] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setSlot(defaultSlot ?? allowedSlots[0] ?? "FE");
    setHours("");
    setReason("");
  }, [open, defaultSlot, allowedSlots]);

  const additional = parseFloat(hours) || 0;
  const previous =
    slot === "FE" ? currentFE : slot === "BE" ? currentBE : currentProj;
  const used =
    slot === "FE" ? actualFE : slot === "BE" ? actualBE : actualProj;
  const next = previous + additional;

  const submit = async () => {
    if (!user) return toast.error("Sign in first");
    if (additional === 0) return toast.error("Enter a non-zero adjustment");
    if (next < 0) return toast.error("New estimate cannot be negative");
    if (!reason.trim()) return toast.error("Reason is required");
    setBusy(true);

    const dbDiscipline = slot === "Proj" ? "Project" : slot;
    const { error: logErr } = await supabase
      .from("ticket_estimate_changes")
      .insert({
        ticket_id: ticketId,
        user_id: user.id,
        discipline: dbDiscipline,
        previous_hours: previous,
        new_hours: next,
        reason: reason.trim(),
        status: canAutoApprove ? "approved" : "pending",
        ...(canAutoApprove
          ? { decided_by: user.id, decided_at: new Date().toISOString() }
          : {}),
      });
    if (logErr) {
      setBusy(false);
      return toast.error(logErr.message);
    }

    if (canAutoApprove) {
      const patch =
        slot === "FE"
          ? { current_fe_estimate: next }
          : slot === "BE"
          ? { current_be_estimate: next }
          : { current_project_estimate: next };
      const { error: tErr } = await supabase
        .from("tickets")
        .update(patch)
        .eq("id", ticketId);
      setBusy(false);
      if (tErr) return toast.error(tErr.message);
      toast.success(`Estimate updated: ${formatHours(previous)} → ${formatHours(next)}`);
    } else {
      setBusy(false);
      toast.success("Estimate revision submitted for PMBA approval");
    }
    onOpenChange(false);
    onSaved();
  };

  const slotLabel = (s: AdjustSlot) =>
    s === "FE" ? "Frontend" : s === "BE" ? "Backend" : "Project";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-strong max-w-md">
        <DialogHeader>
          <DialogTitle>{canAutoApprove ? "Adjust estimate" : "Request estimate change"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          {helperText && (
            <div className="text-xs text-primary px-3 py-2 rounded-lg bg-primary/10 hairline">
              {helperText}
            </div>
          )}

          <div className="space-y-1.5">
            <Label className="text-xs">Discipline</Label>
            <Select
              value={slot}
              onValueChange={(v) => setSlot(v as AdjustSlot)}
              disabled={allowedSlots.length === 1}
            >
              <SelectTrigger className="h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {allowedSlots.map((s) => (
                  <SelectItem key={s} value={s}>
                    {slotLabel(s)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Adjustment (hours)</Label>
            <Input
              type="number"
              step="0.5"
              value={hours}
              onChange={(e) => setHours(e.target.value)}
              placeholder="e.g. 4 or -2"
            />
            <p className="text-[11px] text-dimmer">
              Use a negative number to reduce the estimate.
            </p>
            <div className="flex items-center justify-between text-[11px] text-dim">
              <span>
                {formatHours(previous)} →{" "}
                <span className={canAutoApprove ? "text-foreground font-mono" : "text-dim font-mono italic"}>
                  {formatHours(next)}{canAutoApprove ? "" : " (pending)"}
                </span>
              </span>
              <span className="text-dimmer">
                Used so far:{" "}
                <span className="text-foreground font-mono">{formatHours(used)}</span>
              </span>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Reason</Label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Why is more time needed?"
              rows={3}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={busy}>
            {canAutoApprove ? "Submit" : "Submit for approval"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
