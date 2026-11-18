import type { ReactNode } from "react";
import { Columns3, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { ReviewGroupBy, ReviewSort } from "./reviewList";
import type { ReviewColumn } from "./useHiddenColumns";

const GROUP_LABEL: Record<ReviewGroupBy, string> = {
  none: "None", epic: "Epic", approval: "Approval status", requester: "Requester",
};

interface Props {
  groupBy: ReviewGroupBy;
  onGroupBy: (g: ReviewGroupBy) => void;
  groupOptions: ReviewGroupBy[];
  sort: ReviewSort;
  onSort: (s: ReviewSort) => void;
  sortOptions: Array<{ value: ReviewSort; label: string }>;
  search: string;
  onSearch: (s: string) => void;
  columns: ReviewColumn[];
  hidden: string[];
  onHidden: (h: string[]) => void;
  /** Filters (status, requester, dates). */
  children?: ReactNode;
  right?: ReactNode;
}

/** Toolbar shared by the Change Requests and Estimate Revisions tabs. */
export function ReviewListToolbar(p: Props) {
  const toggle = (k: string) =>
    p.onHidden(p.hidden.includes(k) ? p.hidden.filter((x) => x !== k) : [...p.hidden, k]);
  return (
    <div className="glass rounded-2xl p-3 flex items-center gap-2 flex-wrap sticky top-14 z-30">
      <div className="relative">
        <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-dim" />
        <Input value={p.search} onChange={(e) => p.onSearch(e.target.value)}
          placeholder="Search tickets" className="h-8 w-[180px] pl-8 text-xs" />
      </div>
      {p.children}
      <div className="h-5 w-px bg-white/10 mx-1" />
      <span className="text-xs text-dim">Group by</span>
      <Select value={p.groupBy} onValueChange={(v) => p.onGroupBy(v as ReviewGroupBy)}>
        <SelectTrigger className="h-8 text-xs w-[150px]"><SelectValue /></SelectTrigger>
        <SelectContent>
          {p.groupOptions.map((g) => <SelectItem key={g} value={g}>{GROUP_LABEL[g]}</SelectItem>)}
        </SelectContent>
      </Select>
      <span className="text-xs text-dim">Sort</span>
      <Select value={p.sort} onValueChange={(v) => p.onSort(v as ReviewSort)}>
        <SelectTrigger className="h-8 text-xs w-[140px]"><SelectValue /></SelectTrigger>
        <SelectContent>
          {p.sortOptions.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
        </SelectContent>
      </Select>
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs">
            <Columns3 className="h-3.5 w-3.5" /> Columns
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-48 p-2 space-y-1">
          {p.columns.filter((c) => !c.locked).map((c) => (
            <label key={c.key} className="flex items-center gap-2 text-xs px-1 py-1 rounded hover:bg-white/5 cursor-pointer">
              <Checkbox checked={!p.hidden.includes(c.key)} onCheckedChange={() => toggle(c.key)} />
              {c.label}
            </label>
          ))}
        </PopoverContent>
      </Popover>
      <div className="ml-auto flex items-center gap-3">{p.right}</div>
    </div>
  );
}
