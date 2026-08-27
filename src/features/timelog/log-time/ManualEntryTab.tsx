import { format } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { cn, formatHours } from "@/lib/utils";
import { DurationInput } from "./DurationInput";

/** Manual (non-timer) log entry form: date, duration, note and actions. */
export function ManualEntryTab({
  loggedDate,
  setLoggedDate,
  durH,
  durM,
  setDuration,
  note,
  setNote,
  overflowsManual,
  remainingHours,
  busy,
  onCancel,
  onAdjust,
  onLog,
}: {
  loggedDate: Date | undefined;
  setLoggedDate: (d: Date) => void;
  durH: string;
  durM: string;
  setDuration: (h: string, m: string) => void;
  note: string;
  setNote: (v: string) => void;
  overflowsManual: boolean;
  remainingHours: number;
  busy: boolean;
  onCancel: () => void;
  onAdjust: () => void;
  onLog: () => void;
}) {
  return (
    <>
      <div className="space-y-2">
        <Label>Date</Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "w-full justify-start text-left font-normal",
                !loggedDate && "text-muted-foreground",
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {loggedDate ? format(loggedDate, "PPP") : <span>Pick a date</span>}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={loggedDate}
              onSelect={(d) => d && setLoggedDate(d)}
              disabled={{ after: new Date() }}
              initialFocus
              className={cn("p-3 pointer-events-auto")}
            />
          </PopoverContent>
        </Popover>
      </div>
      <div className="space-y-2">
        <DurationInput h={durH} m={durM} onChange={setDuration} invalid={overflowsManual} />
        {overflowsManual && (
          <p className="text-[11px] text-primary">
            This would exceed the available estimate ({formatHours(remainingHours)} left). Adjust
            the estimate to log more.
          </p>
        )}
      </div>
      <div className="space-y-2">
        <Label>
          Note <span className="text-dimmer">(optional)</span>
        </Label>
        <Textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
          placeholder="What did you work on?"
        />
      </div>
      <DialogFooter>
        <Button variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        {overflowsManual ? (
          <Button onClick={onAdjust}>Adjust estimate</Button>
        ) : (
          <Button onClick={onLog} disabled={busy}>
            Log hours
          </Button>
        )}
      </DialogFooter>
    </>
  );
}
