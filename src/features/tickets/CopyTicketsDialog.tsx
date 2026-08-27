import { useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { parsePastedTitles, countDuplicates } from "./add-dialog/parsePastedTitles";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onParsed: (titles: string[]) => void;
}

export function CopyTicketsDialog({ open, onOpenChange, onParsed }: Props) {
  const [text, setText] = useState("");

  const titles = useMemo(() => parsePastedTitles(text), [text]);
  const dupes = useMemo(() => countDuplicates(titles), [titles]);

  const close = () => {
    setText("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && close()}>
      <DialogContent className="glass-strong max-w-2xl">
        <DialogHeader>
          <DialogTitle>Copy tickets</DialogTitle>
          <div className="text-xs text-dim mt-1">
            Paste one ticket per line — copy a column straight from Excel or Sheets. Only the first
            column is used as the title.
          </div>
        </DialogHeader>

        <Textarea
          autoFocus
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={"Admin/HR Concerns\nProject Pulse (Lovable)\nInternal - Old St. Operations"}
          className="min-h-[240px] text-sm font-mono"
        />

        <div className="text-xs text-dim">
          {titles.length === 0 ? (
            "No tickets detected yet — paste at least one line."
          ) : (
            <>
              <span className="text-foreground font-medium">{titles.length}</span> ticket
              {titles.length === 1 ? "" : "s"} detected
              {dupes > 0 && (
                <span className="text-dimmer"> · {dupes} duplicate{dupes === 1 ? "" : "s"} will be kept</span>
              )}
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={close}>
            Cancel
          </Button>
          <Button
            disabled={titles.length === 0}
            onClick={() => {
              onParsed(titles);
              setText("");
            }}
          >
            Continue
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
