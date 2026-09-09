import { format, parseISO } from "date-fns";
import { Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import type { Sprint } from "@/features/sprints/types";
import type { SprintChoice } from "./useSprintChoice";

function rangeLabel(s: Sprint) {
  return `${format(parseISO(s.start_date), "d MMM")} – ${format(parseISO(s.end_date), "d MMM yyyy")}`;
}

function Pill({
  label,
  title,
  active,
  onClick,
}: {
  label: string;
  title?: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={cn(
        "h-7 px-2.5 rounded-full text-xs hairline transition whitespace-nowrap",
        active
          ? "bg-primary/20 text-primary border-primary/40"
          : "bg-white/[0.03] text-dim hover:bg-white/[0.07]",
      )}
    >
      {label}
    </button>
  );
}

export function SprintPicker({
  projectId,
  sprints,
  choice,
  onChange,
}: {
  projectId: string;
  sprints: Sprint[];
  choice: SprintChoice;
  onChange: (c: SprintChoice) => void;
}) {
  const navigate = useNavigate();

  return (
    <div className="space-y-1.5">
      <div className="text-xs uppercase tracking-wide text-dimmer">Sprint</div>
      <div className="flex flex-wrap items-center gap-1.5">
        {sprints.map((s) => (
          <Pill
            key={s.id}
            label={s.name ?? `Sprint ${s.sprint_number}`}
            title={rangeLabel(s)}
            active={choice === s.id}
            onClick={() => onChange(s.id)}
          />
        ))}
        {sprints.length > 0 && <span className="text-dimmer text-xs px-1">|</span>}
        <Pill label="No sprint" active={choice === "none"} onClick={() => onChange("none")} />
        {sprints.length === 0 && (
          <button
            type="button"
            onClick={() => navigate(`/projects/${projectId}/sprints`)}
            className="h-7 px-2.5 rounded-full text-xs hairline bg-white/[0.03] text-dim hover:bg-white/[0.07] inline-flex items-center gap-1"
          >
            <Plus className="h-3 w-3" /> Create a sprint
          </button>
        )}
      </div>
    </div>
  );
}
