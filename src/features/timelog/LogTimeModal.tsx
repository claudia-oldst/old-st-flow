import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Play, Clock } from "lucide-react";
import { useTimerStore } from "@/store/timer";
import type { ProjectRole } from "@/lib/types";
import type { TicketRow } from "@/features/tickets/useProjectTickets";
import { displayTitle } from "@/lib/utils";
import { useLogTime } from "./log-time/useLogTime";
import { DisciplinePicker } from "./log-time/DisciplinePicker";

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
    hours,
    setHours,
    note,
    setNote,
    busy,
    handleStartTimer,
    handleManualLog,
  } = useLogTime({
    open,
    ticket,
    role,
    onClose: () => onOpenChange(false),
    onLogged,
  });

  const isMyTimerOnThisTicket = activeTimer?.ticket_id === ticket.id;

  return (
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
        </DialogHeader>

        <DisciplinePicker
          isProjTicket={isProjTicket}
          discipline={discipline}
          setDiscipline={setDiscipline}
          disciplineOptions={disciplineOptions}
        />

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
            <div className="space-y-2">
              <Label>Hours</Label>
              <Input
                type="number"
                step="0.25"
                min="0.25"
                value={hours}
                onChange={(e) => setHours(e.target.value)}
                placeholder="1.5"
              />
            </div>
            <div className="space-y-2">
              <Label>Note <span className="text-dimmer">(optional)</span></Label>
              <Textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
                placeholder="What did you work on?"
              />
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button onClick={handleManualLog} disabled={busy}>Log hours</Button>
            </DialogFooter>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
