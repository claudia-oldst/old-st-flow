import { Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DISCIPLINE_STATUS_LABEL, type DisciplineStatus } from "@/lib/types";
import { displayTitle } from "@/lib/utils";
import type { StopRow } from "./useStopGroup";

interface Props {
  rows: StopRow[];
  isProject: boolean;
  updateRow: (id: string, patch: Partial<StopRow>) => void;
  removeRow: (id: string) => void;
}

export function RowsList({ rows, isProject, updateRow, removeRow }: Props) {
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
      {rows.map((r) => (
        <div key={r.ticket.id} className="flex items-center gap-2 px-3 py-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-mono text-[11px] text-dimmer">{r.ticket.formatted_id}</span>
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
              className="h-8 w-20 text-sm font-mono"
            />
            <span className="text-[11px] text-dimmer">min</span>
          </div>
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
      ))}
    </div>
  );
}
