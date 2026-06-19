import { useMemo, useState } from "react";
import { ChevronDown, ChevronRight, ChevronsDownUp, ChevronsUpDown } from "lucide-react";
import { useStatuses } from "@/features/statuses/useStatuses";
import type { TicketRow } from "@/features/tickets/useProjectTickets";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { COLS, ColKey, GroupBy } from "./list/columns";
import type { ColumnDisplayPrefs } from "./useColumnDisplayPrefs";
import { useTicketsSort } from "./list/useTicketsSort";
import { useColumnResize } from "./list/useColumnResize";
import { useTicketsGrouping } from "./list/useTicketsGrouping";
import { TicketsListHeader } from "./list/TicketsListHeader";
import { TicketsListRow } from "./list/TicketsListRow";
import type { PoolData } from "./list/poolData";

export type { GroupBy } from "./list/columns";
export type { PoolData } from "./list/poolData";

export function TicketsList({
  tickets,
  groupBy,
  onOpen,
  selectedIds,
  onToggleSelect,
  onToggleSelectAll,
  showQuickStart = false,
  currentUserId,
  extraCols,
  poolData,
  columnPrefs,
}: {
  tickets: TicketRow[];
  groupBy: GroupBy;
  onOpen: (t: TicketRow) => void;
  selectedIds?: Set<string>;
  onToggleSelect?: (id: string, shiftKey: boolean) => void;
  onToggleSelectAll?: (ids: string[], select: boolean) => void;
  showQuickStart?: boolean;
  currentUserId?: string;
  extraCols?: ColKey[];
  poolData?: PoolData;
  columnPrefs?: ColumnDisplayPrefs;
}) {

  const selectionEnabled = !!selectedIds && !!onToggleSelect;
  const { statuses } = useStatuses();
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const { sort, toggleSort, sortTickets } = useTicketsSort(statuses, poolData);

  const visibleCols: ColKey[] = useMemo(() => {
    const out: ColKey[] = ["id", "title"];
    if (groupBy !== "epic") out.push("epic");
    if (groupBy !== "version") out.push("version");
    if (groupBy !== "status") out.push("status");
    out.push("dev_status", "fe", "be");
    if (extraCols?.includes("fe_pool")) out.push("fe_pool");
    if (extraCols?.includes("be_pool")) out.push("be_pool");
    if (groupBy !== "assignee") out.push("assignees");
    extraCols?.forEach((c) => {
      if (!out.includes(c)) out.push(c);
    });
    if (columnPrefs) {
      // `title` is always visible; everything else respects user prefs.
      return out.filter((c) => c === "title" || columnPrefs[c] !== false);
    }
    return out;
  }, [groupBy, extraCols, columnPrefs]);


  const { widthFor, totalWidth, onResizeStart } = useColumnResize(visibleCols);

  const groups = useTicketsGrouping({ tickets, statuses, groupBy });

  if (tickets.length === 0) return null;

  const allCollapsed = groups.length > 0 && groups.every((g) => (collapsed[g.key] ?? true));
  const toggleAll = () =>
    setCollapsed(allCollapsed ? Object.fromEntries(groups.map((g) => [g.key, false])) : {});

  return (
    <TooltipProvider>
      <div className="flex flex-col gap-3">
        {groupBy !== "none" && groups.length > 1 && (
          <div className="flex justify-end -mb-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={toggleAll}
                  className="h-7 w-7 rounded-md flex items-center justify-center text-dimmer hover:bg-white/[0.04] transition"
                  aria-label={allCollapsed ? "Expand all groups" : "Collapse all groups"}
                >
                  {allCollapsed ? (
                    <ChevronsUpDown className="h-3.5 w-3.5" />
                  ) : (
                    <ChevronsDownUp className="h-3.5 w-3.5" />
                  )}
                </button>
              </TooltipTrigger>
              <TooltipContent>{allCollapsed ? "Expand all groups" : "Collapse all groups"}</TooltipContent>
            </Tooltip>
          </div>
        )}
        {groups.map((rawGroup) => {
          const g = { ...rawGroup, tickets: sortTickets(rawGroup.tickets) };
          const isCollapsed = groupBy === "none" ? false : (collapsed[g.key] ?? true);
          const ids = g.tickets.map((t) => t.id);
          return (
            <div key={g.key} className="glass rounded-2xl overflow-hidden">
              {groupBy !== "none" && (
                <button
                  onClick={() => setCollapsed((c) => ({ ...c, [g.key]: !(c[g.key] ?? true) }))}
                  className="w-full flex items-center gap-2 px-4 py-3 hairline-b hover:bg-white/[0.02] transition text-left"
                >
                  {isCollapsed ? (
                    <ChevronRight className="h-3.5 w-3.5 text-dimmer" />
                  ) : (
                    <ChevronDown className="h-3.5 w-3.5 text-dimmer" />
                  )}
                  {g.color && (
                    <span className="h-2 w-2 rounded-full" style={{ background: g.color }} />
                  )}
                  <span className="text-sm font-medium">{g.label}</span>
                  <span className="text-xs text-dimmer font-mono ml-1">
                    {g.tickets.length}
                  </span>
                </button>
              )}
              {!isCollapsed && (
                <div className="overflow-x-auto">
                  <table
                    className="text-sm table-fixed"
                    style={{ width: Math.max(totalWidth, 0), minWidth: "100%" }}
                  >
                    <colgroup>
                      {selectionEnabled && <col style={{ width: 36 }} />}
                      {visibleCols.map((k) => (
                        <col key={k} style={{ width: widthFor(k) }} />
                      ))}
                    </colgroup>
                    <TicketsListHeader
                      visibleCols={visibleCols}
                      selectionEnabled={selectionEnabled}
                      ids={ids}
                      selectedIds={selectedIds}
                      onToggleSelectAll={onToggleSelectAll}
                      sort={sort}
                      toggleSort={toggleSort}
                      onResizeStart={onResizeStart}
                    />
                    <tbody>
                      {g.tickets.map((t) => (
                        <TicketsListRow
                          key={`${g.key}-${t.id}`}
                          t={t}
                          visibleCols={visibleCols}
                          selectionEnabled={selectionEnabled}
                          selected={selectionEnabled && selectedIds!.has(t.id)}
                          onOpen={onOpen}
                          onToggleSelect={onToggleSelect}
                          showQuickStart={showQuickStart}
                          currentUserId={currentUserId}
                          statuses={statuses}
                          groupKey={g.key}
                          poolData={poolData}
                        />

                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </TooltipProvider>
  );
}
