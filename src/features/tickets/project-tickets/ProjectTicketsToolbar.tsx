import { ChevronDown, Clock, LayoutGrid, List, Plus, Search, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CardDisplayMenu } from "@/features/tickets/CardDisplayMenu";
import { ColumnDisplayMenu } from "@/features/tickets/ColumnDisplayMenu";
import type { CardDisplayPrefs } from "@/features/tickets/useCardDisplayPrefs";
import type { ColumnDisplayPrefs } from "@/features/tickets/useColumnDisplayPrefs";
import {
  TicketsFilter,
  type TicketFilters,
  type FilterSection,
} from "@/features/tickets/TicketsFilter";
import type { TicketRow } from "@/features/tickets/useProjectTickets";
import type { GroupBy } from "@/features/tickets/TicketsList";
import { GroupBySelect } from "@/features/tickets/GroupBySelect";
import type { ProjectRole } from "@/lib/types";
import { canManageTickets } from "@/features/team/useProjectRole";
import { cn } from "@/lib/utils";

type ViewMode = "board" | "list";

export function ProjectTicketsToolbar({
  projectId,
  tickets,
  filters,
  setFilters,
  view,
  setView,
  filterMine,
  setFilterMine,
  setTouched,
  groupBy,
  setGroupBy,
  cardPrefs,
  setCardPrefs,
  resetCardPrefs,
  columnPrefs,
  setColumnPrefs,
  resetColumnPrefs,
  search,
  setSearch,
  role,
  user,
  activeTimer,
  onStartGroupTimer,
  onAdd,
  onImport,
  showViewToggle = true,
  showMineToggle = true,
  showGroupBy = true,
  showAddButtons = true,
  showGroupTimer = true,
  extras,
  filterSections,
}: {
  projectId: string;
  tickets: TicketRow[];
  filters: TicketFilters;
  setFilters: (f: TicketFilters) => void;
  view: ViewMode;
  setView?: (v: ViewMode) => void;
  filterMine: boolean;
  setFilterMine?: (v: boolean) => void;
  setTouched?: (v: boolean) => void;
  groupBy: GroupBy;
  setGroupBy?: (g: GroupBy) => void;
  cardPrefs?: CardDisplayPrefs;
  setCardPrefs?: (p: CardDisplayPrefs) => void;
  resetCardPrefs?: () => void;
  columnPrefs?: ColumnDisplayPrefs;
  setColumnPrefs?: (p: ColumnDisplayPrefs) => void;
  resetColumnPrefs?: () => void;
  search: string;
  setSearch: (s: string) => void;
  role: ProjectRole | null;
  user: { id: string } | null;
  activeTimer?: unknown;
  onStartGroupTimer?: () => void;
  onAdd?: () => void;
  onImport?: () => void;
  showViewToggle?: boolean;
  showMineToggle?: boolean;
  showGroupBy?: boolean;
  showAddButtons?: boolean;
  showGroupTimer?: boolean;
  extras?: React.ReactNode;
  filterSections?: FilterSection[];
}) {
  return (
    <div className="sticky top-14 z-30 -mx-4 sm:-mx-6 px-4 sm:px-6 py-3 mb-4 flex items-center gap-3 flex-wrap bg-background/85 backdrop-blur-md hairline-b">
      {showViewToggle && setView && (
        <div className="flex gap-1 p-1 rounded-lg bg-white/5 hairline">
          <button
            onClick={() => setView("board")}
            className={cn(
              "px-3 py-1 text-xs rounded-md transition inline-flex items-center gap-1.5",
              view === "board" ? "bg-foreground text-background" : "text-dim hover:text-foreground"
            )}
          >
            <LayoutGrid className="h-3 w-3" /> Board
          </button>
          <button
            onClick={() => setView("list")}
            className={cn(
              "px-3 py-1 text-xs rounded-md transition inline-flex items-center gap-1.5",
              view === "list" ? "bg-foreground text-background" : "text-dim hover:text-foreground"
            )}
          >
            <List className="h-3 w-3" /> List
          </button>
        </div>
      )}

      {view === "list" && (showMineToggle || showGroupBy) && (
        <>
          {showMineToggle && setFilterMine && (
            <div className="flex gap-1 p-1 rounded-lg bg-white/5 hairline">
              <button
                onClick={() => { setTouched?.(true); setFilterMine(false); }}
                className={cn("px-3 py-1 text-xs rounded-md transition", !filterMine ? "bg-foreground text-background" : "text-dim hover:text-foreground")}
              >
                All
              </button>
              <button
                onClick={() => { setTouched?.(true); setFilterMine(true); }}
                className={cn("px-3 py-1 text-xs rounded-md transition", filterMine ? "bg-foreground text-background" : "text-dim hover:text-foreground")}
              >
                My tickets
              </button>
            </div>
          )}
          {showGroupBy && setGroupBy && (
            <GroupBySelect value={groupBy} onChange={setGroupBy} />
          )}
        </>
      )}

      <TicketsFilter
        projectId={projectId}
        tickets={tickets}
        filters={filters}
        onChange={setFilters}
        sections={filterSections}
      />

      {extras}

      {view === "board" && cardPrefs && setCardPrefs && resetCardPrefs && (
        <CardDisplayMenu
          prefs={cardPrefs}
          onChange={setCardPrefs}
          onReset={resetCardPrefs}
        />
      )}
      {view === "list" && columnPrefs && setColumnPrefs && resetColumnPrefs && (
        <ColumnDisplayMenu
          prefs={columnPrefs}
          onChange={setColumnPrefs}
          onReset={resetColumnPrefs}
        />
      )}
      <div className="ml-auto flex items-center gap-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-dimmer pointer-events-none" />
          <Input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search ID or title…"
            className="h-8 w-[220px] pl-8 pr-7 text-xs"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              aria-label="Clear search"
              className="absolute right-2 top-1/2 -translate-y-1/2 text-dimmer hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        {showGroupTimer && filterMine && user && role && !activeTimer && onStartGroupTimer && (
          <Button
            size="sm"
            onClick={onStartGroupTimer}
            className="gap-2"
          >
            <Clock className="h-4 w-4" /> Start group timer
          </Button>
        )}
        {showAddButtons && canManageTickets(role) && onAdd && (
          <div className="inline-flex rounded-md overflow-hidden">
            <Button
              size="sm"
              onClick={onAdd}
              className="gap-2 rounded-r-none"
            >
              <Plus className="h-4 w-4" /> Add ticket
            </Button>
            {onImport && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    size="sm"
                    aria-label="More add options"
                    className="rounded-l-none px-2 border-l border-primary-foreground/20"
                  >
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={onImport} className="gap-2">
                    <Upload className="h-4 w-4" /> Import from CSV…
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
