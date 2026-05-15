import { Checkbox } from "@/components/ui/checkbox";
import { cn, displayTitle, formatHours } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { TicketRow } from "@/features/tickets/useProjectTickets";
import type { CapacityForDiscipline } from "@/features/timelog/useTicketCapacity";

interface Props {
  visible: TicketRow[];
  selected: Set<string>;
  toggleSelect: (id: string) => void;
  toggleAllVisible: () => void;
  allVisibleSelected: boolean;
  capacityFor: (id: string) => CapacityForDiscipline;
}

export function StartGroupTicketsList({
  visible,
  selected,
  toggleSelect,
  toggleAllVisible,
  allVisibleSelected,
  capacityFor,
}: Props) {
  return (
    <div className="rounded-lg hairline overflow-hidden">
      <div className="flex items-center justify-between px-3 py-1.5 bg-white/[0.03] text-[11px] text-dim">
        <span>
          {selected.size} selected · {visible.length} shown
        </span>
        <button
          onClick={toggleAllVisible}
          disabled={visible.length === 0}
          className="text-foreground hover:underline disabled:opacity-50 disabled:no-underline"
        >
          {allVisibleSelected ? "Clear visible" : "Select all visible"}
        </button>
      </div>
      <div className="max-h-[280px] overflow-y-auto divide-y divide-white/5">
        {visible.length === 0 ? (
          <div className="p-6 text-center text-sm text-dim">
            No assigned tickets match. Try changing the discipline or filters.
          </div>
        ) : (
          visible.map((t) => {
            const checked = selected.has(t.id);
            const cap = capacityFor(t.id);
            return (
              <label
                key={t.id}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 cursor-pointer transition",
                  checked ? "bg-accent/10" : "hover:bg-white/[0.03]"
                )}
              >
                <Checkbox checked={checked} onCheckedChange={() => toggleSelect(t.id)} />
                <span className="font-mono text-[11px] text-dimmer w-16 shrink-0">
                  {t.formatted_id}
                </span>
                <span className="flex-1 truncate text-sm">
                  {displayTitle(t.title, t.ticket_type)}
                </span>
                {cap.isOver && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="shrink-0 px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase tracking-wider bg-primary/15 text-primary ring-1 ring-primary/30">
                        Over
                      </span>
                    </TooltipTrigger>
                    <TooltipContent side="left" className="text-xs">
                      {formatHours(cap.actual)} / {formatHours(cap.available)}
                      {cap.pending !== 0 && ` (${cap.pending > 0 ? "+" : ""}${formatHours(cap.pending)} pending)`}
                    </TooltipContent>
                  </Tooltip>
                )}
              </label>
            );
          })
        )}
      </div>
    </div>
  );
}
