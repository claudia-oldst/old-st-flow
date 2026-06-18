import { Checkbox } from "@/components/ui/checkbox";
import { cn, formatHours } from "@/lib/utils";
import type { TicketRow } from "@/features/tickets/useProjectTickets";
import { PlanningRowTooltip } from "../PlanningRowTooltip";

interface Props {
  ticket: TicketRow;
  selected: boolean;
  discipline: "FE" | "BE";
  groupBy: string;
  onToggleSelect: (id: string, shiftKey: boolean) => void;
  onOpenTicket: (t: TicketRow) => void;
}

export function PoolRow({
  ticket: t,
  selected,
  discipline,
  groupBy,
  onToggleSelect,
  onOpenTicket,
}: Props) {
  const h =
    discipline === "FE"
      ? Math.max(0, (t.current_fe_estimate || 0) - (t.actual_frontend_hours || 0))
      : Math.max(0, (t.current_be_estimate || 0) - (t.actual_backend_hours || 0));

  return (
    <PlanningRowTooltip ticket={t}>
      <div
        className={cn(
          "flex items-center gap-2 px-1.5 py-1.5 rounded hover:bg-white/[0.04] cursor-pointer",
          selected && "ring-1 ring-primary bg-primary/5",
        )}
        onClick={(e) => {
          if ((e.target as HTMLElement).closest("[data-checkbox]")) return;
          onOpenTicket(t);
        }}
      >
        <div data-checkbox onClick={(e) => e.stopPropagation()}>
          <Checkbox
            checked={selected}
            onCheckedChange={() => onToggleSelect(t.id, false)}
            aria-label="Select ticket"
          />
        </div>
        <span className="font-mono text-xs text-dimmer w-16 shrink-0">
          {t.formatted_id}
        </span>
        <span className="text-xs truncate flex-1 min-w-0">{t.title}</span>
        {t.epic_name && groupBy !== "epic" && (
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-dim truncate max-w-20 shrink-0">
            {t.epic_name}
          </span>
        )}
        <span className="font-mono text-[10px] text-dim shrink-0 w-10 text-right">
          {formatHours(h)}
        </span>
      </div>
    </PlanningRowTooltip>
  );
}
