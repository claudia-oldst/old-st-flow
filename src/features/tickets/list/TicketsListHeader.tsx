import { ArrowDown, ArrowUp, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { COLS, ColKey, SORTABLE, SortState } from "./columns";

export function TicketsListHeader({
  visibleCols,
  selectionEnabled,
  ids,
  selectedIds,
  onToggleSelectAll,
  sort,
  toggleSort,
  onResizeStart,
}: {
  visibleCols: ColKey[];
  selectionEnabled: boolean;
  ids: string[];
  selectedIds?: Set<string>;
  onToggleSelectAll?: (ids: string[], select: boolean) => void;
  sort: SortState | null;
  toggleSort: (k: ColKey) => void;
  onResizeStart: (key: ColKey) => (e: React.MouseEvent) => void;
}) {
  return (
    <thead className="text-left text-xs text-dimmer uppercase tracking-wider">
      <tr className="hairline-b">
        {selectionEnabled && (() => {
          const allChecked = ids.length > 0 && ids.every((id) => selectedIds!.has(id));
          const someChecked = !allChecked && ids.some((id) => selectedIds!.has(id));
          return (
            <th className="pl-4 pr-1 py-2.5 font-normal">
              <input
                type="checkbox"
                aria-label="Select all in group"
                checked={allChecked}
                ref={(el) => {
                  if (el) el.indeterminate = someChecked;
                }}
                onChange={(e) => {
                  e.stopPropagation();
                  onToggleSelectAll?.(ids, e.target.checked);
                }}
                onClick={(e) => e.stopPropagation()}
                className="h-3.5 w-3.5 rounded border-white/20 bg-transparent accent-accent cursor-pointer"
              />
            </th>
          );
        })()}
        {visibleCols.map((k, idx) => {
          const c = COLS[k];
          const isLast = idx === visibleCols.length - 1;
          const sortable = SORTABLE[k];
          const active = sort?.key === k;
          const SortIcon = !active
            ? ChevronsUpDown
            : sort!.dir === "asc"
              ? ArrowUp
              : ArrowDown;
          return (
            <th
              key={k}
              className={cn(
                "px-4 py-2.5 font-normal relative select-none",
                c.align === "right" && "text-right"
              )}
            >
              <button
                type="button"
                onClick={() => sortable && toggleSort(k)}
                className={cn(
                  "inline-flex items-center gap-1 max-w-full",
                  c.align === "right" && "ml-auto",
                  sortable ? "hover:text-foreground transition cursor-pointer" : "cursor-default",
                  active && "text-foreground"
                )}
                aria-label={
                  sortable
                    ? `Sort by ${c.label}${active ? ` (${sort!.dir})` : ""}`
                    : c.label
                }
              >
                <span className="truncate">{c.label}</span>
                {sortable && (
                  <SortIcon
                    className={cn(
                      "h-3 w-3 shrink-0",
                      active ? "opacity-100" : "opacity-40"
                    )}
                  />
                )}
              </button>
              {!isLast && (
                <span
                  onMouseDown={onResizeStart(k)}
                  onClick={(e) => e.stopPropagation()}
                  className="absolute top-0 right-0 h-full w-1.5 cursor-col-resize group flex items-center justify-center"
                  aria-label={`Resize ${c.label} column`}
                  role="separator"
                >
                  <span className="h-4 w-px bg-white/10 group-hover:bg-accent transition" />
                </span>
              )}
            </th>
          );
        })}
      </tr>
    </thead>
  );
}
