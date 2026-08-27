import { useState } from "react";
import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/**
 * Shown when the selected discipline has no original estimate yet — logging is
 * blocked until a baseline (possibly 0) is recorded.
 */
export function MissingEstimatePanel({
  disciplineLabel,
  onCancel,
  onSave,
}: {
  disciplineLabel: string;
  onCancel: () => void;
  onSave: (value: string) => Promise<boolean>;
}) {
  const [estimateInput, setEstimateInput] = useState("");
  const [saving, setSaving] = useState(false);

  return (
    <div className="space-y-3 pt-3">
      <div className="text-sm text-dim p-3 rounded-lg bg-amber-500/10 hairline">
        This ticket has no {disciplineLabel} estimate yet. Set the original estimate before
        logging time — enter <span className="font-mono">0</span> if it truly takes no time.
      </div>
      <div className="space-y-2">
        <Label>Original {disciplineLabel} estimate (hours)</Label>
        <Input
          type="number"
          step="0.25"
          min="0"
          value={estimateInput}
          onChange={(e) => setEstimateInput(e.target.value)}
          placeholder="0"
          autoFocus
        />
      </div>
      <DialogFooter>
        <Button variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          onClick={async () => {
            setSaving(true);
            const ok = await onSave(estimateInput);
            setSaving(false);
            if (ok) setEstimateInput("");
          }}
          disabled={saving || estimateInput.trim() === ""}
        >
          Save estimate
        </Button>
      </DialogFooter>
    </div>
  );
}
