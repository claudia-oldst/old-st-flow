import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { parseTimeLogJson, type JsonLogDraft } from "./parseTimeLogJson";

const EXAMPLE = `[
  { "project": "Cousteau", "tickets": ["COU-934"], "date": "2026-11-26",
    "start time": "09:00", "end time": "10:30", "reason": "Sprint planning" }
]`;

export function PasteTimeLogsDialog({
  open,
  onOpenChange,
  onDrafts,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onDrafts: (drafts: JsonLogDraft[]) => void;
}) {
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);

  const submit = () => {
    const r = parseTimeLogJson(text);
    if (r.ok === false) return setError(r.error);
    if (r.drafts.length === 0) return setError("No log entries found");
    onDrafts(r.drafts);
    setText("");
    setError(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Log time via JSON</DialogTitle>
        </DialogHeader>
        <Textarea
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setError(null);
          }}
          placeholder={EXAMPLE}
          className="min-h-[240px] font-mono text-xs"
          autoFocus
        />
        {error && <p className="text-xs text-destructive">{error}</p>}
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={!text.trim()}>Continue</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
