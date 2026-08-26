import { useMemo, useState } from "react";
import { format } from "date-fns";
import { Calendar as CalendarIcon, Check, ChevronsUpDown, Trash2, X, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn, displayTitle, formatHours } from "@/lib/utils";
import { useMyProjects, useMyProjectTickets } from "./useMyTimeLogs";
import { useInlineLogDraft, capacityFor } from "./useInlineLogDraft";
import { RequestMoreTimeDialog, type AdjustSlot } from "@/features/tickets/RequestMoreTimeDialog";
import type { LogDiscipline } from "@/lib/types";

const DISCIPLINE_TO_SLOT: Record<LogDiscipline, AdjustSlot> = {
  FE: "FE",
  BE: "BE",
  Project: "Proj",
};

/**
 * Single-line inline draft row for logging time. Supports one ticket (today's
 * behaviour) or many tickets with minute-by-minute allocation, reusing the
 * same overflow/adjust pattern as the group timer stop dialog.
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
  const [open, setOpen] = useState(false);

  const selectedSet = useMemo(() => new Set(d.ticketIds), [d.ticketIds]);
  const hasProjectGroup = useMemo(
    () => d.ticketIds.some((id) => d.rows.find((r) => r.ticket.id === id)?.ticket.ticket_type === "Proj"),
    [d.ticketIds, d.rows],
  );

  const dropdownTickets = useMemo(() => {
    // Don't let Project tickets mix with FE/BE tickets.
    if (d.ticketIds.length === 0) return tickets;
    return tickets.filter((t) => (hasProjectGroup ? t.ticket_type === "Proj" : t.ticket_type !== "Proj"));
  }, [tickets, hasProjectGroup, d.ticketIds.length]);

  const triggerLabel = useMemo(() => {
    if (d.ticketIds.length === 0) return !d.projectId ? "Pick a project" : tickets.length === 0 ? "No assigned tickets" : "Ticket";
    if (d.ticketIds.length === 1) {
      const t = tickets.find((x) => x.id === d.ticketIds[0]);
      if (!t) return "1 ticket";
      return `${t.formatted_id} ${displayTitle(t.title, t.ticket_type as any)}`;
    }
    return `${d.ticketIds.length} tickets selected`;
  }, [d.ticketIds, tickets, d.projectId]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && d.canSave) {
      e.preventDefault();
      void d.save();
    }
    if (e.key === "Escape") onCancel();
  };

  const adjustTicket = d.rows.find((r) => r.ticket.id === d.adjustTicketId)?.ticket ?? null;
  const adjustCap = adjustTicket && d.discipline ? capacityFor(d.capMap[adjustTicket.id], d.discipline) : null;

  return (
    <div className="glass rounded-2xl p-2.5 mb-4" onKeyDown={onKeyDown}>
      <div className="flex items-center gap-2 min-w-[1040px] overflow-x-auto">
        <Select
          value={d.projectId ?? ""}
          onValueChange={(v) => {
            d.setProjectId(v);
            d.ticketIds.forEach((id) => d.removeTicket(id));
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

        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              role="combobox"
              disabled={!d.projectId}
              className="h-8 text-xs w-[220px] shrink-0 justify-between font-normal"
            >
              <span className="truncate">{triggerLabel}</span>
              <ChevronsUpDown className="h-3.5 w-3.5 opacity-60 shrink-0 ml-1" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="p-0 w-[--radix-popover-trigger-width]" align="start">
            <Command
              filter={(value, search) =>
                value.toLowerCase().includes(search.trim().toLowerCase()) ? 1 : 0
              }
            >
              <CommandInput placeholder="Search tickets…" />
              <CommandList>
                <CommandEmpty>No tickets found.</CommandEmpty>
                <CommandGroup>
                  {dropdownTickets.map((t) => {
                    const selected = selectedSet.has(t.id);
                    return (
                      <CommandItem
                        key={t.id}
                        value={`${t.formatted_id} ${t.title}`}
                        onSelect={() => d.toggleTicket(t.id, t.ticket_type)}
                      >
                        <Check className={cn("h-3.5 w-3.5 mr-2", selected ? "opacity-100" : "opacity-0")} />
                        <span className="font-mono text-dimmer text-xs mr-2">{t.formatted_id}</span>
                        <span className="truncate">{displayTitle(t.title, t.ticket_type as any)}</span>
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>

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

      {d.rows.length > 1 && (
        <div className="mt-3 rounded-lg hairline divide-y divide-white/5">
          <div className="px-3 py-2 flex items-center justify-between text-xs">
            <span className="text-dim">
              Split {d.totalMinutes}m across {d.rows.length} tickets
            </span>
            <div className="flex items-center gap-3">
              <span className={cn("font-mono", d.remainingMinutes !== 0 && "text-primary")}>
                Allocated {d.allocatedMinutes}m · Remaining {d.remainingMinutes}m
              </span>
              <button
                type="button"
                onClick={d.distributeEvenly}
                className="text-[11px] text-primary hover:underline"
              >
                Even split
              </button>
            </div>
          </div>
          {d.rows.map((r) => {
            const overflow = d.overflowingRowIds.includes(r.ticket.id);
            return (
              <div
                key={r.ticket.id}
                className={cn("flex items-center gap-2 px-3 py-2", overflow && "bg-primary/5")}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[11px] text-dimmer">{r.ticket.formatted_id}</span>
                    {overflow && (
                      <span
                        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase tracking-wider bg-primary/15 text-primary ring-1 ring-primary/30"
                      >
                        <AlertTriangle className="h-2.5 w-2.5" /> Over
                      </span>
                    )}
                  </div>
                  <div className="text-sm truncate">{displayTitle(r.ticket.title, r.ticket.ticket_type)}</div>
                </div>
                <div className="flex items-center gap-1">
                  <Input
                    type="number"
                    step="1"
                    min="0"
                    value={r.minutes}
                    onChange={(e) => d.updateMinutes(r.ticket.id, Math.floor(parseFloat(e.target.value) || 0))}
                    className={cn("h-8 w-20 text-sm font-mono", overflow && "border-primary focus-visible:ring-primary")}
                  />
                  <span className="text-[11px] text-dimmer">min</span>
                </div>
                {overflow && (
                  <button
                    type="button"
                    onClick={() => d.setAdjustTicketId(r.ticket.id)}
                    className="text-[11px] text-primary hover:underline shrink-0"
                  >
                    Adjust
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => d.removeTicket(r.ticket.id)}
                  className="p-1.5 rounded hover:bg-white/5 text-dimmer hover:text-red-400 transition"
                  aria-label="Remove ticket"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {adjustTicket && d.discipline && adjustCap && (
        <RequestMoreTimeDialog
          open={!!d.adjustTicketId}
          onOpenChange={(v) => !v && d.setAdjustTicketId(null)}
          ticketId={adjustTicket.id}
          projectId={adjustTicket.project_id}
          currentFE={adjustCap.current}
          currentBE={adjustCap.current}
          actualFE={adjustCap.actual}
          actualBE={adjustCap.actual}
          currentProj={adjustCap.current}
          actualProj={adjustCap.actual}
          allowedSlots={[DISCIPLINE_TO_SLOT[d.discipline]]}
          defaultSlot={DISCIPLINE_TO_SLOT[d.discipline]}
          helperText={`Used ${formatHours(adjustCap.actual)} of ${formatHours(adjustCap.available)}h — need ${formatHours((d.allocations[adjustTicket.id] ?? 0) / 60 - adjustCap.available)}h more to log this ticket`}
          onSaved={() => {
            d.setAdjustTicketId(null);
            void d.refetchCapacity();
          }}
        />
      )}
    </div>
  );
}
