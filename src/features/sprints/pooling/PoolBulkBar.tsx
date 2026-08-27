import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Sprint } from "../types";

function PoolBulkMenu({
  label,
  sprints,
  onPick,
}: {
  label: string;
  sprints: Sprint[];
  onPick: (sprintId: string | null) => void;
}) {
  return (
    <Select onValueChange={(v) => onPick(v === "__none__" ? null : v)}>
      <SelectTrigger className="h-8 w-32 text-xs">
        <SelectValue placeholder={label} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="__none__">Clear pool</SelectItem>
        {sprints.map((s) => (
          <SelectItem key={s.id} value={s.id}>
            Sprint {s.sprint_number}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/** Floating bar for assigning the current selection to a planned sprint pool. */
export function PoolBulkBar({
  sprints,
  onUpdate,
}: {
  sprints: Sprint[];
  onUpdate: (discipline: "FE" | "BE", sprintId: string | null) => void;
}) {
  return (
    <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 glass-strong hairline rounded-2xl shadow-2xl px-2 py-1.5 flex items-center gap-1 animate-in fade-in slide-in-from-bottom-2 duration-200">
      <span className="text-[10px] uppercase tracking-wider text-dim px-2">Pool</span>
      <PoolBulkMenu label="FE Sprint" sprints={sprints} onPick={(sid) => onUpdate("FE", sid)} />
      <PoolBulkMenu label="BE Sprint" sprints={sprints} onPick={(sid) => onUpdate("BE", sid)} />
      <button
        onClick={() => onUpdate("FE", null)}
        className="px-3 py-1.5 rounded-lg text-xs hover:bg-white/5 transition text-dim hover:text-foreground"
      >
        Clear FE
      </button>
      <button
        onClick={() => onUpdate("BE", null)}
        className="px-3 py-1.5 rounded-lg text-xs hover:bg-white/5 transition text-dim hover:text-foreground"
      >
        Clear BE
      </button>
    </div>
  );
}
