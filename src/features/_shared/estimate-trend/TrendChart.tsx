import type { ReactNode } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatHours } from "@/lib/utils";
import type { TrendBucket } from "./types";

interface Props {
  data: TrendBucket[];
  /** Hides the legend (used by per-epic mini-charts). */
  compact?: boolean;
  /** Optional empty-state copy override. */
  emptyLabel?: string;
}

/**
 * Single shared estimate-trend chart. Used by both the Project Health page
 * and the Client Portal. Caller chooses to render it inside a card with a
 * header / epic selector / etc.; this component only owns the chart itself.
 */
export function TrendChart({ data, compact, emptyLabel = "No trend data yet." }: Props) {
  if (data.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-sm text-dim">
        {emptyLabel}
      </div>
    );
  }
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ top: 8, right: 16, left: -8, bottom: 0 }}>
        <CartesianGrid stroke="hsl(0 0% 100% / 0.05)" vertical={false} />
        <XAxis
          dataKey="label"
          stroke="hsl(0 0% 100% / 0.4)"
          tick={{ fontSize: 10 }}
          tickLine={false}
          axisLine={false}
          minTickGap={24}
        />
        <YAxis
          stroke="hsl(0 0% 100% / 0.4)"
          tick={{ fontSize: 10 }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v) => `${v}h`}
        />
        <Tooltip
          contentStyle={{
            background: "hsl(0 0% 8%)",
            border: "1px solid hsl(0 0% 100% / 0.1)",
            borderRadius: 8,
            fontSize: 12,
          }}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          formatter={(v: any) => `${formatHours(Number(v))}`}
        />
        {!compact && <Legend wrapperStyle={{ fontSize: 11 }} />}
        <Line
          type="monotone"
          dataKey="original"
          name="Original"
          stroke="hsl(0 0% 60%)"
          strokeDasharray="4 4"
          dot={false}
          strokeWidth={1.5}
        />
        <Line
          type="monotone"
          dataKey="current"
          name="Current"
          stroke="hsl(var(--chart-in-progress))"
          dot={false}
          strokeWidth={2}
        />
        <Line
          type="monotone"
          dataKey="actual"
          name="Actual"
          stroke="hsl(38 92% 50%)"
          dot={false}
          strokeWidth={2}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

/**
 * Optional helper consumers can use to assemble a card-style trend section
 * with a title row and right-aligned controls slot.
 */
export function TrendSection({
  title,
  headerRight,
  children,
}: {
  title: ReactNode;
  headerRight?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-1 flex-wrap gap-2">
        <div className="text-[11px] uppercase tracking-wider text-dimmer">{title}</div>
        {headerRight}
      </div>
      {children}
    </div>
  );
}
