import { useEffect, useState } from "react";
import { format } from "date-fns";
import { Calendar as CalendarIcon, Loader2 } from "lucide-react";
import type { Project } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { runExportProject } from "./export/runExportProject";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  project: Project;
}

export function ExportProjectDialog({ open, onOpenChange, project }: Props) {
  const [asOf, setAsOf] = useState<Date>(new Date());
  const [pickerOpen, setPickerOpen] = useState(false);
  const [includeTickets, setIncludeTickets] = useState(true);
  const [includeChanges, setIncludeChanges] = useState(true);
  const [includeLogs, setIncludeLogs] = useState(true);
  const [busy, setBusy] = useState(false);
  const [fromDate, setFromDate] = useState<string>(project.start_date ?? "");

  useEffect(() => {
    if (!open) return;
    setAsOf(new Date());
    setFromDate(project.start_date ?? "");
  }, [open, project.start_date]);

  const generate = async () => {
    setBusy(true);
    try {
      const res = await runExportProject({
        project, asOf, includeTickets, includeChanges, includeLogs,
      });
      if ("error" in res) {
        toast.error(res.error);
        return;
      }
      toast.success("Export ready");
      onOpenChange(false);
    } catch (err: unknown) {
      console.error(err);
      toast.error("Export failed: " + (err instanceof Error ? err.message : "unknown error"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Export project data</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-dim">From</Label>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="h-9 w-full rounded-md bg-white/5 hairline px-2 text-xs font-mono text-foreground"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-dim">As of</Label>
              <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn("h-9 w-full justify-start text-left font-mono text-xs")}
                  >
                    <CalendarIcon className="h-3.5 w-3.5 mr-2" />
                    {format(asOf, "MMM d, yyyy")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={asOf}
                    onSelect={(d) => {
                      if (d) { setAsOf(d); setPickerOpen(false); }
                    }}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <p className="text-xs text-dimmer">
            Estimates and actuals are computed as of the selected date.
          </p>

          <div className="space-y-2 pt-1">
            <Label className="text-xs text-dim">Include tabs</Label>
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <Checkbox checked={includeTickets} onCheckedChange={(v) => setIncludeTickets(!!v)} />
                Tickets
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <Checkbox checked={includeChanges} onCheckedChange={(v) => setIncludeChanges(!!v)} />
                Change Requests
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <Checkbox checked={includeLogs} onCheckedChange={(v) => setIncludeLogs(!!v)} />
                Time Logs
              </label>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={generate} disabled={busy} className="gap-2">
            {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Download .xlsx
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
