import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  originalReason: string | null;
  busy?: boolean;
  onConfirm: (reason: string) => void | Promise<void>;
}

export function RejectEstimateRevisionDialog({
  open,
  onOpenChange,
  originalReason,
  busy,
  onConfirm,
}: Props) {
  const [reason, setReason] = useState("");

  useEffect(() => {
    if (open) setReason("");
  }, [open]);

  const canSubmit = reason.trim().length > 0 && !busy;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reject estimate revision</DialogTitle>
          <DialogDescription>
            Provide a reason for rejecting this estimate revision. It will be
            appended to the original request.
          </DialogDescription>
        </DialogHeader>

        {originalReason?.trim() && (
          <div className="rounded-md hairline bg-white/[0.02] p-3 text-xs text-dim whitespace-pre-wrap">
            <div className="text-[10px] uppercase tracking-wider text-dimmer mb-1">
              Original reason
            </div>
            {originalReason}
          </div>
        )}

        <div className="space-y-1.5">
          <label className="text-xs text-dim">Rejection reason</label>
          <Textarea
            autoFocus
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Why are you rejecting this estimate revision?"
            rows={4}
          />
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={busy}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            disabled={!canSubmit}
            onClick={() => onConfirm(reason.trim())}
          >
            Reject estimate revision
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
