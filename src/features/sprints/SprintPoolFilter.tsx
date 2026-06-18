import { Check, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import type { Sprint } from "./types";

interface SprintPoolFilterProps {
  label: string;
  sprints: Sprint[];
  plannedSelected: string[];
  committedSelected: number[];
  onPlannedChange: (ids: string[]) => void;
  onCommittedChange: (nums: number[]) => void;
}

export function SprintPoolFilter({
  label,
  sprints,
  plannedSelected,
  committedSelected,
  onPlannedChange,
  onCommittedChange,
}: SprintPoolFilterProps) {
  const plannedCount = plannedSelected.length;
  const committedCount = committedSelected.length;

  const plannedNums = sprints
    .filter((s) => plannedSelected.includes(s.id))
    .map((s) => s.sprint_number)
    .sort((a, b) => a - b);
  const committedNums = [...committedSelected].sort((a, b) => a - b);

  let summary: string;
  if (plannedCount === 0 && committedCount === 0) {
    summary = "Any";
  } else if (committedCount === 0) {
    summary = `Planned: ${plannedNums.map((n) => `S${n}`).join(", ")}`;
  } else if (plannedCount === 0) {
    summary = `Active: ${committedNums.map((n) => `S${n}`).join(", ")}`;
  } else {
    summary = `${plannedCount + committedCount} filters`;
  }

  const togglePlanned = (id: string) => {
    onPlannedChange(
      plannedSelected.includes(id)
        ? plannedSelected.filter((x) => x !== id)
        : [...plannedSelected, id],
    );
  };
  const toggleCommitted = (n: number) => {
    onCommittedChange(
      committedSelected.includes(n)
        ? committedSelected.filter((x) => x !== n)
        : [...committedSelected, n],
    );
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 text-xs h-8">
          <span className="text-dimmer">{label}:</span>
          <span className="text-foreground">{summary}</span>
          <ChevronDown className="h-3 w-3 opacity-60" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64 p-2 glass-strong">
        {/* Planned section */}
        <div className="flex items-center justify-between px-2 pb-2">
          <span className="text-[10px] uppercase tracking-wider text-dimmer">Planned</span>
          <div className="flex items-center gap-1">
            <button
              className="text-[10px] text-dim hover:text-foreground transition"
              onClick={() => onPlannedChange(sprints.map((s) => s.id))}
            >
              All
            </button>
            <span className="text-dimmer">·</span>
            <button
              className="text-[10px] text-dim hover:text-foreground transition"
              onClick={() => onPlannedChange([])}
            >
              None
            </button>
          </div>
        </div>
        <div className="max-h-48 overflow-auto space-y-0.5">
          {sprints.length === 0 && (
            <div className="text-xs text-dim px-2 py-3 text-center">No sprints</div>
          )}
          {sprints.map((s) => {
            const isSel = plannedSelected.includes(s.id);
            return (
              <button
                key={s.id}
                onClick={() => togglePlanned(s.id)}
                className="flex items-center gap-2 w-full px-2 py-1.5 rounded text-xs hover:bg-white/5 transition text-left"
              >
                <span
                  className={cn(
                    "h-3.5 w-3.5 rounded border flex items-center justify-center",
                    isSel ? "bg-primary border-primary text-primary-foreground" : "border-white/20",
                  )}
                >
                  {isSel && <Check className="h-3 w-3" />}
                </span>
                <span className="flex-1 truncate">Sprint {s.sprint_number}</span>
              </button>
            );
          })}
        </div>

        {/* Committed section */}
        <div className="border-t border-white/5 mt-2 pt-2">
          <div className="flex items-center justify-between px-2 pb-2">
            <span className="text-[10px] uppercase tracking-wider text-dimmer">Committed</span>
            <div className="flex items-center gap-1">
              <button
                className="text-[10px] text-dim hover:text-foreground transition"
                onClick={() => onCommittedChange(sprints.map((s) => s.sprint_number))}
              >
                All
              </button>
              <span className="text-dimmer">·</span>
              <button
                className="text-[10px] text-dim hover:text-foreground transition"
                onClick={() => onCommittedChange([])}
              >
                None
              </button>
            </div>
          </div>
          <div className="max-h-48 overflow-auto space-y-0.5">
            {sprints.length === 0 && (
              <div className="text-xs text-dim px-2 py-3 text-center">No sprints</div>
            )}
            {sprints.map((s) => {
              const isSel = committedSelected.includes(s.sprint_number);
              return (
                <button
                  key={s.id}
                  onClick={() => toggleCommitted(s.sprint_number)}
                  className="flex items-center gap-2 w-full px-2 py-1.5 rounded text-xs hover:bg-white/5 transition text-left"
                >
                  <span
                    className={cn(
                      "h-3.5 w-3.5 rounded border flex items-center justify-center",
                      isSel ? "bg-accent/20 border-accent text-accent" : "border-white/20",
                    )}
                  >
                    {isSel && <Check className="h-3 w-3" />}
                  </span>
                  <span className="flex-1 truncate">Sprint {s.sprint_number}</span>
                </button>
              );
            })}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
