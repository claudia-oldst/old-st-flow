import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Play, Clock, AlertTriangle } from "lucide-react";
import { useTimerStore } from "@/store/timer";
import type { LogDiscipline, ProjectRole } from "@/lib/types";
import type { TicketRow } from "@/features/tickets/useProjectTickets";
import { cn, displayTitle, formatHours } from "@/lib/utils";
import { useStartGroup } from "./start-group/useStartGroup";
import { StartGroupFilters } from "./start-group/StartGroupFilters";
import { StartGroupTicketsList } from "./start-group/StartGroupTicketsList";
import { capacityFor as resolveCapacity } from "./useTicketCapacity";
import { RequestMoreTimeDialog, type AdjustSlot } from "@/features/tickets/RequestMoreTimeDialog";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tickets: TicketRow[];
  role: ProjectRole | null;
}

export function StartGroupTimerDialog({ open, onOpenChange, tickets, role }: Props) {
  const activeTimer = useTimerStore((s) => s.active);
  const {
    discipline,
    onDisciplineChange,
    disciplineOptions,
    search,
    setSearch,
    statusFilter,
    setStatusFilter,
    typeFilter,
    setTypeFilter,
    selected,
    toggleSelect,
    toggleAllVisible,
    allVisibleSelected,
    visible,
    busy,
    handleStart,
    capMap,
    blockedSelectedTickets,
    refetchCapacity,
  } = useStartGroup({
    open,
    tickets,
    role,
    onClose: () => onOpenChange(false),
  });

  const disciplineLabel: Record<LogDiscipline, string> = {
    FE: "Frontend",
    BE: "Backend",
    Project: "Project",
  };

  const [adjustTicket, setAdjustTicket] = useState<TicketRow | null>(null);
  const adjustSlot: AdjustSlot =
    discipline === "Project" ? "Proj" : (discipline as "FE" | "BE");

  const capacityForId = (id: string) => resolveCapacity(capMap[id], discipline);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="glass-strong max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Start group timer
            </DialogTitle>
          </DialogHeader>

          {activeTimer && (
            <div className="text-sm text-amber-300 p-3 rounded-lg bg-amber-500/10 hairline">
              You already have a timer running. Starting a new one will replace it.
            </div>
          )}

          {disciplineOptions.length === 0 ? (
            <div className="text-xs text-dim">
              You have no ticket assignments to log time against.
            </div>
          ) : disciplineOptions.length > 1 ? (
            <div className="space-y-1.5">
              <div className="text-xs uppercase tracking-wider text-dimmer">Discipline</div>
              <div className="flex gap-1 p-1 rounded-lg bg-white/5 hairline w-fit">
                {disciplineOptions.map((d) => (
                  <button
                    key={d.value}
                    onClick={() => onDisciplineChange(d.value)}
                    className={cn(
                      "px-3 py-1 text-xs rounded-md transition",
                      discipline === d.value
                        ? "bg-foreground text-background"
                        : "text-dim hover:text-foreground"
                    )}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-xs text-dim">
              Logging to <span className="text-foreground font-medium">{disciplineLabel[discipline]}</span> hours.
            </div>
          )}

          <StartGroupFilters
            search={search}
            setSearch={setSearch}
            statusFilter={statusFilter}
            setStatusFilter={setStatusFilter}
            typeFilter={typeFilter}
            setTypeFilter={setTypeFilter}
          />

          <StartGroupTicketsList
            visible={visible}
            selected={selected}
            toggleSelect={toggleSelect}
            toggleAllVisible={toggleAllVisible}
            allVisibleSelected={allVisibleSelected}
            capacityFor={capacityForId}
          />

          {blockedSelectedTickets.length > 0 && (
            <div className="rounded-lg bg-primary/10 hairline p-3 space-y-2">
              <div className="flex items-center gap-2 text-xs text-primary">
                <AlertTriangle className="h-3.5 w-3.5" />
                Adjust estimates before starting:
              </div>
              <div className="space-y-1.5">
                {blockedSelectedTickets.map((t) => {
                  const cap = capacityForId(t.id);
                  return (
                    <div key={t.id} className="flex items-center gap-2 text-xs">
                      <span className="font-mono text-dimmer w-14 shrink-0">{t.formatted_id}</span>
                      <span className="flex-1 truncate">{displayTitle(t.title, t.ticket_type)}</span>
                      <span className="font-mono text-dim shrink-0">
                        {formatHours(cap.actual)} / {formatHours(cap.available)}
                      </span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setAdjustTicket(t)}
                      >
                        Adjust
                      </Button>
                      <button
                        type="button"
                        onClick={() => toggleSelect(t.id)}
                        className="text-[11px] text-dimmer hover:text-foreground"
                      >
                        Remove
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleStart}
              disabled={busy || selected.size === 0 || blockedSelectedTickets.length > 0}
              className="gap-2"
            >
              <Play className="h-4 w-4" /> Start timer ({selected.size})
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {adjustTicket && (
        <RequestMoreTimeDialog
          open={!!adjustTicket}
          onOpenChange={(v) => !v && setAdjustTicket(null)}
          ticketId={adjustTicket.id}
          currentFE={adjustTicket.current_fe_estimate}
          currentBE={adjustTicket.current_be_estimate}
          actualFE={adjustTicket.actual_frontend_hours}
          actualBE={adjustTicket.actual_backend_hours}
          currentProj={adjustTicket.current_project_estimate}
          actualProj={adjustTicket.actual_project_hours}
          allowedSlots={[adjustSlot]}
          defaultSlot={adjustSlot}
          helperText={`This ticket is at or over its ${disciplineLabel[discipline]} estimate. Add hours to start a timer against it.`}
          onSaved={() => {
            setAdjustTicket(null);
            refetchCapacity();
          }}
        />
      )}
    </>
  );
}
