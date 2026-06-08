import { useEffect, useState } from "react";
import { Check, ChevronsUpDown, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export interface ParentTicketOption {
  id: string;
  formatted_id: string;
  title: string;
  epic_id: number | null;
}

interface Props {
  projectId: string;
  value: string | null;
  onChange: (id: string | null, parent: ParentTicketOption | null) => void;
  excludeId?: string;
  size?: "sm" | "md";
  placeholder?: string;
}

export function ParentTicketSelect({
  projectId,
  value,
  onChange,
  excludeId,
  size = "md",
  placeholder = "Link a parent ticket…",
}: Props) {
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState<ParentTicketOption[]>([]);
  const [selected, setSelected] = useState<ParentTicketOption | null>(null);

  useEffect(() => {
    let cancelled = false;
    supabase
      .from("tickets")
      .select("id, formatted_id, title, ticket_type, epic_id")
      .eq("project_id", projectId)
      .in("ticket_type", ["Standard", "CR"])
      .order("ticket_number", { ascending: true })
      .limit(500)
      .then(({ data }) => {
        if (cancelled) return;
        const opts = (data ?? [])
          .filter((t: any) => t.id !== excludeId)
          .map((t: any) => ({ id: t.id, formatted_id: t.formatted_id, title: t.title, epic_id: t.epic_id ?? null }));
        setOptions(opts);
      });
    return () => {
      cancelled = true;
    };
  }, [projectId, excludeId]);

  useEffect(() => {
    if (!value) {
      setSelected(null);
      return;
    }
    const local = options.find((o) => o.id === value);
    if (local) {
      setSelected(local);
      return;
    }
    supabase
      .from("tickets")
      .select("id, formatted_id, title, epic_id")
      .eq("id", value)
      .maybeSingle()
      .then(({ data }) => {
        if (data) setSelected({ id: data.id, formatted_id: data.formatted_id, title: data.title, epic_id: (data as any).epic_id ?? null });
      });
  }, [value, options]);

  const h = size === "sm" ? "h-8 text-xs" : "h-9 text-sm";

  return (
    <div className="flex items-center gap-1">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            className={cn("w-full justify-between font-normal", h)}
          >
            {selected ? (
              <span className="truncate">
                <span className="font-mono text-dimmer">{selected.formatted_id}</span>{" "}
                <span className="text-foreground/80">{selected.title}</span>
              </span>
            ) : (
              <span className="text-dimmer">{placeholder}</span>
            )}
            <ChevronsUpDown className="h-3.5 w-3.5 opacity-60 shrink-0 ml-1" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="p-0 w-[--radix-popover-trigger-width]" align="start">
          <Command
            filter={(value, search) =>
              value.toLowerCase().includes(search.trim().toLowerCase()) ? 1 : 0
            }
          >
            <CommandInput placeholder="Search ticket…" />
            <CommandList>
              <CommandEmpty>No tickets found.</CommandEmpty>
              <CommandGroup>
                {options.map((opt) => (
                  <CommandItem
                    key={opt.id}
                    value={`${opt.formatted_id} ${opt.title}`}
                    onSelect={() => {
                      onChange(opt.id, opt);
                      setSelected(opt);
                      setOpen(false);
                    }}
                  >
                    <Check
                      className={cn(
                        "h-3.5 w-3.5 mr-2",
                        value === opt.id ? "opacity-100" : "opacity-0",
                      )}
                    />
                    <span className="font-mono text-dimmer text-xs mr-2">{opt.formatted_id}</span>
                    <span className="truncate">{opt.title}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {selected && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-7 w-7 shrink-0"
          onClick={() => {
            setSelected(null);
            onChange(null, null);
          }}
          aria-label="Clear parent"
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      )}
    </div>
  );
}
