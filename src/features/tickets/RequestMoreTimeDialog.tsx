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
import { formatHours } from "@/lib/utils";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  ticketId: string;
  currentFE: number;
  currentBE: number;
  actualFE: number;
  actualBE: number;
  /** Disciplines the user is allowed to request changes for. */
  allowedSlots: Array<"FE" | "BE">;
  defaultSlot?: "FE" | "BE";
  onSaved: () => void;
}

export function RequestMoreTimeDialog({
  open,
  onOpenChange,
  ticketId,
  currentFE,
  currentBE,
  actualFE,
  actualBE,
  allowedSlots,
  defaultSlot,
  onSaved,
}: Props) {
  const user = useCurrentUser((s) => s.user);
  const [slot, setSlot] = useState<"FE" | "BE">(
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
  const previous = slot === "FE" ? currentFE : currentBE;
  const next = previous + additional;

  const submit = async () => {
    if (!user) return toast.error("Sign in first");
    if (additional === 0) return toast.error("Enter the additional hours");
    if (!reason.trim()) return toast.error("Reason is required");
    setBusy(true);

    const { error: logErr } = await supabase
      .from("ticket_estimate_changes")
      .insert({
        ticket_id: ticketId,
        user_id: user.id,
        discipline: slot,
        previous_hours: previous,
        new_hours: next,
        reason: reason.trim(),
        status: "approved",
        decided_by: user.id,
        decided_at: new Date().toISOString(),
      });
    if (logErr) {
      setBusy(false);
      return toast.error(logErr.message);
    }

    const patch =
      slot === "FE"
        ? { current_fe_estimate: next }
        : { current_be_estimate: next };
    const { error: tErr } = await supabase
      .from("tickets")
      .update(patch)
      .eq("id", ticketId);
    setBusy(false);
    if (tErr) return toast.error(tErr.message);

    toast.success(`Estimate updated: ${formatHours(previous)} → ${formatHours(next)}`);
    onOpenChange(false);
    onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-strong max-w-md">
        <DialogHeader>
          <DialogTitle>Request more time</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label className="text-xs">Discipline</Label>
            <Select
              value={slot}
              onValueChange={(v) => setSlot(v as "FE" | "BE")}
              disabled={allowedSlots.length === 1}
            >
              <SelectTrigger className="h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {allowedSlots.includes("FE") && (
                  <SelectItem value="FE">Frontend</SelectItem>
                )}
                {allowedSlots.includes("BE") && (
                  <SelectItem value="BE">Backend</SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Additional hours</Label>
            <Input
              type="number"
              step="0.5"
              value={hours}
              onChange={(e) => setHours(e.target.value)}
              placeholder="e.g. 4"
            />
            <div className="flex items-center justify-between text-[11px] text-dim">
              <span>
                {formatHours(previous)} →{" "}
                <span className="text-foreground font-mono">{formatHours(next)}</span>
              </span>
              <span className="text-dimmer">
                Used so far:{" "}
                <span className="text-foreground font-mono">
                  {formatHours(slot === "FE" ? actualFE : actualBE)}
                </span>
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
            Submit
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
