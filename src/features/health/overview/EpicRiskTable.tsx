import { useMemo, useState } from "react";
import { ArrowUp, ArrowDown } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { TicketRow } from "@/features/tickets/useProjectTickets";
import type { Status } from "@/lib/types";
import { buildEpicRiskRows, SORT_LABELS, type EpicLite, type SortKey } from "./epicRisk";
import { EpicRiskRowView, LegendDot } from "./EpicRiskRowView";

interface Props {
  projectId: string;
  tickets: TicketRow[];
  statuses: Status[];
  epics: EpicLite[];
}

export function EpicRiskTable({ tickets, statuses, epics }: Props) {
  const [sort, setSort] = useState<{ key: SortKey; dir: "asc" | "desc" }>({
    key: "burnPct",
    dir: "desc",
  });

  const rows = useMemo(
    () => buildEpicRiskRows(tickets, statuses, epics, sort),
    [tickets, statuses, epics, sort],
  );

  const toggleDir = () => setSort((s) => ({ ...s, dir: s.dir === "asc" ? "desc" : "asc" }));

  if (rows.length === 0) {
    return (
      <div className="glass rounded-2xl p-5">
        <div className="text-xs uppercase tracking-wider text-dimmer mb-2">
          Epic risk — doneness vs estimate burn
        </div>
        <div className="text-sm text-dim">No epics with estimates yet.</div>
      </div>
    );
  }

  return (
    <div className="glass rounded-2xl p-5">
      <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
        <div className="text-xs uppercase tracking-wider text-dimmer">
          Epic risk — doneness vs estimate burn
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <Select
              value={sort.key}
              onValueChange={(v) =>
                setSort({ key: v as SortKey, dir: v === "name" ? "asc" : "desc" })
              }
            >
              <SelectTrigger className="h-8 min-w-[10rem] w-auto text-xs bg-surface-2 border-white/10 hover:border-white/20">
                <span className="text-dim mr-1">Sort by</span>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-surface-2 border-white/10">
                {(Object.keys(SORT_LABELS) as SortKey[]).map((k) => (
                  <SelectItem key={k} value={k} className="text-xs">
                    {SORT_LABELS[k]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <button
              type="button"
              onClick={toggleDir}
              className="h-8 w-8 inline-flex items-center justify-center rounded-md border border-white/10 bg-surface-2 text-dim hover:text-foreground hover:border-white/20 transition"
              aria-label={`Sort ${sort.dir === "asc" ? "ascending" : "descending"}`}
            >
              {sort.dir === "asc" ? (
                <ArrowUp className="h-3.5 w-3.5" />
              ) : (
                <ArrowDown className="h-3.5 w-3.5" />
              )}
            </button>
          </div>
          <div className="flex items-center gap-3 text-[10px] text-dimmer">
            <LegendDot className="bg-health-good" label="Done" />
            <LegendDot className="bg-health-good/50" label="Dev done" />
            <LegendDot className="bg-health-warn" label="Active" />
            <LegendDot className="bg-white/10" label="Backlog" />
            <span className="w-px h-3 bg-white/10" />
            <LegendDot className="bg-health-bad" label="Burned" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-[2fr_3fr_3fr_auto] gap-4 px-2 pb-2 border-b border-white/5 text-[10px] uppercase tracking-wider text-dimmer">
        <div>Epic</div>
        <div>Doneness</div>
        <div>Estimate burn</div>
        <div>Risk</div>
      </div>

      <div className="space-y-3 pt-3">
        {rows.map((row) => (
          <EpicRiskRowView key={row.epicId} row={row} />
        ))}
      </div>
    </div>
  );
}
