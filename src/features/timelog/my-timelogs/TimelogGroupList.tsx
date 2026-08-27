import { format } from "date-fns";
import { ChevronDown } from "lucide-react";
import { MemberAvatar } from "@/components/MemberAvatar";
import { cn, displayTitle, formatHours } from "@/lib/utils";
import type { MyLogRow } from "./useMyTimeLogs";

interface LogGroup {
  key: string;
  label: string;
  hours: number;
  rows: MyLogRow[];
}

/** Collapsible grouped list of a user's own time logs. */
export function TimelogGroupList({
  groups,
  collapsed,
  onToggle,
  onOpen,
  user,
}: {
  groups: LogGroup[];
  collapsed: Record<string, boolean>;
  onToggle: (key: string) => void;
  onOpen: (row: MyLogRow) => void;
  user: { name: string; avatar_color: string } | null;
}) {
  return (
    <>
      {groups.map((g) => {
        const isCollapsed = !!collapsed[g.key];
        return (
          <div key={g.key} className="glass rounded-2xl overflow-hidden">
            <button
              type="button"
              onClick={() => onToggle(g.key)}
              className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-white/[0.02] transition text-left"
            >
              <ChevronDown
                className={cn("h-3.5 w-3.5 text-dimmer transition", isCollapsed && "-rotate-90")}
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
                    onClick={() => onOpen(l)}
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
                    {user && <MemberAvatar name={user.name} color={user.avatar_color} size="xs" />}
                  </button>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </>
  );
}
