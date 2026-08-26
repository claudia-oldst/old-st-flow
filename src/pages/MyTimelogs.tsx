import { useMemo, useState } from "react";
import { format, subDays } from "date-fns";
import { Clock, ChevronDown, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DateRangeControl, type DateRange } from "@/features/_shared/DateRangeControl";
import { MultiSelectFilter } from "@/features/estimates/MultiSelectFilter";
import { ListPagination } from "@/components/ListPagination";
import { MemberAvatar } from "@/components/MemberAvatar";
import { EditTimeLogDialog } from "@/features/timelog/EditTimeLogDialog";
import type { TicketLogEntry } from "@/features/timelog/useTicketTimeLogs";
import { InlineLogRow } from "@/features/timelog/my-timelogs/InlineLogRow";
import {
  useMyTimeLogs,
  useGroupedLogs,
  useMyProjects,
  type LogGroupBy,
  type MyLogRow,
} from "@/features/timelog/my-timelogs/useMyTimeLogs";
import { fetchTicketDetail } from "@/features/tickets/fetchTicketDetail";
import type { TicketRow } from "@/features/tickets/useProjectTickets";
import { useCurrentUser } from "@/store/currentUser";
import { usePersistentState } from "@/hooks/usePersistentState";
import { cn, displayTitle, formatHours, PAGE_SHELL } from "@/lib/utils";

const PAGE_SIZE = 50;

function initialRange(): DateRange {
  const to = new Date();
  to.setHours(23, 59, 59, 999);
  const from = subDays(new Date(), 89);
  from.setHours(0, 0, 0, 0);
  return { from, to };
}

export default function MyTimelogs() {
  const user = useCurrentUser((s) => s.user);
  const [range, setRange] = useState<DateRange>(initialRange);
  const [groupBy, setGroupBy] = usePersistentState<LogGroupBy>(
    `myTimelogs:groupBy:${user?.id ?? "anon"}`,
    "month",
  );
  const [projectIds, setProjectIds] = usePersistentState<string[]>(
    `myTimelogs:projects:${user?.id ?? "anon"}`,
    [],
  );
  const [page, setPage] = useState(1);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<{ log: TicketLogEntry; ticket: TicketRow } | null>(null);

  const { logs, loading, reload } = useMyTimeLogs(range);
  const { data: projects = [] } = useMyProjects();

  const projectOptions = useMemo(
    () => projects.map((p) => ({ value: p.id, label: p.name })),
    [projects],
  );
  // Empty selection means "all projects".
  const filtered = useMemo(
    () =>
      projectIds.length === 0
        ? logs
        : logs.filter((l) => l.project && projectIds.includes(l.project.id)),
    [logs, projectIds],
  );

  const totalHours = filtered.reduce((s, l) => s + l.hours, 0);
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const groups = useGroupedLogs(paged, groupBy);

  const openEdit = async (row: MyLogRow) => {
    if (!user) return;
    const detail = await fetchTicketDetail(row.ticket_id);
    if (!detail) {
      toast.error("Ticket not found");
      return;
    }
    setEditing({
      log: {
        id: row.id,
        hours: row.hours,
        discipline: row.discipline,
        note: row.note,
        logged_at: row.logged_at,
        source: row.source,
        user_id: row.user_id,
        user: { name: user.name, avatar_color: user.avatar_color },
      },
      ticket: detail,
    });
  };

  return (
    <div className={cn(PAGE_SHELL, "py-10")}>
      <div className="mb-6 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="text-xs uppercase tracking-[0.18em] text-dimmer mb-2">
            {user?.name ?? "—"}
          </div>
          <h1 className="font-display text-3xl font-semibold tracking-tight flex items-center gap-2">
            <Clock className="h-7 w-7" /> My Timelogs
          </h1>
          <p className="text-dim mt-1">Everything you have logged, across all projects.</p>
        </div>
        <Button onClick={() => setAdding(true)} className="gap-1.5">
          <Plus className="h-3.5 w-3.5" /> Log time
        </Button>
      </div>

      <div className="sticky top-14 z-30 -mx-4 sm:-mx-6 px-4 sm:px-6 py-3 mb-4 flex items-center gap-3 flex-wrap bg-background/85 backdrop-blur-md hairline-b">
        <div className="flex items-center gap-2">
          <span className="text-xs text-dim">Group by</span>
          <Select
            value={groupBy}
            onValueChange={(v) => {
              setGroupBy(v as LogGroupBy);
              setPage(1);
            }}
          >
            <SelectTrigger className="h-8 text-xs w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="month">Month</SelectItem>
              <SelectItem value="week">Week</SelectItem>
              <SelectItem value="day">Day</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <MultiSelectFilter
          label="Project"
          options={projectOptions}
          selected={projectIds.length === 0 ? projectOptions.map((o) => o.value) : projectIds}
          onChange={(next) => {
            setProjectIds(next.length === projectOptions.length ? [] : next);
            setPage(1);
          }}
          searchable
          filterStyle
        />

        <div className="ml-auto">
          <DateRangeControl
            value={range}
            onChange={(r) => {
              setRange(r);
              setPage(1);
            }}
          />
        </div>
      </div>

      <div className="flex items-center gap-3 mb-3 text-sm">
        <span className="font-mono text-foreground">{formatHours(totalHours)}</span>
        <span className="text-dimmer">·</span>
        <span className="text-dim">{filtered.length} entries</span>
      </div>

      {loading ? (
        <div className="glass rounded-2xl overflow-hidden divide-y divide-white/5">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-12 rounded-none bg-white/[0.03]" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass rounded-2xl p-16 text-center">
          <Clock className="h-10 w-10 mx-auto text-dimmer mb-4" />
          <div className="text-lg font-medium">No time logged</div>
          <div className="text-dim text-sm mt-1">
            Nothing in this date range for the selected projects.
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {groups.map((g) => {
            const isCollapsed = !!collapsed[g.key];
            return (
              <div key={g.key} className="glass rounded-2xl overflow-hidden">
                <button
                  type="button"
                  onClick={() => setCollapsed((c) => ({ ...c, [g.key]: !isCollapsed }))}
                  className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-white/[0.02] transition text-left"
                >
                  <ChevronDown
                    className={cn(
                      "h-3.5 w-3.5 text-dimmer transition",
                      isCollapsed && "-rotate-90",
                    )}
                  />
                  <span className="text-sm font-medium">{g.label}</span>
                  <span className="text-[11px] text-dimmer">{g.rows.length} entries</span>
                  <span className="ml-auto font-mono text-sm">{formatHours(g.hours)}</span>
                </button>
                {!isCollapsed && (
                  <div className="divide-y divide-white/5">
                    {g.rows.map((l) => (
                      <button
                        key={l.id}
                        type="button"
                        onClick={() => openEdit(l)}
                        className="w-full text-left flex items-center gap-3 px-4 py-2.5 hover:bg-white/[0.02] transition"
                      >
                        <span className="text-[11px] text-dimmer w-16 shrink-0">
                          {format(new Date(l.logged_at), "d MMM")}
                        </span>
                        <span className="font-mono text-xs text-dimmer w-24 shrink-0 truncate">
                          {l.ticket?.formatted_id ?? "—"}
                        </span>
                        <span className="flex-1 min-w-0 truncate text-sm">
                          {l.ticket
                            ? displayTitle(l.ticket.title, l.ticket.ticket_type as any)
                            : "Deleted ticket"}
                          {l.note && <span className="text-dimmer"> — {l.note}</span>}
                        </span>
                        <span className="text-[10px] uppercase tracking-wider text-dimmer w-16 shrink-0 hidden sm:block">
                          {l.project?.acronym ?? ""}
                        </span>
                        <span className="text-[10px] uppercase tracking-wider text-dim w-14 shrink-0">
                          {l.discipline}
                        </span>
                        <span className="font-mono text-sm w-14 text-right shrink-0">
                          {formatHours(l.hours)}
                        </span>
                        {user && (
                          <MemberAvatar name={user.name} color={user.avatar_color} size="xs" />
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          <ListPagination
            page={page}
            total={filtered.length}
            pageSize={PAGE_SIZE}
            onChange={setPage}
            className="pt-2"
          />
        </div>
      )}

      <NewTimeLogDialog open={newOpen} onOpenChange={setNewOpen} onLogged={reload} />

      {editing && (
        <EditTimeLogDialog
          open={!!editing}
          onOpenChange={(v) => !v && setEditing(null)}
          log={editing.log}
          ticket={editing.ticket}
          onSaved={reload}
        />
      )}
    </div>
  );
}
