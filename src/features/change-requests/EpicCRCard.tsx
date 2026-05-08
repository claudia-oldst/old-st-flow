import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { ChevronDown, Check, X } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from "recharts";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { cn, formatHours } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import type { TicketRow } from "@/features/tickets/useProjectTickets";
import { Stat } from "@/features/_shared/estimate-ui/Stat";
import { StatusBadge } from "@/features/_shared/estimate-ui/StatusBadge";
import { crEstimate, computeCRTotals } from "./epic-cr/useEpicCR";

interface Props {
  epicKey: string;
  epicName: string;
  projectAcronym: string;
  /** All non-CR tickets in the epic (used for original baseline + actuals). */
  baselineTickets: TicketRow[];
  /** CR tickets in this epic, after status/date filtering — what shows in the table. */
  filteredCRs: TicketRow[];
  /** All CR tickets in this epic (used for chart math). */
  allCRs: TicketRow[];
  canReview: boolean;
  onApprove: (t: TicketRow) => void;
  onReject: (t: TicketRow) => void;
  onOpenTicket?: (t: TicketRow) => void;
  defaultOpen?: boolean;
  range: { from: Date; to: Date };
  hideReject?: boolean;
}

export function EpicCRCard({
  epicName,
  projectAcronym,
  baselineTickets,
  filteredCRs,
  allCRs,
  canReview,
  onApprove,
  onReject,
  onOpenTicket,
  defaultOpen,
  range,
  hideReject,
}: Props) {
  const [open, setOpen] = useState(!!defaultOpen);
  const [memberNames, setMemberNames] = useState<Record<string, string>>({});

  useEffect(() => {
    const ids = Array.from(
      new Set(
        allCRs
          .filter((t) => t.cr_approval === "approved" && t.cr_decided_by)
          .map((t) => t.cr_decided_by as string),
      ),
    ).filter((id) => !(id in memberNames));
    if (ids.length === 0) return;
    let cancelled = false;
    supabase
      .from("team_members")
      .select("id,name")
      .in("id", ids)
      .then(({ data }) => {
        if (cancelled || !data) return;
        setMemberNames((prev) => {
          const next = { ...prev };
          data.forEach((m: any) => {
            next[m.id] = m.name;
          });
          return next;
        });
      });
    return () => {
      cancelled = true;
    };
  }, [allCRs, memberNames]);

  const totals = useMemo(() => computeCRTotals(baselineTickets, allCRs), [baselineTickets, allCRs]);

  const chartData = useMemo(() => {
    const start = range.from.getTime();
    let end = range.to.getTime();
    if (end <= start) end = start + 86_400_000;
    const buckets = 24;
    const step = Math.max(1, Math.floor((end - start) / buckets));
    const out: Array<{ label: string; original: number; current: number; projected: number }> = [];
    for (let t = start; t <= end; t += step) {
      let approved = 0;
      let pending = 0;
      allCRs.forEach((c) => {
        if (c.cr_approval === "approved") {
          const ts = c.cr_decided_at ? new Date(c.cr_decided_at).getTime() : Number.POSITIVE_INFINITY;
          if (ts <= t) approved += crEstimate(c);
        } else if (c.cr_approval === "pending") {
          const ts = new Date(c.created_at).getTime();
          if (ts <= t) pending += crEstimate(c);
        }
      });
      out.push({
        label: format(new Date(t), "d MMM"),
        original: totals.original,
        current: totals.original + approved,
        projected: totals.original + approved + pending,
      });
    }
    return out;
  }, [allCRs, totals.original, range.from, range.to]);

  return (
    <div className="glass rounded-2xl overflow-hidden">
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger className="w-full text-left">
          <div className="p-4 flex flex-col gap-3 hover:bg-white/[0.02] transition">
            <div className="flex items-start gap-3 flex-wrap">
              <div className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-white/5 hairline text-dim">
                {projectAcronym}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{epicName}</div>
                <div className="text-[11px] text-dimmer">
                  {allCRs.length} CR{allCRs.length === 1 ? "" : "s"} · {filteredCRs.length} matching
                </div>
              </div>
              <ChevronDown
                className={cn(
                  "h-4 w-4 text-dim transition-transform shrink-0",
                  open && "rotate-180"
                )}
              />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <Stat label="Original" value={totals.original} />
              <Stat label="Current (approved)" value={totals.current} accent="good" />
              <Stat label="If all approved" value={totals.projected} accent="warn" />
              <Stat label="Actual" value={totals.actual} accent="gold" />
            </div>

            {chartData.length > 1 && (
              <div className="h-24 -mx-1">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 4, right: 8, left: 4, bottom: 0 }}>
                    <CartesianGrid stroke="hsl(0 0% 100% / 0.04)" vertical={false} />
                    <XAxis
                      dataKey="label"
                      stroke="hsl(0 0% 100% / 0.3)"
                      tick={{ fontSize: 9 }}
                      tickLine={false}
                      axisLine={false}
                      minTickGap={28}
                    />
                    <YAxis
                      stroke="hsl(0 0% 100% / 0.3)"
                      tick={{ fontSize: 9 }}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(v) => formatHours(Number(v))}
                      width={44}
                      domain={[0, (dataMax: number) => Math.max(1, Math.ceil(dataMax * 1.1))]}
                      allowDecimals={false}
                    />
                    <Tooltip
                      contentStyle={{
                        background: "hsl(0 0% 8%)",
                        border: "1px solid hsl(0 0% 100% / 0.1)",
                        borderRadius: 8,
                        fontSize: 11,
                      }}
                      formatter={(v: any) => formatHours(Number(v))}
                    />
                    <Legend wrapperStyle={{ fontSize: 10 }} />
                    <Line
                      type="monotone"
                      dataKey="original"
                      name="Original"
                      stroke="hsl(0 0% 60%)"
                      strokeDasharray="4 4"
                      dot={false}
                      strokeWidth={1.2}
                    />
                    <Line
                      type="monotone"
                      dataKey="current"
                      name="Current"
                      stroke="hsl(var(--health-good))"
                      dot={false}
                      strokeWidth={1.8}
                    />
                    <Line
                      type="monotone"
                      dataKey="projected"
                      name="If approved"
                      stroke="hsl(38 92% 50%)"
                      strokeDasharray="2 3"
                      dot={false}
                      strokeWidth={1.5}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </CollapsibleTrigger>

        <CollapsibleContent className="data-[state=open]:animate-accordion-down data-[state=closed]:animate-accordion-up overflow-hidden">
          <div className="hairline-t">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-[10px] uppercase tracking-wider text-dimmer">
                    <th className="text-left font-medium px-3 py-2">Ticket ID</th>
                    <th className="text-left font-medium px-2 py-2">Ticket</th>
                    <th className="text-right font-medium px-2 py-2">FE</th>
                    <th className="text-right font-medium px-2 py-2">BE</th>
                    <th className="text-left font-medium px-2 py-2">Created</th>
                    <th className="text-left font-medium px-2 py-2">Status</th>
                    <th className="text-left font-medium px-2 py-2">Approved</th>
                    <th className="text-right font-medium px-3 py-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCRs.length === 0 && (
                    <tr>
                      <td colSpan={8} className="px-3 py-6 text-center text-dimmer">
                        No CRs match the current filters.
                      </td>
                    </tr>
                  )}
                  {filteredCRs.map((t) => (
                    <tr key={t.id} className="border-t border-white/5 hover:bg-white/[0.02]">
                      <td className="px-3 py-2 font-mono text-[11px]">
                        <button
                          type="button"
                          onClick={() => onOpenTicket?.(t)}
                          className="text-foreground hover:text-primary transition"
                        >
                          {t.formatted_id}
                        </button>
                      </td>
                      <td className="px-2 py-2 max-w-[420px]">
                        <span className="truncate block" title={t.title}>
                          {t.title}
                        </span>
                      </td>
                      <td className="px-2 py-2 text-right font-mono text-dim">
                        {formatHours(t.current_fe_estimate)}
                      </td>
                      <td className="px-2 py-2 text-right font-mono text-dim">
                        {formatHours(t.current_be_estimate)}
                      </td>
                      <td className="px-2 py-2 text-dimmer whitespace-nowrap">
                        {format(new Date(t.created_at), "d MMM")}
                      </td>
                      <td className="px-2 py-2">
                        <StatusBadge status={t.cr_approval} />
                      </td>
                      <td className="px-2 py-2 text-dimmer whitespace-nowrap">
                        {t.cr_approval === "approved" && t.cr_decided_at ? (
                          <div className="flex flex-col leading-tight">
                            <span>{format(new Date(t.cr_decided_at), "d MMM")}</span>
                            {t.cr_decided_by === null ? (
                              <span
                                className="text-[10px] text-health-good font-mono"
                                title="Approved by client"
                              >
                                Client
                              </span>
                            ) : (
                              <span
                                className="text-[10px] text-dim truncate max-w-[140px]"
                                title={memberNames[t.cr_decided_by] ?? ""}
                              >
                                {memberNames[t.cr_decided_by] ?? "…"}
                              </span>
                            )}
                          </div>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {canReview && t.cr_approval === "pending" ? (
                          <div className="inline-flex items-center gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 px-2 text-health-good hover:text-health-good hover:bg-health-good/10"
                              onClick={() => onApprove(t)}
                            >
                              <Check className="h-3.5 w-3.5 mr-1" /> Approve
                            </Button>
                            {!hideReject && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 px-2 text-health-bad hover:text-health-bad hover:bg-health-bad/10"
                                onClick={() => onReject(t)}
                              >
                                <X className="h-3.5 w-3.5 mr-1" /> Reject
                              </Button>
                            )}
                          </div>
                        ) : (
                          <span className="text-dimmer text-[10px]">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent?: "primary" | "warn" | "gold" | "good";
}) {
  const color =
    accent === "primary"
      ? "text-primary"
      : accent === "warn"
      ? "text-health-warn"
      : accent === "gold"
      ? "text-brand-gold"
      : accent === "good"
      ? "text-health-good"
      : "text-foreground";
  return (
    <div className="rounded-lg bg-white/[0.02] hairline px-2.5 py-1.5">
      <div className="text-[9px] uppercase tracking-wider text-dimmer">{label}</div>
      <div className={cn("font-mono text-sm", color)}>{formatHours(value)}</div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const cls =
    status === "approved"
      ? "bg-health-good/15 text-health-good ring-health-good/30"
      : status === "pending"
      ? "bg-health-warn/15 text-health-warn ring-health-warn/30"
      : status === "rejected"
      ? "bg-health-bad/15 text-health-bad ring-health-bad/30"
      : "bg-white/5 text-dim ring-white/10";
  return (
    <span
      className={cn(
        "inline-flex items-center px-1.5 py-0.5 rounded-full ring-1 text-[10px] capitalize",
        cls
      )}
    >
      {status}
    </span>
  );
}
