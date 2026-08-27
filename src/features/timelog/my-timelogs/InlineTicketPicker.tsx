import { useMemo, useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { cn, displayTitle } from "@/lib/utils";
import type { useInlineLogDraft } from "./useInlineLogDraft";

type Draft = ReturnType<typeof useInlineLogDraft>;
interface TicketOption {
  id: string;
  formatted_id: string;
  title: string;
  ticket_type: string;
}

/** Searchable multi-select of the user's assigned tickets in the chosen project. */
export function InlineTicketPicker({
  draft: d,
  tickets,
}: {
  draft: Draft;
  tickets: TicketOption[];
}) {
  const [open, setOpen] = useState(false);

  const selectedSet = useMemo(() => new Set(d.ticketIds), [d.ticketIds]);
  const hasProjectGroup = useMemo(
    () =>
      d.ticketIds.some(
        (id) => d.rows.find((r) => r.ticket.id === id)?.ticket.ticket_type === "Proj",
      ),
    [d.ticketIds, d.rows],
  );

  const dropdownTickets = useMemo(() => {
    // Don't let Project tickets mix with FE/BE tickets.
    if (d.ticketIds.length === 0) return tickets;
    return tickets.filter((t) =>
      hasProjectGroup ? t.ticket_type === "Proj" : t.ticket_type !== "Proj",
    );
  }, [tickets, hasProjectGroup, d.ticketIds.length]);

  const triggerLabel = useMemo(() => {
    if (d.ticketIds.length === 0)
      return !d.projectId
        ? "Pick a project"
        : tickets.length === 0
          ? "No assigned tickets"
          : "Ticket";
    if (d.ticketIds.length === 1) {
      const t = tickets.find((x) => x.id === d.ticketIds[0]);
      if (!t) return "1 ticket";
      return `${t.formatted_id} ${displayTitle(t.title, t.ticket_type as any)}`;
    }
    return `${d.ticketIds.length} tickets selected`;
  }, [d.ticketIds, tickets, d.projectId]);

  return (
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
                    <Check
                      className={cn("h-3.5 w-3.5 mr-2", selected ? "opacity-100" : "opacity-0")}
                    />
                    <span className="font-mono text-dimmer text-xs mr-2">{t.formatted_id}</span>
                    <span className="truncate">
                      {displayTitle(t.title, t.ticket_type as any)}
                    </span>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
