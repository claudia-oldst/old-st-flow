import { format, parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CapacityIndicator } from "../CapacityIndicator";
import type { Sprint } from "../types";

/** Sprint picker, FE/BE discipline toggle and total capacity indicator. */
export function WorkbenchTopBar({
  sprints,
  targetSprintId,
  onSprintChange,
  discipline,
  onDisciplineChange,
  pooledHours,
  totalCap,
}: {
  sprints: Sprint[];
  targetSprintId: string;
  onSprintChange: (id: string) => void;
  discipline: "FE" | "BE";
  onDisciplineChange: (d: "FE" | "BE") => void;
  pooledHours: number;
  totalCap: number;
}) {
  return (
    <div className="flex items-center gap-3 flex-wrap">
      <label className="text-[10px] uppercase tracking-wide text-dim">Sprint</label>
      <Select value={targetSprintId} onValueChange={onSprintChange}>
        <SelectTrigger className="h-8 w-56 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {sprints.map((s) => (
            <SelectItem key={s.id} value={s.id}>
              Sprint {s.sprint_number} · {format(parseISO(s.start_date), "MMM d")} →{" "}
              {format(parseISO(s.end_date), "MMM d")}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <div className="inline-flex rounded-md hairline overflow-hidden">
        {(["FE", "BE"] as const).map((d) => (
          <button
            key={d}
            onClick={() => onDisciplineChange(d)}
            className={cn(
              "px-3 h-8 text-xs font-medium transition",
              discipline === d
                ? "bg-accent/15 text-accent"
                : "text-dim hover:text-foreground hover:bg-white/5",
            )}
          >
            {d}
          </button>
        ))}
      </div>

      <div className="ml-auto flex items-center gap-2 min-w-64">
        <span className="text-[10px] uppercase tracking-wide text-dim">Total</span>
        <CapacityIndicator used={pooledHours} cap={totalCap} className="w-56" />
      </div>
    </div>
  );
}
