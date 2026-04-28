import { useEffect, useState } from "react";
import { format } from "date-fns";
import { Calendar as CalendarIcon, Loader2 } from "lucide-react";
import * as XLSX from "xlsx";
import { supabase } from "@/integrations/supabase/client";
import type { Project } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  project: Project;
}

function endOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
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
      const cutoff = endOfDay(asOf).toISOString();

      const [ticketsRes, changesRes, logsRes] = await Promise.all([
        supabase
          .from("tickets")
          .select(
            "id,formatted_id,title,ticket_type,fe_status,be_status,original_fe_estimate,original_be_estimate,original_project_estimate,current_project_estimate,created_at,epic:project_epics(epic_name),assignees:ticket_assignees(slot,member:team_members(name))"
          )
          .eq("project_id", project.id)
          .lte("created_at", cutoff)
          .order("ticket_number", { ascending: true }),
        supabase
          .from("ticket_estimate_changes")
          .select(
            "id,ticket_id,discipline,previous_hours,new_hours,delta,reason,status,created_at,user:team_members(name),ticket:tickets!inner(formatted_id,title,ticket_type,project_id,epic:project_epics(epic_name))"
          )
          .eq("ticket.project_id", project.id)
          .lte("created_at", cutoff)
          .order("created_at", { ascending: true }),
        supabase
          .from("time_logs")
          .select(
            "id,ticket_id,hours,discipline,note,source,logged_at,user:team_members(name),ticket:tickets!inner(formatted_id,title,ticket_type,project_id,epic:project_epics(epic_name))"
          )
          .eq("ticket.project_id", project.id)
          .lte("logged_at", cutoff)
          .order("logged_at", { ascending: true }),
      ]);

      if (ticketsRes.error) throw ticketsRes.error;
      if (changesRes.error) throw changesRes.error;
      if (logsRes.error) throw logsRes.error;

      const tickets = (ticketsRes.data ?? []) as any[];
      const changes = (changesRes.data ?? []) as any[];
      const logs = (logsRes.data ?? []) as any[];

      // Aggregate adjusted estimates per ticket from approved estimate-changes
      const deltaByTicket = new Map<string, { FE: number; BE: number }>();
      for (const c of changes) {
        if (c.status !== "approved") continue;
        const cur = deltaByTicket.get(c.ticket_id) ?? { FE: 0, BE: 0 };
        if (c.discipline === "FE") cur.FE += Number(c.delta) || 0;
        else if (c.discipline === "BE") cur.BE += Number(c.delta) || 0;
        deltaByTicket.set(c.ticket_id, cur);
      }

      // Aggregate actual hours per ticket from time logs
      const actualsByTicket = new Map<string, { FE: number; BE: number; Project: number }>();
      for (const l of logs) {
        const cur = actualsByTicket.get(l.ticket_id) ?? { FE: 0, BE: 0, Project: 0 };
        const h = Number(l.hours) || 0;
        if (l.discipline === "FE") cur.FE += h;
        else if (l.discipline === "BE") cur.BE += h;
        else if (l.discipline === "Project") cur.Project += h;
        actualsByTicket.set(l.ticket_id, cur);
      }

      const wb = XLSX.utils.book_new();

      if (includeTickets) {
        const header = [
          "Ticket ID",
          "Ticket Type",
          "Ticket Name",
          "Epic",
          "FE Original Estimate",
          "BE Original Estimate",
          "Project Original Estimate",
          "Updated FE Estimate",
          "Updated BE Estimate",
          "Updated Project Estimate",
          "FE Status",
          "BE Status",
          "FE Actual",
          "BE Actual",
          "Project Actual",
          "Assignees",
        ];
        const rows = tickets.map((t) => {
          const d = deltaByTicket.get(t.id) ?? { FE: 0, BE: 0 };
          const a = actualsByTicket.get(t.id) ?? { FE: 0, BE: 0, Project: 0 };
          const feOrig = Number(t.original_fe_estimate) || 0;
          const beOrig = Number(t.original_be_estimate) || 0;
          const projOrig = Number(t.original_project_estimate) || 0;
          const assignees = (t.assignees ?? [])
            .map((x: any) => `${x.member?.name ?? "—"} (${x.slot})`)
            .join(", ");
          return [
            t.formatted_id,
            t.ticket_type,
            t.title,
            t.epic?.epic_name ?? "",
            feOrig,
            beOrig,
            projOrig,
            feOrig + d.FE,
            beOrig + d.BE,
            Number(t.current_project_estimate) || projOrig,
            t.fe_status,
            t.be_status,
            a.FE,
            a.BE,
            a.Project,
            assignees,
          ];
        });
        const ws = XLSX.utils.aoa_to_sheet([header, ...rows]);
        ws["!cols"] = [
          { wch: 12 }, { wch: 10 }, { wch: 40 }, { wch: 18 },
          { wch: 10 }, { wch: 10 }, { wch: 10 },
          { wch: 12 }, { wch: 12 }, { wch: 12 },
          { wch: 12 }, { wch: 12 },
          { wch: 10 }, { wch: 10 }, { wch: 12 },
          { wch: 40 },
        ];
        XLSX.utils.book_append_sheet(wb, ws, "Tickets");
      }

      if (includeChanges) {
        const header = [
          "Ticket ID",
          "Ticket Type",
          "Ticket Name",
          "Epic",
          "Discipline",
          "Previous Hours",
          "New Hours",
          "Delta",
          "Status",
          "Assignee Requested",
          "Reason",
          "Date",
        ];
        const rows = changes.map((c) => [
          c.ticket?.formatted_id ?? "",
          c.ticket?.ticket_type ?? "",
          c.ticket?.title ?? "",
          c.ticket?.epic?.epic_name ?? "",
          c.discipline,
          Number(c.previous_hours) || 0,
          Number(c.new_hours) || 0,
          Number(c.delta) || 0,
          c.status,
          c.user?.name ?? "",
          c.reason ?? "",
          format(new Date(c.created_at), "yyyy-MM-dd HH:mm"),
        ]);
        const ws = XLSX.utils.aoa_to_sheet([header, ...rows]);
        ws["!cols"] = [
          { wch: 12 }, { wch: 10 }, { wch: 40 }, { wch: 18 },
          { wch: 10 }, { wch: 12 }, { wch: 10 }, { wch: 8 },
          { wch: 10 }, { wch: 20 }, { wch: 50 }, { wch: 18 },
        ];
        XLSX.utils.book_append_sheet(wb, ws, "Change Requests");
      }

      if (includeLogs) {
        const header = [
          "Ticket ID",
          "Ticket Type",
          "Ticket Name",
          "Epic",
          "Discipline",
          "Hours Logged",
          "Assignee Logged",
          "Source",
          "Note",
          "Date",
        ];
        const rows = logs.map((l) => [
          l.ticket?.formatted_id ?? "",
          l.ticket?.ticket_type ?? "",
          l.ticket?.title ?? "",
          l.ticket?.epic?.epic_name ?? "",
          l.discipline,
          Number(l.hours) || 0,
          l.user?.name ?? "",
          l.source,
          l.note ?? "",
          format(new Date(l.logged_at), "yyyy-MM-dd HH:mm"),
        ]);
        const ws = XLSX.utils.aoa_to_sheet([header, ...rows]);
        ws["!cols"] = [
          { wch: 12 }, { wch: 10 }, { wch: 40 }, { wch: 18 },
          { wch: 10 }, { wch: 12 }, { wch: 20 }, { wch: 10 },
          { wch: 50 }, { wch: 18 },
        ];
        XLSX.utils.book_append_sheet(wb, ws, "Time Logs");
      }

      if (wb.SheetNames.length === 0) {
        toast.error("Select at least one tab to export");
        setBusy(false);
        return;
      }

      const filename = `${project.acronym}-export-${format(asOf, "yyyy-MM-dd")}.xlsx`;
      XLSX.writeFile(wb, filename);
      toast.success("Export ready");
      onOpenChange(false);
    } catch (err: any) {
      console.error(err);
      toast.error("Export failed: " + (err?.message ?? "unknown error"));
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
                      if (d) {
                        setAsOf(d);
                        setPickerOpen(false);
                      }
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
                <Checkbox
                  checked={includeTickets}
                  onCheckedChange={(v) => setIncludeTickets(!!v)}
                />
                Tickets
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <Checkbox
                  checked={includeChanges}
                  onCheckedChange={(v) => setIncludeChanges(!!v)}
                />
                Change Requests
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <Checkbox
                  checked={includeLogs}
                  onCheckedChange={(v) => setIncludeLogs(!!v)}
                />
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
