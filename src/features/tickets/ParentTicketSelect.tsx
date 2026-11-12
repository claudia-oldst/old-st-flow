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
}: Props) {
  const typesKey = types.join(",");
  const excludeKey = (excludeIds ?? []).join(",");
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState<ParentTicketOption[]>([]);
  const [selected, setSelected] = useState<ParentTicketOption | null>(null);
  const [hovered, setHovered] = useState<string>("");
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
  const hoveredOpt = options.find((o) => o.id === hovered) ?? null;

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
        <PopoverContent className="p-0 w-[min(720px,calc(100vw-2rem))]" align="start">
          <div className="flex flex-col sm:flex-row">
          <Command
            className="sm:w-[420px] shrink-0 sm:border-r border-border rounded-none"
            value={hovered}
            onValueChange={setHovered}
            filter={(value, search, keywords) =>
              [value, ...(keywords ?? [])].join(" ").toLowerCase().includes(search.trim().toLowerCase()) ? 1 : 0
            }
          >
            <CommandInput placeholder="Search ticket, epic…" />
            <CommandList className="max-h-[480px]">
              <CommandEmpty>No tickets found.</CommandEmpty>
              <CommandGroup>
                {options.map((opt) => (
                  <CommandItem
                    key={opt.id}
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
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
          <div className="flex-1 min-w-0 max-h-[530px] overflow-y-auto border-t sm:border-t-0 border-border">
            {hoveredOpt ? (
              <ParentTicketPreview id={hoveredOpt.id} info={infoOf(hoveredOpt)} />
            ) : (
              <div className="p-3 text-xs text-dimmer">Hover a ticket to preview it.</div>
            )}
          </div>
          </div>
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
