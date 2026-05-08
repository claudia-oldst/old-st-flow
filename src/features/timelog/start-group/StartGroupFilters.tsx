import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";
import type { StatusFilter, TypeFilter } from "./useStartGroup";

interface Props {
  search: string;
  setSearch: (v: string) => void;
  statusFilter: StatusFilter;
  setStatusFilter: (v: StatusFilter) => void;
  typeFilter: TypeFilter;
  setTypeFilter: (v: TypeFilter) => void;
}

export function StartGroupFilters({
  search,
  setSearch,
  statusFilter,
  setStatusFilter,
  typeFilter,
  setTypeFilter,
}: Props) {
  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-dimmer pointer-events-none" />
        <Input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search ID or title…"
          className="h-8 pl-8 text-xs"
        />
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex gap-1 p-0.5 rounded-md bg-white/5 hairline">
          {(
            [
              ["open", "Open"],
              ["todo", "To-do"],
              ["in_progress", "In progress"],
            ] as const
          ).map(([k, label]) => (
            <button
              key={k}
              onClick={() => setStatusFilter(k)}
              className={cn(
                "px-2 py-0.5 text-[11px] rounded transition",
                statusFilter === k
                  ? "bg-foreground text-background"
                  : "text-dim hover:text-foreground"
              )}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="flex gap-1 p-0.5 rounded-md bg-white/5 hairline">
          {(["all", "Standard", "Bug", "CR", "Proj"] as const).map((k) => (
            <button
              key={k}
              onClick={() => setTypeFilter(k)}
              className={cn(
                "px-2 py-0.5 text-[11px] rounded transition",
                typeFilter === k
                  ? "bg-foreground text-background"
                  : "text-dim hover:text-foreground"
              )}
            >
              {k === "all" ? "All" : k}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
