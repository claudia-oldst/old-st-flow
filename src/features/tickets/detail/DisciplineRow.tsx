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
      ) : canEdit ? (
        <div className="flex items-center">
        {current !== "done" && (
          <button
            type="button"
            onClick={() => onChange(DISCIPLINE_OPTIONS[DISCIPLINE_OPTIONS.indexOf(current) + 1])}
            title={`Move to ${DISCIPLINE_STATUS_LABEL[DISCIPLINE_OPTIONS[DISCIPLINE_OPTIONS.indexOf(current) + 1]]}`}
            className="h-8 mr-2 inline-flex items-center gap-1.5 px-2.5 rounded-md hairline bg-surface-2 text-xs hover:bg-primary/15 hover:text-foreground transition"
          >
            <Dot s={DISCIPLINE_OPTIONS[DISCIPLINE_OPTIONS.indexOf(current) + 1]} />
            {DISCIPLINE_STATUS_LABEL[DISCIPLINE_OPTIONS[DISCIPLINE_OPTIONS.indexOf(current) + 1]]} →
          </button>
        )}
        <Select value={current} onValueChange={(v) => onChange(v as DisciplineStatus)}>
          <SelectTrigger className="h-8 w-48 text-xs order-first mr-2" aria-label={`${slot} dev status`}>
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
        </div>
      ) : (
        <span className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-surface-2 hairline text-xs">
          <Dot s={current} /> {DISCIPLINE_STATUS_LABEL[current]}
        </span>
      )}
    </div>
  );
}
