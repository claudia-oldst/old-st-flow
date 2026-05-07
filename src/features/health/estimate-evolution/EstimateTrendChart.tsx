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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatHours } from "@/lib/utils";
import { ALL_EPICS_KEY, NO_EPIC_KEY } from "./dateUtils";

export function EstimateTrendChart({
  trendData,
  selectedEpic,
  setSelectedEpic,
  epics,
}: {
  trendData: Array<{ label: string; original: number; current: number; actual: number }>;
  selectedEpic: string;
  setSelectedEpic: (v: string) => void;
  epics: { id: number; epic_name: string | null }[];
}) {
  return (
    <div className="hairline-t pt-4">
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <div className="text-[11px] uppercase tracking-wider text-dimmer">
          Trend over time
        </div>
        <Select value={selectedEpic} onValueChange={setSelectedEpic}>
          <SelectTrigger className="h-8 text-xs w-[200px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_EPICS_KEY}>All epics aggregated</SelectItem>
            <SelectItem value={NO_EPIC_KEY}>No epic</SelectItem>
            {epics.map((e) => (
              <SelectItem key={e.id} value={`e:${e.id}`}>
                {e.epic_name ?? `Epic ${e.id}`}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="h-64">
        {trendData.length === 0 ? (
          <div className="h-full flex items-center justify-center text-sm text-dim">
            No data for this selection.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trendData} margin={{ top: 8, right: 16, left: -8, bottom: 0 }}>
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
                formatter={(v: any) => `${formatHours(Number(v))}`}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
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
                name="Current estimate"
                stroke="hsl(217 91% 60%)"
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
        )}
      </div>
    </div>
  );
}
