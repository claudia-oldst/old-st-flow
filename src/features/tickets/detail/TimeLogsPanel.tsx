import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Clock } from "lucide-react";
import { MemberAvatar } from "@/components/MemberAvatar";
import { formatHours } from "@/lib/utils";
import { useTicketTimeLogs } from "@/features/timelog/useTicketTimeLogs";

const LOGS_PER_PAGE = 10;

export function TimeLogsPanel({
  ticketId,
  canLog,
  onOpenLog,
  reloadKey,
}: {
  ticketId: string;
  canLog: boolean;
  onOpenLog: () => void;
  reloadKey: number;
}) {
  const { logs, reload } = useTicketTimeLogs(ticketId);
  const [logPage, setLogPage] = useState(0);
  useEffect(() => { setLogPage(0); }, [ticketId, logs.length]);
  useEffect(() => { reload(); }, [reloadKey, reload]);

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
              {visible.map((l) => (
                <div key={l.id} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-white/[0.02] hairline text-sm">
                  <MemberAvatar name={l.user.name} color={l.user.avatar_color} size="xs" />
                  <span className="text-dim flex-1 truncate">
                    {l.user.name} · <span className="font-mono">{formatHours(l.hours)}</span> · {l.discipline}
                    {l.note && <span className="text-dimmer"> — {l.note}</span>}
                  </span>
                  <span className="text-[10px] text-dimmer">{new Date(l.logged_at).toLocaleDateString()}</span>
                </div>
              ))}
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
    </div>
  );
}
