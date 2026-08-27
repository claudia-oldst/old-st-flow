import { AlertTriangle, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn, displayTitle } from "@/lib/utils";
import type { useInlineLogDraft } from "./useInlineLogDraft";

type Draft = ReturnType<typeof useInlineLogDraft>;

/** Nudge shown when a single-ticket log would exceed its available estimate. */
export function SingleOverflowNudge({ draft: d }: { draft: Draft }) {
  if (d.rows.length !== 1 || d.overflowingRowIds.length === 0) return null;
  return (
    <div className="mt-3 px-3 py-2 rounded-lg bg-primary/5 hairline flex items-center justify-between text-xs">
      <span className="inline-flex items-center gap-1.5 text-primary">
        <AlertTriangle className="h-3.5 w-3.5" /> This ticket exceeds its available estimate
      </span>
      <button
        type="button"
        onClick={() => d.setAdjustTicketId(d.rows[0].ticket.id)}
        className="text-[11px] text-primary hover:underline"
      >
        Adjust
      </button>
    </div>
  );
}

/** Per-ticket minute allocation for multi-ticket inline logs. */
export function InlineAllocationPanel({ draft: d }: { draft: Draft }) {
  if (d.rows.length <= 1) return null;
  return (
    <div className="mt-3 rounded-lg hairline divide-y divide-white/5">
      <div className="px-3 py-2 flex items-center justify-between text-xs">
        <span className="text-dim">
          Split {d.totalMinutes}m across {d.rows.length} tickets
        </span>
        <div className="flex items-center gap-3">
          <span className={cn("font-mono", d.remainingMinutes !== 0 && "text-primary")}>
            Allocated {d.allocatedMinutes}m · Remaining {d.remainingMinutes}m
          </span>
          <button
            type="button"
            onClick={d.distributeEvenly}
            className="text-[11px] text-primary hover:underline"
          >
            Even split
          </button>
        </div>
      </div>
      {d.rows.map((r) => {
        const overflow = d.overflowingRowIds.includes(r.ticket.id);
        return (
          <div
            key={r.ticket.id}
            className={cn("flex items-center gap-2 px-3 py-2", overflow && "bg-primary/5")}
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-mono text-[11px] text-dimmer">
                  {r.ticket.formatted_id}
                </span>
                {overflow && (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase tracking-wider bg-primary/15 text-primary ring-1 ring-primary/30">
                    <AlertTriangle className="h-2.5 w-2.5" /> Over
                  </span>
                )}
              </div>
              <div className="text-sm truncate">
                {displayTitle(r.ticket.title, r.ticket.ticket_type)}
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Input
                type="number"
                step="1"
                min="0"
                value={r.minutes}
                onChange={(e) =>
                  d.updateMinutes(r.ticket.id, Math.floor(parseFloat(e.target.value) || 0))
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
                onClick={() => d.setAdjustTicketId(r.ticket.id)}
                className="text-[11px] text-primary hover:underline shrink-0"
              >
                Adjust
              </button>
            )}
            <button
              type="button"
              onClick={() => d.removeTicket(r.ticket.id)}
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
