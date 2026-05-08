import {
  CartesianGrid, Legend, Line, LineChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { formatHours } from "@/lib/utils";

interface Datum {
  label: string;
  original: number;
  current: number;
  projected: number;
}

export function EpicMiniTrendChart({ data }: { data: Datum[] }) {
  return (
    <div className="h-24 -mx-1">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 4, right: 8, left: 4, bottom: 0 }}>
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
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            formatter={(v: any) => formatHours(Number(v))}
          />
          <Legend wrapperStyle={{ fontSize: 10 }} />
          <Line type="monotone" dataKey="original" name="Original" stroke="hsl(0 0% 60%)" strokeDasharray="4 4" dot={false} strokeWidth={1.2} />
          <Line type="monotone" dataKey="current" name="Current" stroke="hsl(var(--health-good))" dot={false} strokeWidth={1.8} />
          <Line type="monotone" dataKey="projected" name="If approved" stroke="hsl(38 92% 50%)" strokeDasharray="2 3" dot={false} strokeWidth={1.5} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
