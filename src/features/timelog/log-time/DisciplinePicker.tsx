import { cn } from "@/lib/utils";
import type { LogDiscipline } from "@/lib/types";

interface Props {
  isProjTicket: boolean;
  discipline: LogDiscipline;
  setDiscipline: (d: LogDiscipline) => void;
  disciplineOptions: { value: LogDiscipline; label: string }[];
}

export function DisciplinePicker({
  isProjTicket,
  discipline,
  setDiscipline,
  disciplineOptions,
}: Props) {
  if (isProjTicket) {
    return (
      <div className="text-xs text-dim">
        Logging to the shared <span className="text-foreground font-medium">Project</span> estimate.
      </div>
    );
  }
  if (disciplineOptions.length > 1) {
    return (
      <div className="flex gap-1 p-1 rounded-lg bg-white/5 hairline w-fit">
        {disciplineOptions.map((d) => (
          <button
            key={d.value}
            onClick={() => setDiscipline(d.value)}
            className={cn(
              "px-3 py-1 text-xs rounded-md transition",
              discipline === d.value
                ? "bg-foreground text-background"
                : "text-dim hover:text-foreground"
            )}
          >
            {d.label}
          </button>
        ))}
      </div>
    );
  }
  const single = disciplineOptions[0]?.label ?? "Project";
  return (
    <div className="text-xs text-dim">
      Logging to <span className="text-foreground font-medium">{single}</span> hours.
    </div>
  );
}
