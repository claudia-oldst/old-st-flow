import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
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
} from "@/components/ui/command";
import type { SprintMember } from "../types";

export function AddMemberInline({
  available,
  onPick,
}: {
  available: SprintMember[];
  onPick: (m: SprintMember) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          size="sm"
          variant="outline"
          className="h-7 text-xs w-fit"
          disabled={available.length === 0}
        >
          <Plus className="h-3.5 w-3.5 mr-1" /> Member
        </Button>
      </PopoverTrigger>
      <PopoverContent className="p-0 w-64" align="start">
        <Command>
          <CommandInput placeholder="Find member…" className="h-8" />
          <CommandList>
            <CommandEmpty>No members</CommandEmpty>
            <CommandGroup>
              {available.map((m) => (
                <CommandItem
                  key={m.user_id}
                  value={`${m.member.name} ${m.role}`}
                  onSelect={() => {
                    onPick(m);
                    setOpen(false);
                  }}
                >
                  <span className="truncate">{m.member.name}</span>
                  <span className="ml-auto text-[10px] text-dim">{m.role}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
