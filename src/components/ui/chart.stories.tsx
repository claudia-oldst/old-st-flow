import type { Meta, StoryObj } from "@storybook/react";
import { Bar, BarChart, CartesianGrid, XAxis } from "recharts";

import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "./chart";

const meta = {
  title: "UI/Chart",
  component: ChartContainer,
  tags: ["autodocs"],
  parameters: { layout: "padded" },
} satisfies Meta;
export default meta;
type Story = StoryObj;

const chartData = [
  { week: "Week 1", clientPortal: 32, timeLogging: 18 },
  { week: "Week 2", clientPortal: 41, timeLogging: 22 },
  { week: "Week 3", clientPortal: 28, timeLogging: 30 },
  { week: "Week 4", clientPortal: 38, timeLogging: 25 },
];

const chartConfig = {
  clientPortal: {
    label: "Client Portal",
    color: "hsl(var(--primary))",
  },
  timeLogging: {
    label: "Time Logging",
    color: "hsl(var(--chart-in-progress))",
  },
} satisfies ChartConfig;

export const Default: Story = {
  render: () => (
    <ChartContainer config={chartConfig} className="h-[280px] w-[520px]">
      <BarChart accessibilityLayer data={chartData}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="week" tickLine={false} tickMargin={10} axisLine={false} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Bar dataKey="clientPortal" fill="var(--color-clientPortal)" radius={4} />
        <Bar dataKey="timeLogging" fill="var(--color-timeLogging)" radius={4} />
      </BarChart>
    </ChartContainer>
  ),
};
