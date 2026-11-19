import { useEffect, useState } from "react";
import { ChevronsUpDown, X } from "lucide-react";
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
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { useStatuses } from "@/features/statuses/useStatuses";
import { ParentOptionRow, type ParentRowInfo } from "./ParentOptionRow";
import { ParentTicketPreview } from "./ParentTicketPreview";

export interface ParentTicketOption {
  id: string;
  formatted_id: string;
  title: string;
  epic_id: number | null;
  ticket_type?: string;
  status_id?: string | null;
}

interface Props {
  projectId: string;
  value: string | null;
  onChange: (id: string | null, parent: ParentTicketOption | null) => void;
  excludeId?: string;
  size?: "sm" | "md";
  placeholder?: string;
  types?: string[];
  excludeIds?: string[];
  clearable?: boolean;
  /** When set, only tickets in this epic are offered. */
  epicId?: number | null;
}

export function ParentTicketSelect({
  projectId,
  value,
  onChange,
  excludeId,
  size = "md",
  placeholder = "Link a parent ticket…",
  types = ["Standard", "CR"],
  excludeIds,
  clearable = true,
  epicId = null,
}: Props) {
  const typesKey = types.join(",");
  const excludeKey = (excludeIds ?? []).join(",");
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState<ParentTicketOption[]>([]);
  const [selected, setSelected] = useState<ParentTicketOption | null>(null);
  const [epics, setEpics] = useState<Map<number, string>>(new Map());
  const { statuses } = useStatuses();

  useEffect(() => {
    supabase.from("project_epics").select("id, epic_name").eq("project_id", projectId).then(({ data }) => {
      setEpics(new Map((data ?? []).map((e: any) => [e.id, e.epic_name ?? "Untitled epic"])));
    });
  }, [projectId]);

  const infoOf = (o: ParentTicketOption): ParentRowInfo => {
    const st = statuses.find((x) => x.id === o.status_id);
    return {
      formatted_id: o.formatted_id,
      title: o.title,
      ticket_type: o.ticket_type ?? "",
      epicName: o.epic_id != null ? epics.get(o.epic_id) ?? null : null,
      statusName: st?.name ?? null,
      statusColor: st?.color ?? null,
    };
  };

  useEffect(() => {
    let cancelled = false;
    supabase
      .from("tickets")
      .select("id, formatted_id, title, ticket_type, epic_id, status_id")
      .eq("project_id", projectId)
      .in("ticket_type", types as any)
      .order("ticket_number", { ascending: true })
      .limit(1000)
      .then(({ data }) => {
        if (cancelled) return;
        const skip = new Set(excludeKey ? excludeKey.split(",") : []);
        const opts = (data ?? [])
          .filter((t: any) => t.id !== excludeId && !skip.has(t.id))
          .map((t: any) => ({ id: t.id, formatted_id: t.formatted_id, title: t.title, epic_id: t.epic_id ?? null, ticket_type: t.ticket_type, status_id: t.status_id }));
        setOptions(opts);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, excludeId, typesKey, excludeKey]);

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
        <PopoverContent className="p-0 w-[min(440px,calc(100vw-2rem))]" align="start" side="bottom" collisionPadding={12}>
          <Command
            filter={(value, search, keywords) =>
              [value, ...(keywords ?? [])].join(" ").toLowerCase().includes(search.trim().toLowerCase()) ? 1 : 0
            }
          >
            <CommandInput placeholder="Search ticket number, title, epic…" />
            <CommandList className="max-h-[320px]">
              <CommandEmpty>No tickets found.</CommandEmpty>
              <CommandGroup>
                {options.filter((o) => epicId == null || o.epic_id === epicId).map((opt) => (
                  <HoverCard key={opt.id} openDelay={300} closeDelay={50}>
                    <HoverCardTrigger asChild>
                      <CommandItem
                        value={opt.id}
                        keywords={[opt.formatted_id, opt.title, infoOf(opt).epicName ?? "No Epic"]}
                        onSelect={() => {
                          onChange(opt.id, opt);
                          setSelected(opt);
                          setOpen(false);
                        }}
                      >
                        <ParentOptionRow info={infoOf(opt)} selected={value === opt.id} />
                      </CommandItem>
                    </HoverCardTrigger>
                    <HoverCardContent side="right" align="start" sideOffset={8} className="w-80 p-0 max-h-[400px] overflow-y-auto">
                      <ParentTicketPreview id={opt.id} info={infoOf(opt)} />
                    </HoverCardContent>
                  </HoverCard>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {selected && clearable && (
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
