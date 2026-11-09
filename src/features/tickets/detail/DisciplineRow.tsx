import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DISCIPLINE_STATUS_LABEL, type DisciplineStatus } from "@/lib/types";

export const DISCIPLINE_OPTIONS: DisciplineStatus[] = ["todo", "in_progress", "for_integration", "done"];

/** Status dot colours from design tokens (To Do grey, In Progress yellow, For Integration purple, Done green). */
export const DISCIPLINE_DOT: Record<DisciplineStatus, string> = {
  todo: "hsl(var(--dimmer))",
  in_progress: "hsl(var(--status-progress))",
  for_integration: "hsl(var(--status-integration))",
  done: "hsl(var(--status-done))",
};

function Dot({ s }: { s: DisciplineStatus }) {
  return <span className="h-2 w-2 rounded-full shrink-0" style={{ background: DISCIPLINE_DOT[s] }} />;
}

function Stepper({
  current,
  canEdit,
  slot,
  onChange,
}: {
  current: DisciplineStatus;
  canEdit: boolean;
  slot: "FE" | "BE";
  onChange: (v: DisciplineStatus) => void;
}) {
  const idx = DISCIPLINE_OPTIONS.indexOf(current);
  const color = DISCIPLINE_DOT[current];
  return (
    <div className="flex items-center gap-4">
      <div className="flex items-center" role="radiogroup" aria-label={`${slot} dev status`}>
        {DISCIPLINE_OPTIONS.map((opt, i) => {
          const reached = i <= idx;
          return (
            <div key={opt} className="flex items-center">
              {i > 0 && (
                <span
                  className="h-0.5 w-6 rounded-full"
                  style={{ background: i <= idx ? color : "hsl(var(--border))" }}
                />
              )}
              <button
                type="button"
                role="radio"
                aria-checked={i === idx}
                disabled={!canEdit}
                title={DISCIPLINE_STATUS_LABEL[opt]}
                onClick={() => opt !== current && onChange(opt)}
                className="h-6 w-6 grid place-items-center rounded-full transition disabled:cursor-default enabled:hover:scale-110"
                style={i === idx ? { background: `color-mix(in srgb, ${color} 25%, transparent)` } : undefined}
              >
                <span
                  className="h-3 w-3 rounded-full border-2"
                  style={{ background: reached ? color : "transparent", borderColor: reached ? color : "hsl(var(--dimmer))" }}
                />
              </button>
            </div>
          );
        })}
      </div>
      {canEdit ? (
        <Select value={current} onValueChange={(v) => onChange(v as DisciplineStatus)}>
          <SelectTrigger className="h-8 w-auto gap-2 border-0 bg-transparent px-2 text-sm hover:bg-surface-2" aria-label={`${slot} dev status menu`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {DISCIPLINE_OPTIONS.map((opt) => (
              <SelectItem key={opt} value={opt}>
                <span className="inline-flex items-center gap-2">
                  <Dot s={opt} /> {DISCIPLINE_STATUS_LABEL[opt]}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : (
        <span className="text-sm">{DISCIPLINE_STATUS_LABEL[current]}</span>
      )}
    </div>
  );
}

export function DisciplineRow({
  slot,
  value,
  canEdit,
  hasAssignee,
  onAssign,
  onChange,
}: {
  slot: "FE" | "BE";
  value: DisciplineStatus | null;
  canEdit: boolean;
  hasAssignee: boolean;
  onAssign?: () => void;
  onChange: (v: DisciplineStatus) => void;
}) {
  const current = value ?? "todo";
  return (
    <div className="flex items-center gap-3 min-h-8">
      <div className="w-16 text-xs font-medium text-dim">{slot}</div>
      {!hasAssignee ? (
        <div className="flex items-center gap-3 text-xs">
          <span className="text-dimmer">Unassigned</span>
          {onAssign && (
            <button type="button" onClick={onAssign} className="text-primary hover:underline underline-offset-2">
              Assign
            </button>
          )}
        </div>
      ) : (
        <Stepper current={current} canEdit={canEdit} slot={slot} onChange={onChange} />
      )}
    </div>
  );
}
