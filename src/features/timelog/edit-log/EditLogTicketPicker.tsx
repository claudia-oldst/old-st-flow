import { useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from "@/components/ui/command";
import { cn, displayTitle } from "@/lib/utils";
import type { EditableTicket } from "./editLogHelpers";

/** Searchable single-select of the user's assigned tickets. */
export function EditLogTicketPicker({
  tickets, value, onChange, fallbackLabel,
}: {
  tickets: EditableTicket[];
  value: string;
  onChange: (id: string) => void;
  fallbackLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const sel = tickets.find((t) => t.id === value);
  const label = sel ? `${sel.formatted_id} ${displayTitle(sel.title, sel.ticket_type as any)}` : fallbackLabel;
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" role="combobox" className="w-full justify-between font-normal">
          <span className="truncate">{label}</span>
          <ChevronsUpDown className="h-3.5 w-3.5 opacity-60 shrink-0 ml-1" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="p-0 w-[--radix-popover-trigger-width]" align="start">
        <Command filter={(v, s) => (v.toLowerCase().includes(s.trim().toLowerCase()) ? 1 : 0)}>
          <CommandInput placeholder="Search tickets…" />
          <CommandList>
            <CommandEmpty>No tickets found.</CommandEmpty>
            <CommandGroup>
              {tickets.map((t) => (
                <CommandItem
                  key={t.id}
                  value={`${t.formatted_id} ${t.title}`}
                  onSelect={() => { onChange(t.id); setOpen(false); }}
                >
                  <Check className={cn("h-3.5 w-3.5 mr-2", t.id === value ? "opacity-100" : "opacity-0")} />
                  <span className="font-mono text-dimmer text-xs mr-2">{t.formatted_id}</span>
                  <span className="truncate">{displayTitle(t.title, t.ticket_type as any)}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
