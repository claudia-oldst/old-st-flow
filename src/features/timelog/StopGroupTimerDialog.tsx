import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Square, Split } from "lucide-react";
import type { ActiveTimer } from "@/lib/types";
import type { TimerTicket } from "@/store/timer";
import { formatDuration } from "@/lib/utils";
import { useStopGroup } from "./stop-group/useStopGroup";
import { RowsList } from "./stop-group/RowsList";
import { RequestMoreTimeDialog, type AdjustSlot } from "@/features/tickets/RequestMoreTimeDialog";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  active: ActiveTimer;
  groupTickets: TimerTicket[];
  elapsedMs: number;
}

export function StopGroupTimerDialog({
  open,
  onOpenChange,
  active,
  groupTickets,
  elapsedMs,
}: Props) {
  const {
    rows,
    note,
    setNote,
    busy,
    isProject,
    totalMinutes,
    allocatedMinutes,
    remainingMinutes,
    updateRow,
    removeRow,
    distributeEvenly,
    handleDiscard,
    handleSave,
    capMap,
    discipline,
    overflowingRowIds,
    refetchCapacity,
  } = useStopGroup({
    open,
    active,
    groupTickets,
    elapsedMs,
    onClose: () => onOpenChange(false),
  });

  const [adjustTicketId, setAdjustTicketId] = useState<string | null>(null);
  const adjustRow = rows.find((r) => r.ticket.id === adjustTicketId) ?? null;
  const adjustSlot: AdjustSlot =
    discipline === "Project" ? "Proj" : (discipline as "FE" | "BE");
  const adjustCap = adjustTicketId ? capMap[adjustTicketId] : undefined;

  const disciplineLabel =
    active.discipline === "FE"
      ? "Frontend"
      : active.discipline === "BE"
      ? "Backend"
      : "Project";

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-strong max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Square className="h-4 w-4" />
            Stop & log time
          </DialogTitle>
          <div className="text-xs text-dim mt-1">
            Elapsed{" "}
            <span className="font-mono text-foreground">{formatDuration(elapsedMs)}</span> ·{" "}
            <span className="text-foreground">{totalMinutes}m</span> · Discipline{" "}
            <span className="text-foreground">{disciplineLabel}</span>
          </div>
        </DialogHeader>

        <div className="flex items-center justify-between text-xs">
          <span
            className={
              remainingMinutes === 0
                ? "text-green-400"
                : remainingMinutes > 0
                ? "text-amber-300"
                : "text-red-400"
            }
          >
            Allocated <span className="font-mono">{allocatedMinutes}</span> /{" "}
            <span className="font-mono">{totalMinutes}</span> min
            {remainingMinutes !== 0 && (
              <span className="ml-2 opacity-80">
                ({remainingMinutes > 0
                  ? `+${remainingMinutes} unallocated`
                  : `${remainingMinutes} over`})
              </span>
            )}
          </span>
          <button
            type="button"
            onClick={distributeEvenly}
            disabled={rows.length === 0}
            className="inline-flex items-center gap-1 text-foreground hover:underline disabled:opacity-50 disabled:no-underline"
          >
            <Split className="h-3 w-3" /> Distribute evenly
          </button>
        </div>

        {totalMinutes > 0 && rows.some((r) => r.minutes === 0) && (
          <div className="text-xs text-amber-300 bg-amber-500/10 hairline rounded-lg px-3 py-2">
            One or more tickets ended up with 0 minutes. They'll be skipped on save — adjust the split below if every ticket should get time.
          </div>
        )}

        <RowsList
          rows={rows}
          isProject={isProject}
          updateRow={updateRow}
          removeRow={removeRow}
          capMap={capMap}
          discipline={discipline}
          onAdjust={setAdjustTicketId}
        />

        <div className="space-y-2">
          <Label className="text-xs">
            Global comment <span className="text-dimmer">(applied to all entries)</span>
          </Label>
          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            placeholder="What did you work on?"
          />
        </div>

        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={handleDiscard} disabled={busy}>
            Discard
          </Button>
          <Button
            onClick={handleSave}
            disabled={
              busy ||
              rows.length === 0 ||
              remainingMinutes !== 0 ||
              totalMinutes === 0 ||
              rows.every((r) => r.minutes === 0) ||
              overflowingRowIds.length > 0
            }
          >
            Save logs
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    {adjustRow && (
      <RequestMoreTimeDialog
        open={!!adjustRow}
        onOpenChange={(v) => !v && setAdjustTicketId(null)}
        ticketId={adjustRow.ticket.id}
        currentFE={adjustCap?.currentFE ?? 0}
        currentBE={adjustCap?.currentBE ?? 0}
        actualFE={adjustCap?.actualFE ?? 0}
        actualBE={adjustCap?.actualBE ?? 0}
        currentProj={adjustCap?.currentProj ?? 0}
        actualProj={adjustCap?.actualProj ?? 0}
        allowedSlots={[adjustSlot]}
        defaultSlot={adjustSlot}
        helperText="Logged time would exceed this ticket's available estimate. Bump the estimate to save."
        onSaved={() => {
          setAdjustTicketId(null);
          refetchCapacity();
        }}
      />
    )}
    </>
  );
}
