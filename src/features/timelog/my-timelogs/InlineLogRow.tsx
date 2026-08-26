import { format } from "date-fns";
import { Calendar as CalendarIcon, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn, displayTitle } from "@/lib/utils";
import { useMyProjects, useMyProjectTickets } from "./useMyTimeLogs";
import { useInlineLogDraft } from "./useInlineLogDraft";
import type { LogDiscipline } from "@/lib/types";

/**
 * Single-line inline draft row for logging time, in the same spirit as the
 * Add Tickets draft rows. Replaces the old modal flow on My Timelogs.
 */
export function InlineLogRow({
  onLogged,
  onCancel,
}: {
  onLogged?: () => void;
  onCancel: () => void;
}) {
  const d = useInlineLogDraft(onLogged);
  const { data: projects = [] } = useMyProjects();
  const { data: tickets = [] } = useMyProjectTickets(d.projectId);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && d.canSave) {
      e.preventDefault();
      void d.save();
    }
    if (e.key === "Escape") onCancel();
  };

  return (
    <div className="glass rounded-2xl p-2.5 mb-4 overflow-x-auto">
      <div className="flex items-center gap-2 min-w-[1040px]" onKeyDown={onKeyDown}>
        <Select
          value={d.projectId ?? ""}
          onValueChange={(v) => {
            d.setProjectId(v);
            d.setTicketId(null);
          }}
        >
          <SelectTrigger className="h-8 text-xs w-[170px] shrink-0">
            <SelectValue placeholder="Project" />
          </SelectTrigger>
          <SelectContent>
            {projects.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={d.ticketId ?? ""}
          disabled={!d.projectId}
          onValueChange={(v) => d.setTicketId(v)}
        >
          <SelectTrigger className="h-8 text-xs w-[220px] shrink-0">
            <SelectValue
              placeholder={
                !d.projectId
                  ? "Pick a project"
                  : tickets.length === 0
                    ? "No assigned tickets"
                    : "Ticket"
              }
            />
          </SelectTrigger>
          <SelectContent>
            {tickets.map((t) => (
              <SelectItem key={t.id} value={t.id}>
                <span className="font-mono text-xs mr-2">{t.formatted_id}</span>
                {displayTitle(t.title, t.ticket_type as any)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {d.disciplineOptions.length > 1 && (
          <Select
            value={d.discipline ?? ""}
            onValueChange={(v) => d.setDiscipline(v as LogDiscipline)}
          >
            <SelectTrigger className="h-8 text-xs w-[86px] shrink-0">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {d.disciplineOptions.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <Input
          value={d.note}
          onChange={(e) => d.setNote(e.target.value)}
          placeholder="What you did…"
          className="h-8 text-xs flex-1 min-w-[160px]"
        />

        <Popover>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              className="h-8 text-xs w-[120px] shrink-0 justify-start gap-1.5 font-normal"
            >
              <CalendarIcon className="h-3.5 w-3.5" />
              {format(d.date, "d MMM yyyy")}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={d.date}
              onSelect={(v) => v && d.setDate(v)}
              initialFocus
              className={cn("p-3 pointer-events-auto")}
            />
          </PopoverContent>
        </Popover>

        <Input
          type="time"
          value={d.startTime}
          onChange={(e) => d.setStartTime(e.target.value)}
          aria-label="Start time (optional)"
          className="h-8 text-xs w-[104px] shrink-0"
        />

        <div className="flex items-center gap-1 shrink-0">
          <Input
            value={d.durH}
            onChange={(e) => d.setDurH(e.target.value.replace(/[^\d]/g, ""))}
            placeholder="0"
            inputMode="numeric"
            aria-label="Hours"
            className="h-8 text-xs w-[52px] text-right font-mono"
          />
          <span className="text-[11px] text-dimmer">h</span>
          <Input
            value={d.durM}
            onChange={(e) => d.setDurM(e.target.value.replace(/[^\d]/g, ""))}
            placeholder="0"
            inputMode="numeric"
            aria-label="Minutes"
            className="h-8 text-xs w-[52px] text-right font-mono"
          />
          <span className="text-[11px] text-dimmer">m</span>
        </div>

        <Button
          type="button"
          size="sm"
          className="h-8 gap-1.5 shrink-0"
          disabled={!d.canSave}
          onClick={() => void d.save()}
        >
          <Check className="h-3.5 w-3.5" /> Save
        </Button>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="h-8 w-8 shrink-0"
          aria-label="Cancel"
          onClick={onCancel}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
