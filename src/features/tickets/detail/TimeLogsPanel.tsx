import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Clock, Pencil } from "lucide-react";
import { MemberAvatar } from "@/components/MemberAvatar";
import { cn, formatHours } from "@/lib/utils";
import { useTicketTimeLogs, type TicketLogEntry } from "@/features/timelog/useTicketTimeLogs";
import { useCurrentUser } from "@/store/currentUser";
import { EditTimeLogDialog } from "@/features/timelog/EditTimeLogDialog";
import type { TicketRow } from "@/features/tickets/useProjectTickets";

const LOGS_PER_PAGE = 10;

export function TimeLogsPanel({
  ticket,
  canLog,
  onOpenLog,
  reloadKey,
  onLogCount,
}: {
  ticket: TicketRow;
  canLog: boolean;
  onOpenLog: () => void;
  reloadKey: number;
  onLogCount?: (n: number) => void;
}) {
  const { logs, reload } = useTicketTimeLogs(ticket.id);
  const user = useCurrentUser((s) => s.user);
  const [logPage, setLogPage] = useState(0);
  const [editLog, setEditLog] = useState<TicketLogEntry | null>(null);
  useEffect(() => { setLogPage(0); }, [ticket.id, logs.length]);
  useEffect(() => { reload(); }, [reloadKey, reload]);
  useEffect(() => { onLogCount?.(logs.length); }, [logs.length, onLogCount]);

  const perPerson = useMemo(() => {
    const map = new Map<string, { name: string; color: string; hours: number }>();
    logs.forEach((l) => {
      const existing = map.get(l.user_id);
      if (existing) existing.hours += l.hours;
      else map.set(l.user_id, { name: l.user.name, color: l.user.avatar_color, hours: l.hours });
    });
    return Array.from(map.values()).sort((a, b) => b.hours - a.hours);
  }, [logs]);

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div className="text-xs uppercase tracking-wider text-dimmer">Time logs ({logs.length})</div>
        {canLog && (
          <Button size="sm" onClick={onOpenLog} className="gap-1.5">
            <Clock className="h-3.5 w-3.5" /> Log time
          </Button>
        )}
        {!canLog && (
          <span className="text-[10px] text-dimmer">Assign yourself to log time</span>
        )}
      </div>
      {logs.length === 0 ? (
        <div className="text-sm text-dim p-4 rounded-lg bg-white/[0.02] hairline">
          No time logged yet.
        </div>
      ) : (
        (() => {
          const totalPages = Math.max(1, Math.ceil(logs.length / LOGS_PER_PAGE));
          const page = Math.min(logPage, totalPages - 1);
          const start = page * LOGS_PER_PAGE;
          const visible = logs.slice(start, start + LOGS_PER_PAGE);
          return (
            <div className="space-y-1.5">
              {visible.map((l) => {
                const mine = !!user && l.user_id === user.id;
                return (
                  <button
                    key={l.id}
                    type="button"
                    disabled={!mine}
                    onClick={() => mine && setEditLog(l)}
                    title={mine ? "Edit your time log" : undefined}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2 rounded-lg bg-white/[0.02] hairline text-sm text-left transition",
                      mine && "hover:bg-white/[0.05] cursor-pointer",
                      !mine && "cursor-default",
                    )}
                  >
                    <MemberAvatar name={l.user.name} color={l.user.avatar_color} size="xs" />
                    <span className="text-dim flex-1 truncate">
                      {l.user.name} · <span className="font-mono">{formatHours(l.hours)}</span> · {l.discipline}
                      {l.note && <span className="text-dimmer"> — {l.note}</span>}
                    </span>
                    {mine && <Pencil className="h-3 w-3 text-dimmer shrink-0" />}
                    <span className="text-[10px] text-dimmer">{new Date(l.logged_at).toLocaleDateString()}</span>
                  </button>
                );
              })}
              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-2">
                  <span className="text-[11px] text-dimmer">
                    {start + 1}–{Math.min(start + LOGS_PER_PAGE, logs.length)} of {logs.length}
                  </span>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0"
                      disabled={page === 0}
                      onClick={() => setLogPage(page - 1)}
                    >
                      <ChevronLeft className="h-3.5 w-3.5" />
                    </Button>
                    <span className="text-[11px] text-dim font-mono px-1">
                      {page + 1} / {totalPages}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0"
                      disabled={page >= totalPages - 1}
                      onClick={() => setLogPage(page + 1)}
                    >
                      <ChevronRight className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          );
        })()
      )}

      {editLog && (
        <EditTimeLogDialog
          open={!!editLog}
          onOpenChange={(v) => !v && setEditLog(null)}
          log={editLog}
          ticket={ticket}
          onSaved={reload}
        />
      )}
    </div>
  );
}
