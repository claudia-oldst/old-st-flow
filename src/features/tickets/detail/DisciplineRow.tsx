import { DisciplineStatusChip } from "@/features/tickets/DisciplineStatusChip";
import { DISCIPLINE_STATUS_LABEL, type DisciplineStatus } from "@/lib/types";

export const DISCIPLINE_OPTIONS: DisciplineStatus[] = ["todo", "in_progress", "for_integration", "done"];

export function DisciplineRow({
  slot,
  value,
  canEdit,
  hasAssignee,
  onAssign,
  onChange,
}: {
  slot: "FE" | "BE";
  value: DisciplineStatus;
  canEdit: boolean;
  hasAssignee: boolean;
  onAssign?: () => void;
  onChange: (v: DisciplineStatus) => void;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-10 text-xs font-semibold text-dim">{slot}</div>
      {!hasAssignee ? (
        <div className="flex-1 flex items-center justify-between gap-2 px-2.5 py-1 rounded-lg bg-white/[0.02] hairline">
          <span className="text-[11px] text-dimmer">
            No {slot === "FE" ? "frontend" : "backend"} assignee — status not applicable
          </span>
          {onAssign && (
            <button
              type="button"
              onClick={onAssign}
              className="text-[11px] text-dim hover:text-foreground transition underline-offset-2 hover:underline"
            >
              Assign
            </button>
          )}
        </div>
      ) : canEdit ? (
        <div className="flex gap-1 p-0.5 rounded-lg bg-white/5 hairline flex-1">
          {DISCIPLINE_OPTIONS.map((opt) => (
            <button
              key={opt}
              onClick={() => onChange(opt)}
              className={`flex-1 px-2 py-1 text-[11px] rounded-md transition ${
                value === opt
                  ? "bg-foreground text-background"
                  : "text-dim hover:text-foreground"
              }`}
            >
              {DISCIPLINE_STATUS_LABEL[opt]}
            </button>
          ))}
        </div>
      ) : (
        <DisciplineStatusChip slot={slot} status={value} size="sm" />
      )}
    </div>
  );
}
