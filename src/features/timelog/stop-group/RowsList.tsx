import { Trash2, AlertTriangle } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DISCIPLINE_STATUS_LABEL, type DisciplineStatus, type LogDiscipline } from "@/lib/types";
import { cn, displayTitle, formatHours } from "@/lib/utils";
import { capacityFor, type CapacityMap } from "../useTicketCapacity";
import type { StopRow } from "./useStopGroup";

interface Props {
  rows: StopRow[];
  isProject: boolean;
  updateRow: (id: string, patch: Partial<StopRow>) => void;
  removeRow: (id: string) => void;
  capMap: CapacityMap;
  discipline: LogDiscipline;
  onAdjust: (ticketId: string) => void;
}

export function RowsList({
  rows,
  isProject,
  updateRow,
  removeRow,
  capMap,
  discipline,
  onAdjust,
}: Props) {
  if (rows.length === 0) {
    return (
      <div className="rounded-lg hairline">
        <div className="p-6 text-center text-sm text-dim">
          All tickets removed. Discard the timer to throw away the time.
        </div>
      </div>
    );
  }
  return (
    <div className="rounded-lg hairline divide-y divide-white/5 max-h-[320px] overflow-y-auto">
      {rows.map((r) => {
        const cap = capacityFor(capMap[r.ticket.id], discipline);
        const overflow =
          cap.available > 0 && cap.actual + r.minutes / 60 > cap.available + 1e-6;
        return (
          <div
            key={r.ticket.id}
            className={cn(
              "flex items-center gap-2 px-3 py-2",
              overflow && "bg-primary/5",
            )}
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-mono text-[11px] text-dimmer">{r.ticket.formatted_id}</span>
                {overflow && (
                  <span
                    className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase tracking-wider bg-primary/15 text-primary ring-1 ring-primary/30"
                    title={`${formatHours(cap.actual)} / ${formatHours(cap.available)} available`}
                  >
                    <AlertTriangle className="h-2.5 w-2.5" /> Over
                  </span>
                )}
              </div>
              <div className="text-sm truncate">{displayTitle(r.ticket.title, "Standard")}</div>
            </div>
            <div className="flex items-center gap-1">
              <Input
                type="number"
                step="1"
                min="0"
                value={r.minutes}
                onChange={(e) =>
                  updateRow(r.ticket.id, {
                    minutes: Math.max(0, Math.floor(parseFloat(e.target.value) || 0)),
                  })
                }
                className={cn(
                  "h-8 w-20 text-sm font-mono",
                  overflow && "border-primary focus-visible:ring-primary",
                )}
              />
              <span className="text-[11px] text-dimmer">min</span>
            </div>
            {overflow && (
              <button
                type="button"
                onClick={() => onAdjust(r.ticket.id)}
                className="text-[11px] text-primary hover:underline shrink-0"
              >
                Adjust
              </button>
            )}
            {!isProject && r.status && (
              <Select
                value={r.status}
                onValueChange={(v) =>
                  updateRow(r.ticket.id, { status: v as DisciplineStatus })
                }
              >
                <SelectTrigger className="h-8 w-[140px] text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(["todo", "in_progress", "for_integration", "done"] as const).map((s) => (
                    <SelectItem key={s} value={s} className="text-xs">
                      {DISCIPLINE_STATUS_LABEL[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <button
              type="button"
              onClick={() => removeRow(r.ticket.id)}
              className="p-1.5 rounded hover:bg-white/5 text-dimmer hover:text-red-400 transition"
              aria-label="Remove ticket"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
