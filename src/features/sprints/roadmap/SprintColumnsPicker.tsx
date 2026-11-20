import { Columns3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { SprintLite } from "./cellRules";

/** Choose which sprints show as columns. `null` resets to the default. The working sprint is always shown. */
export function SprintColumnsPicker({ sprints, workingId, cols, setCols }: {
  sprints: SprintLite[];
  workingId: string | undefined;
  cols: string[];
  setCols: (ids: string[] | null) => void;
}) {
  const label = sprints.filter((s) => cols.includes(s.id)).map((s) => `S${s.sprint_number}`).join(", ");
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5">
          <Columns3 className="h-3.5 w-3.5" /> Sprint columns: <span className="text-foreground">{label || "–"}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-56 p-2 glass-strong">
        <div className="flex justify-between px-1 pb-2 text-[10px]">
          <button type="button" className="text-dim hover:text-foreground" onClick={() => setCols(sprints.map((s) => s.id))}>Show all</button>
          <button type="button" className="text-dim hover:text-foreground" onClick={() => setCols(null)}>Reset to default</button>
        </div>
        <div className="max-h-64 overflow-y-auto space-y-0.5">
          {sprints.map((s) => {
            const locked = s.id === workingId;
            const on = cols.includes(s.id);
            return (
              <label key={s.id} className="flex items-center gap-2 px-1 py-1 rounded hover:bg-white/5 text-xs">
                <Checkbox checked={on} disabled={locked} onCheckedChange={(v) => setCols(v ? [...cols, s.id] : cols.filter((c) => c !== s.id))} />
                Sprint {s.sprint_number}
                {locked && <span className="ml-auto text-[10px] text-accent">working</span>}
              </label>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
