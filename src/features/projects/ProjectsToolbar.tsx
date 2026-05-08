import { useMemo } from "react";
import { Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import type { SortKey, StatusFilter } from "./useProjectsList";

interface Props {
  q: string;
  status: StatusFilter;
  sort: SortKey;
  hasFilters: boolean;
  onQChange: (v: string) => void;
  onStatusChange: (v: StatusFilter) => void;
  onSortChange: (v: SortKey) => void;
  onClear: () => void;
}

export function ProjectsToolbar({
  q, status, sort, hasFilters,
  onQChange, onStatusChange, onSortChange, onClear,
}: Props) {
  const sortOptions = useMemo(() => {
    const opts: Array<{ value: SortKey; label: string }> = [
      { value: "newest", label: "Newest" },
      { value: "oldest", label: "Oldest" },
      { value: "name", label: "Name A→Z" },
    ];
    if (status !== "active") opts.push({ value: "archived", label: "Recently archived" });
    return opts;
  }, [status]);

  return (
    <div className="flex flex-wrap items-center gap-2 mb-6">
      <div className="relative flex-1 min-w-[240px] max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-dimmer pointer-events-none" />
        <Input
          value={q}
          onChange={(e) => onQChange(e.target.value)}
          placeholder="Search by name, acronym, or client…"
          className="pl-9 pr-9"
        />
        {q && (
          <button
            type="button"
            onClick={() => onQChange("")}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-dimmer hover:text-foreground"
            aria-label="Clear search"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
      <Select value={status} onValueChange={(v) => onStatusChange(v as StatusFilter)}>
        <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="active">Active</SelectItem>
          <SelectItem value="vaulted">Vaulted</SelectItem>
          <SelectItem value="all">All</SelectItem>
        </SelectContent>
      </Select>
      <Select value={sort} onValueChange={(v) => onSortChange(v as SortKey)}>
        <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
        <SelectContent>
          {sortOptions.map((o) => (
            <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      {hasFilters && (
        <Button variant="ghost" size="sm" onClick={onClear} className="text-dim">Clear</Button>
      )}
    </div>
  );
}
