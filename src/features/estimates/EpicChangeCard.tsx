import { useMemo, useState } from "react";
import { format } from "date-fns";
import { ChevronDown, Check, X, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
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
import { MemberAvatar } from "@/components/MemberAvatar";
import { cn, formatHours } from "@/lib/utils";
import type { ChangeRow } from "./useAllEstimateChanges";

interface EpicTicket {
  id: string;
  formatted_id: string;
  project_id: string;
  epic_id: number | null;
  original_fe_estimate: number;
  original_be_estimate: number;
  original_project_estimate: number;
  current_fe_estimate: number;
  current_be_estimate: number;
  current_project_estimate: number;
  actual_frontend_hours: number;
  actual_backend_hours: number;
  actual_project_hours: number;
}

interface Props {
  epicKey: string;
  epicName: string;
  projectAcronym: string;
  projectId: string;
  tickets: EpicTicket[];
  /** All changes for tickets in this epic (already matching the active filters). */
  changes: ChangeRow[];
  /** All approved changes (for computing the "real current" baseline regardless of filter). */
  approvedChanges: ChangeRow[];
  onApprove: (row: ChangeRow) => void;
  onReject: (row: ChangeRow) => void;
  defaultOpen?: boolean;
}

export function EpicChangeCard({
  epicName,
  projectAcronym,
  projectId,
  tickets,
  changes,
  approvedChanges,
  onApprove,
  onReject,
  defaultOpen,
}: Props) {
  const [open, setOpen] = useState(!!defaultOpen);

  const totals = useMemo(() => {
    const original = tickets.reduce(
      (a, t) =>
        a + t.original_fe_estimate + t.original_be_estimate + t.original_project_estimate,
      0
    );
    const currentApproved = tickets.reduce(
      (a, t) =>
        a + t.current_fe_estimate + t.current_be_estimate + t.current_project_estimate,
      0
    );
    const actual = tickets.reduce(
      (a, t) => a + t.actual_frontend_hours + t.actual_backend_hours + t.actual_project_hours,
      0
    );
    // Matching deltas (e.g. pending) — what would happen if all matching rows were approved
    const matchedDelta = changes.reduce((a, c) => a + c.delta, 0);
    return { original, currentApproved, actual, projected: currentApproved + matchedDelta };
  }, [tickets, changes]);

  // Sparkline-style data: a couple of buckets along the timeline of matching changes.
  const chartData = useMemo(() => {
    const events = [...approvedChanges, ...changes]
      .map((c) => new Date(c.created_at).getTime())
      .filter((n) => !Number.isNaN(n))
      .sort((a, b) => a - b);
    const start = events[0] ?? Date.now() - 86_400_000 * 7;
    const end = Date.now();
    const buckets = 24;
    const step = Math.max(1, Math.floor((end - start) / buckets));

    const out: Array<{ label: string; original: number; current: number; projected: number }> = [];
    for (let t = start; t <= end; t += step) {
      let originalAt = 0;
      tickets.forEach((tk) => {
        originalAt +=
          tk.original_fe_estimate + tk.original_be_estimate + tk.original_project_estimate;
      });
      let approvedDelta = 0;
      approvedChanges.forEach((c) => {
        if (new Date(c.created_at).getTime() <= t) approvedDelta += c.delta;
      });
      let matchedDelta = 0;
      changes.forEach((c) => {
        if (new Date(c.created_at).getTime() <= t) matchedDelta += c.delta;
      });
      out.push({
        label: format(new Date(t), "d MMM"),
        original: originalAt,
        current: originalAt + approvedDelta,
        projected: originalAt + approvedDelta + matchedDelta,
      });
    }
    return out;
  }, [tickets, approvedChanges, changes]);

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
                  {tickets.length} ticket{tickets.length === 1 ? "" : "s"} · {changes.length} change
                  {changes.length === 1 ? "" : "s"} matching
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
              <Stat label="Current (approved)" value={totals.currentApproved} accent="primary" />
              <Stat label="If all approved" value={totals.projected} accent="warn" />
              <Stat label="Actual" value={totals.actual} accent="gold" />
            </div>

            {chartData.length > 1 && (
              <div className="h-24 -mx-1">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
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
                      tickFormatter={(v) => `${v}h`}
                      width={36}
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
                      stroke="hsl(var(--primary))"
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
                    <th className="text-left font-medium px-3 py-2">Ticket</th>
                    <th className="text-left font-medium px-2 py-2">Disc.</th>
                    <th className="text-right font-medium px-2 py-2">Prev</th>
                    <th className="text-right font-medium px-2 py-2">New</th>
                    <th className="text-right font-medium px-2 py-2">Δ</th>
                    <th className="text-left font-medium px-2 py-2">Reason</th>
                    <th className="text-left font-medium px-2 py-2">Requester</th>
                    <th className="text-left font-medium px-2 py-2">When</th>
                    <th className="text-left font-medium px-2 py-2">Status</th>
                    <th className="text-right font-medium px-3 py-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {changes.map((c) => {
                    const isAuto = (c.reason ?? "").startsWith("Auto-trimmed");
                    return (
                      <tr key={c.id} className="border-t border-white/5 hover:bg-white/[0.02]">
                        <td className="px-3 py-2 font-mono text-[11px]">
                          <Link
                            to={`/projects/${projectId}`}
                            className="text-foreground hover:text-primary transition"
                          >
                            {c.ticket?.formatted_id ?? "?"}
                          </Link>
                        </td>
                        <td className="px-2 py-2 text-dim">{c.discipline}</td>
                        <td className="px-2 py-2 text-right font-mono text-dim">
                          {formatHours(c.previous_hours)}
                        </td>
                        <td className="px-2 py-2 text-right font-mono">
                          {formatHours(c.new_hours)}
                        </td>
                        <td
                          className={cn(
                            "px-2 py-2 text-right font-mono",
                            c.delta > 0
                              ? "text-health-warn"
                              : c.delta < 0
                              ? "text-health-good"
                              : "text-dim"
                          )}
                        >
                          {c.delta > 0 ? "+" : ""}
                          {formatHours(c.delta)}
                        </td>
                        <td className="px-2 py-2 max-w-[260px]">
                          <div className="flex items-center gap-1.5">
                            {isAuto && (
                              <span
                                title="Auto-generated"
                                className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded bg-white/5 text-[9px] uppercase tracking-wider text-dimmer"
                              >
                                <Sparkles className="h-2.5 w-2.5" /> auto
                              </span>
                            )}
                            <span className="text-dim truncate" title={c.reason ?? ""}>
                              {c.reason ?? "—"}
                            </span>
                          </div>
                        </td>
                        <td className="px-2 py-2">
                          {c.requester ? (
                            <div className="flex items-center gap-1.5">
                              <MemberAvatar
                                name={c.requester.name}
                                color={c.requester.avatar_color}
                                size="xs"
                              />
                              <span className="text-dim truncate">{c.requester.name}</span>
                            </div>
                          ) : (
                            <span className="text-dimmer">—</span>
                          )}
                        </td>
                        <td className="px-2 py-2 text-dimmer whitespace-nowrap">
                          {format(new Date(c.created_at), "d MMM")}
                        </td>
                        <td className="px-2 py-2">
                          <StatusBadge status={c.status} />
                        </td>
                        <td className="px-3 py-2 text-right">
                          {c.status === "pending" ? (
                            <div className="inline-flex items-center gap-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 px-2 text-health-good hover:text-health-good hover:bg-health-good/10"
                                onClick={() => onApprove(c)}
                              >
                                <Check className="h-3.5 w-3.5 mr-1" /> Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 px-2 text-health-bad hover:text-health-bad hover:bg-health-bad/10"
                                onClick={() => onReject(c)}
                              >
                                <X className="h-3.5 w-3.5 mr-1" /> Reject
                              </Button>
                            </div>
                          ) : (
                            <span className="text-dimmer text-[10px]">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
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
  accent?: "primary" | "warn" | "gold";
}) {
  const color =
    accent === "primary"
      ? "text-primary"
      : accent === "warn"
      ? "text-health-warn"
      : accent === "gold"
      ? "text-brand-gold"
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
