import { format } from "date-fns";
import { AlertTriangle } from "lucide-react";
import { MemberAvatar } from "@/components/MemberAvatar";
import { formatHours } from "@/lib/utils";
import { DateRangeControl, type DateRange } from "@/features/health/DateRangeControl";
import { ProfitabilityPill } from "./ProfitabilityPill";

interface Member {
  user_id: string;
  role: string;
  member: { id: string; name: string; avatar_color: string };
}

interface Props {
  members: Member[];
  range: DateRange;
  setRange: (r: DateRange) => void;
  ticketsByMember: Record<string, number>;
  remainingByMember: Record<string, number>;
  weekHours: Record<string, number>;
  overall: string;
  profitabilityPct: number;
  profitabilityOrigPct: number;
  totalEst: number;
  totalOrig: number;
  totalAct: number;
  unassignedCount: number;
}

export function HealthSummaryRow({
  members,
  range,
  setRange,
  ticketsByMember,
  remainingByMember,
  weekHours,
  overall,
  profitabilityPct,
  profitabilityOrigPct,
  totalEst,
  totalOrig,
  totalAct,
  unassignedCount,
}: Props) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <div className="glass rounded-2xl p-5 md:col-span-3">
        <div className="mb-3 flex items-center justify-between gap-3 flex-wrap">
          <div>
            <div className="text-xs uppercase tracking-wider text-dimmer">Member capacity</div>
            <div className="text-[10px] text-dimmer mt-0.5">
              Assigned & Logged scoped to {format(range.from, "MMM d")} – {format(range.to, "MMM d, yyyy")}
            </div>
          </div>
          <DateRangeControl value={range} onChange={setRange} />
        </div>
        {members.length === 0 ? (
          <div className="text-sm text-dim">No members yet.</div>
        ) : (
          <>
            <div className="flex items-center gap-3 px-2 pb-2 border-b border-white/5 text-[10px] uppercase tracking-wider text-dimmer">
              <div className="w-7 shrink-0" />
              <div className="flex-1">Member</div>
              <div className="w-14 text-right">Open tix</div>
              <div className="w-20 text-right">Assigned</div>
              <div className="w-16 text-right">Logged</div>
            </div>
            <div className="space-y-2 pt-2">
              {members.map((m) => (
                <div key={m.user_id} className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-white/[0.02] transition">
                  <MemberAvatar name={m.member.name} color={m.member.avatar_color} size="sm" />
                  <div className="flex-1">
                    <div className="text-sm">{m.member.name}</div>
                    <div className="text-[10px] text-dimmer">{m.role}</div>
                  </div>
                  <div className="text-xs font-mono text-dim w-14 text-right" title="Open tickets currently assigned to this member (not date-filtered)">
                    <span className="text-foreground">{ticketsByMember[m.user_id] ?? 0}</span>
                  </div>
                  <div className="text-xs font-mono text-dim w-20 text-right" title="Remaining hours on active tickets assigned within the selected period">
                    <span className="text-foreground">{formatHours(remainingByMember[m.user_id] ?? 0)}</span>
                  </div>
                  <div className="text-xs font-mono text-dim w-16 text-right" title="Hours logged within the selected period">
                    {formatHours(weekHours[m.user_id] ?? 0)}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <div className="space-y-4">
        <div className="glass rounded-2xl p-5 flex flex-col">
          <div className="text-xs uppercase tracking-wider text-dimmer mb-2">Profitability</div>
          <div className="flex items-center gap-3">
            <ProfitabilityPill state={overall} />
            <div>
              <div className="text-2xl font-semibold font-mono ticker">{profitabilityPct}%</div>
              <div className="text-xs text-dim">of estimate burned</div>
              {totalOrig > 0 && (
                <div className="text-[11px] text-dimmer mt-0.5 font-mono">
                  {profitabilityOrigPct}% <span className="font-sans">of original</span>
                </div>
              )}
            </div>
          </div>
          <div className="mt-4 pt-4 grid grid-cols-3 gap-3 text-xs border-t border-white/5">
            <div>
              <div className="text-dimmer">Total est.</div>
              <div className="font-mono">{formatHours(totalEst)}</div>
            </div>
            <div>
              <div className="text-dimmer">Original</div>
              <div className="font-mono">{totalOrig > 0 ? formatHours(totalOrig) : "—"}</div>
            </div>
            <div>
              <div className="text-dimmer">Total actual</div>
              <div className="font-mono">{formatHours(totalAct)}</div>
            </div>
          </div>
        </div>

        <div className="glass rounded-2xl p-5">
          <div className="text-xs uppercase tracking-wider text-dimmer mb-2">Unassigned backlog</div>
          <div className="flex items-center gap-2">
            <AlertTriangle className={`h-4 w-4 ${unassignedCount > 0 ? "text-health-warn" : "text-dimmer"}`} />
            <div className="text-2xl font-semibold font-mono ticker">{unassignedCount}</div>
          </div>
          <div className="text-xs text-dim mt-1">Open tickets with no assignee</div>
        </div>
      </div>
    </div>
  );
}
