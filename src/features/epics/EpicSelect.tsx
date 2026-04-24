import { useState } from "react";
import { Check, ChevronsUpDown, Plus, X } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { useProjectEpics } from "@/features/epics/useProjectEpics";
import { toast } from "sonner";

interface Props {
  projectId: string;
  value: number | null;
  onChange: (id: number | null) => void;
  size?: "sm" | "md";
  allowClear?: boolean;
  className?: string;
}

export function EpicSelect({
  projectId,
  value,
  onChange,
  size = "md",
  allowClear = true,
  className,
}: Props) {
  const { epics, createEpic } = useProjectEpics(projectId);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [creating, setCreating] = useState(false);

  const selected = epics.find((e) => e.id === value);

  const exactMatch = epics.find(
    (e) => e.epic_name?.trim().toLowerCase() === search.trim().toLowerCase()
  );

  const handleCreate = async () => {
    if (!search.trim() || creating) return;
    setCreating(true);
    const id = await createEpic(search);
    setCreating(false);
    if (!id) {
      toast.error("Could not create epic");
      return;
    }
    onChange(id);
    setSearch("");
    setOpen(false);
  };

  const heightCls = size === "sm" ? "h-7 text-xs" : "h-9 text-sm";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "inline-flex items-center justify-between gap-2 px-3 rounded-md hairline bg-white/[0.02] hover:bg-white/[0.05] transition w-full",
            heightCls,
            className
          )}
        >
          <span className={cn("truncate", !selected && "text-dimmer")}>
            {selected?.epic_name ?? "No epic"}
          </span>
          <div className="flex items-center gap-1 shrink-0">
            {allowClear && value !== null && (
              <span
                role="button"
                tabIndex={0}
                aria-label="Clear epic"
                onClick={(e) => {
                  e.stopPropagation();
                  onChange(null);
                }}
                className="text-dimmer hover:text-foreground transition cursor-pointer"
              >
                <X className="h-3 w-3" />
              </span>
            )}
            <ChevronsUpDown className="h-3 w-3 text-dimmer" />
          </div>
        </button>
      </PopoverTrigger>
      <PopoverContent className="p-0 w-[260px]" align="start">
        <Command>
          <CommandInput
            placeholder="Search or create epic…"
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            <CommandEmpty>No epics yet.</CommandEmpty>
            {epics.length > 0 && (
              <CommandGroup heading="Epics">
                {epics.map((e) => (
                  <CommandItem
                    key={e.id}
                    value={e.epic_name ?? ""}
                    onSelect={() => {
                      onChange(e.id);
                      setOpen(false);
                      setSearch("");
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-3.5 w-3.5",
                        value === e.id ? "opacity-100" : "opacity-0"
                      )}
                    />
                    {e.epic_name}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
            {search.trim() && !exactMatch && (
              <>
                <CommandSeparator />
                <CommandGroup>
                  <CommandItem
                    value={`__create_${search}`}
                    onSelect={handleCreate}
                    disabled={creating}
                  >
                    <Plus className="mr-2 h-3.5 w-3.5" />
                    Create "{search.trim()}"
                  </CommandItem>
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
