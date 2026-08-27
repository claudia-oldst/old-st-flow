import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Play, Clock } from "lucide-react";
import { useTimerStore } from "@/store/timer";
import type { ProjectRole } from "@/lib/types";
import type { TicketRow } from "@/features/tickets/useProjectTickets";
import { cn, displayTitle, formatHours } from "@/lib/utils";
import { useLogTime } from "./log-time/useLogTime";
import { DisciplinePicker } from "./log-time/DisciplinePicker";
import { MissingEstimatePanel } from "./log-time/MissingEstimatePanel";
import { ManualEntryTab } from "./log-time/ManualEntryTab";
import { hoursMinutesToDecimal } from "./utils";
import { RequestMoreTimeDialog, type AdjustSlot } from "@/features/tickets/RequestMoreTimeDialog";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ticket: TicketRow;
  role: ProjectRole | null;
  onLogged?: () => void;
}

export function LogTimeModal({ open, onOpenChange, ticket, role, onLogged }: Props) {
  const activeTimer = useTimerStore((s) => s.active);
  const {
    isProjTicket,
    discipline,
    setDiscipline,
    disciplineOptions,
    durH,
    durM,
    setDuration,
    note,
    setNote,
    loggedDate,
    setLoggedDate,
    busy,
    handleStartTimer,
    handleManualLog,
    capacity,
    refetchCapacity,
    wouldOverflowManual,
    missingEstimate,
    saveOriginalEstimate,
  } = useLogTime({
    open,
    ticket,
    role,
    onClose: () => onOpenChange(false),
    onLogged,
  });

  const [adjustOpen, setAdjustOpen] = useState(false);
  const [estimateInput, setEstimateInput] = useState("");
  const [savingEstimate, setSavingEstimate] = useState(false);
  const isMyTimerOnThisTicket = activeTimer?.ticket_id === ticket.id;

  const enteredHours = hoursMinutesToDecimal(durH, durM);
  const overflowsManual = enteredHours > 0 && wouldOverflowManual(enteredHours);
  const adjustSlot: AdjustSlot =
    discipline === "Project" ? "Proj" : (discipline as "FE" | "BE");

  const disciplineLabel = discipline === "FE" ? "Frontend" : discipline === "BE" ? "Backend" : "Project";

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="glass-strong">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Log time
            </DialogTitle>
            <div className="text-xs text-dim mt-1">
              <span className="font-mono">{ticket.formatted_id}</span> ·{" "}
              {displayTitle(ticket.title, ticket.ticket_type)}
            </div>
            {capacity.available > 0 && (
              <div
                className={cn(
                  "text-[11px] font-mono mt-1",
                  capacity.isOver ? "text-primary" : "text-dimmer",
                )}
              >
                Used {formatHours(capacity.actual)} / {formatHours(capacity.available)}
                {capacity.pending !== 0 && (
                  <span className="text-dimmer">
                    {" "}
                    ({capacity.pending > 0 ? "+" : ""}
                    {formatHours(capacity.pending)} pending)
                  </span>
                )}
              </div>
            )}
          </DialogHeader>

          <DisciplinePicker
            isProjTicket={isProjTicket}
            discipline={discipline}
            setDiscipline={setDiscipline}
            disciplineOptions={disciplineOptions}
          />

          {missingEstimate ? (
            <MissingEstimatePanel
              disciplineLabel={disciplineLabel}
              onCancel={() => onOpenChange(false)}
              onSave={saveOriginalEstimate}
            />
          ) : (
            <Tabs defaultValue="timer" className="mt-2">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="timer">Live timer</TabsTrigger>
                <TabsTrigger value="manual">Manual entry</TabsTrigger>
              </TabsList>

              <TabsContent value="timer" className="space-y-4 pt-4">
                {isMyTimerOnThisTicket ? (
                  <div className="text-sm text-dim p-4 rounded-lg bg-white/5 hairline">
                    A timer for this ticket is already running. Click the chip in the top bar to stop and log.
                  </div>
                ) : activeTimer ? (
                  <div className="text-sm text-amber-300 p-4 rounded-lg bg-amber-500/10 hairline">
                    You have a timer running on another ticket. Starting a new one will replace it (the previous one will be discarded).
                  </div>
                ) : (
                  <div className="text-sm text-dim p-4 rounded-lg bg-white/5 hairline">
                    Click start. The timer keeps running across pages — stop it from the top bar to commit hours.
                  </div>
                )}
                <DialogFooter>
                  <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
                  <Button
                    onClick={handleStartTimer}
                    disabled={busy || isMyTimerOnThisTicket}
                    className="gap-2"
                  >
                    <Play className="h-4 w-4" /> Start timer
                  </Button>
                </DialogFooter>
              </TabsContent>

              <TabsContent value="manual" className="space-y-4 pt-4">
                <ManualEntryTab
                  loggedDate={loggedDate}
                  setLoggedDate={setLoggedDate}
                  durH={durH}
                  durM={durM}
                  setDuration={setDuration}
                  note={note}
                  setNote={setNote}
                  overflowsManual={overflowsManual}
                  remainingHours={Math.max(0, capacity.available - capacity.actual)}
                  busy={busy}
                  onCancel={() => onOpenChange(false)}
                  onAdjust={() => setAdjustOpen(true)}
                  onLog={handleManualLog}
                />
              </TabsContent>
            </Tabs>
          )}

        </DialogContent>
      </Dialog>

      {adjustOpen && (
        <RequestMoreTimeDialog
          open={adjustOpen}
          onOpenChange={setAdjustOpen}
          ticketId={ticket.id}
          projectId={ticket.project_id}
          currentFE={ticket.current_fe_estimate}
          currentBE={ticket.current_be_estimate}
          actualFE={ticket.actual_frontend_hours}
          actualBE={ticket.actual_backend_hours}
          currentProj={ticket.current_project_estimate}
          actualProj={ticket.actual_project_hours}
          allowedSlots={[adjustSlot]}
          defaultSlot={adjustSlot}
          helperText={`You're trying to log ${formatHours(enteredHours)} but only ${formatHours(Math.max(0, capacity.available - capacity.actual))} is available. Adjust the estimate to continue.`}
          onSaved={() => {
            setAdjustOpen(false);
            refetchCapacity();
          }}
        />
      )}
    </>
  );
}
