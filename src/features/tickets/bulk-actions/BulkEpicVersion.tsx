import { useState } from "react";
import { Hash, Layers } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { BulkMenuRow } from "./BulkMenu";

const TRIGGER =
  "px-3 py-1.5 rounded-lg text-xs hover:bg-white/5 transition inline-flex items-center gap-1.5 text-dim hover:text-foreground";

export function BulkEpicPopover({
  epics,
  busy,
  onSetEpic,
}: {
  epics: { id: number; epic_name: string | null }[];
  busy: boolean;
  onSetEpic: (id: number | null) => void;
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button disabled={busy} className={TRIGGER}>
          <Layers className="h-3.5 w-3.5" /> Epic
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-1 max-h-72 overflow-auto" align="center" side="top">
        <div className="text-[10px] uppercase tracking-wider text-dimmer px-2 py-1.5">
          Set epic
        </div>
        <BulkMenuRow onClick={() => onSetEpic(null)}>
          <span className="text-dim">No epic</span>
        </BulkMenuRow>
        {epics.map((e) => (
          <BulkMenuRow key={e.id} onClick={() => onSetEpic(e.id)}>
            <span className="truncate">{e.epic_name ?? "Untitled epic"}</span>
          </BulkMenuRow>
        ))}
      </PopoverContent>
    </Popover>
  );
}

export function BulkVersionPopover({
  busy,
  onApply,
}: {
  busy: boolean;
  onApply: (version: string | null) => Promise<void> | void;
}) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");

  const apply = async () => {
    await onApply(value.trim() || null);
    setOpen(false);
    setValue("");
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button disabled={busy} className={TRIGGER}>
          <Hash className="h-3.5 w-3.5" /> Version
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-2" align="center" side="top">
        <div className="text-[10px] uppercase tracking-wider text-dimmer px-1 pb-1.5">
          Set version
        </div>
        <Input
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="e.g. v1 (blank to clear)"
          className="h-8 text-xs"
          onKeyDown={(e) => {
            if (e.key === "Enter") apply();
          }}
        />
        <Button size="sm" className="w-full mt-2 h-7 text-xs" onClick={apply}>
          Apply
        </Button>
      </PopoverContent>
    </Popover>
  );
}
