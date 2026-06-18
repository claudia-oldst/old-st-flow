import {
  CartesianGrid, Legend, Line, LineChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { formatHours } from "@/lib/utils";

export function PortalTrendChart({
  data,
  compact,
}: {
  data: Array<{ label: string; original: number; current: number; actual: number }>;
  compact?: boolean;
}) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
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
        <Line type="monotone" dataKey="original" name="Original" stroke="hsl(0 0% 60%)" strokeDasharray="4 4" dot={false} strokeWidth={1.5} />
        <Line type="monotone" dataKey="current" name="Current" stroke="hsl(var(--chart-in-progress))" dot={false} strokeWidth={2} />
        <Line type="monotone" dataKey="actual" name="Actual" stroke="hsl(38 92% 50%)" dot={false} strokeWidth={2} />
      </LineChart>
    </ResponsiveContainer>
  );
}
