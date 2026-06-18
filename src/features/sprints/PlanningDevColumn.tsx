import { useMemo } from "react";
import { CornerDownLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import type { TicketRow } from "@/features/tickets/useProjectTickets";
import type { AssigneeSlot } from "@/lib/types";
import type { SprintMember } from "./types";
import { CapacityIndicator } from "./CapacityIndicator";
import { CarryoverReviewPanel } from "./CarryoverReviewPanel";
import { useCarryoverTickets } from "./useSprintBoard";
import type { Sprint } from "./types";
import { formatHours } from "./hours";

interface Props {
  projectId: string;
  sprintId: string;
  allSprints: Sprint[];
  dev: SprintMember;
  discipline: "FE" | "BE";
  capacityHours: number;
  assignedTickets: TicketRow[];
  selectedIds: Set<string>;
  onToggleSelect: (id: string, shiftKey: boolean) => void;
  onOpenTicket: (t: TicketRow) => void;
  isPMBA: boolean;
  /** Set of ticket ids that arrived via the carryover flow — get a ↩ prefix. */
  carriedOverIds: Set<string>;
}

function remaining(t: TicketRow, discipline: "FE" | "BE"): number {
  if (discipline === "FE") {
    return Math.max(0, (t.current_fe_estimate || 0) - (t.actual_frontend_hours || 0));
  }
  return Math.max(0, (t.current_be_estimate || 0) - (t.actual_backend_hours || 0));
}

/** One tight per-dev column in the Planning tab. */
export function PlanningDevColumn({
  projectId,
  sprintId,
  allSprints,
  dev,
  discipline,
  capacityHours,
  assignedTickets,
  selectedIds,
  onToggleSelect,
  onOpenTicket,
  isPMBA,
  carriedOverIds,
}: Props) {
  const slot: AssigneeSlot = discipline;
  const { data: carryover } = useCarryoverTickets(
    projectId,
    sprintId,
    dev.user_id,
    allSprints,
    dev.role,
  );

  const assignedTicketIds = useMemo(
    () => new Set(assignedTickets.map((t) => t.id)),
    [assignedTickets],
  );

  // Hide carryover candidates that are already assigned in this sprint.
  const carryoverCandidates = useMemo(
    () => carryover.filter((t) => !assignedTicketIds.has(t.id)),
    [carryover, assignedTicketIds],
  );

  const usedHours = useMemo(
    () => assignedTickets.reduce((sum, t) => sum + remaining(t, discipline), 0),
    [assignedTickets, discipline],
  );

  const over = capacityHours > 0 && usedHours > capacityHours;
  const overage = over ? usedHours - capacityHours : 0;

  return (
    <div
      className={cn(
        "flex flex-col gap-2 h-full min-h-0 rounded-md hairline bg-surface-1/40 min-w-56 flex-1",
        over && "ring-1 ring-primary/40",
      )}
    >
      <div
        className={cn(
          "p-2.5 hairline-b bg-surface-1/60 space-y-1.5",
          over && "bg-primary/10",
        )}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="font-display text-sm font-semibold tracking-tight truncate">
              {dev.member.name}
            </div>
            <div className="text-[10px] text-dim">{dev.role}</div>
          </div>
          {over && (
            <span className="font-mono text-[11px] text-primary font-semibold shrink-0">
              +{formatHours(overage)}
            </span>
          )}
        </div>
        <CapacityIndicator used={usedHours} cap={capacityHours} />
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto p-2 space-y-1">
        {carryoverCandidates.length > 0 && (
          <CarryoverReviewPanel
            devName={dev.member.name}
            tickets={carryoverCandidates}
            sprintId={sprintId}
            userId={dev.user_id}
            slot={slot}
            isPMBA={isPMBA}
            onConfirmed={() => {}}
          />
        )}

        {assignedTickets.length === 0 && carryoverCandidates.length === 0 && (
          <div className="text-[11px] text-dim text-center py-6">
            No tickets assigned
          </div>
        )}

        {assignedTickets.map((t) => {
          const selected = selectedIds.has(t.id);
          const h = remaining(t, discipline);
          const carried = carriedOverIds.has(t.id);
          return (
            <div
              key={t.id}
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
              {carried && (
                <CornerDownLeft className="h-3 w-3 text-dimmer shrink-0" aria-label="Carried over" />
              )}
              <span className="font-mono text-[10px] text-dimmer w-14 shrink-0">
                {t.formatted_id}
              </span>
              <span className="text-xs truncate flex-1 min-w-0">{t.title}</span>
              {t.epic_name && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-dim truncate max-w-20 shrink-0">
                  {t.epic_name}
                </span>
              )}
              <span className="font-mono text-[10px] text-dim shrink-0 w-8 text-right">
                {formatHours(h)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
