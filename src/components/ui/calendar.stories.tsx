import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import { type DateRange } from "react-day-picker";

import { Calendar } from "./calendar";

const meta = {
  title: "UI/Calendar",
  component: Calendar,
  tags: ["autodocs"],
  parameters: { layout: "padded" },
} satisfies Meta<typeof Calendar>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => {
    const [date, setDate] = useState<Date | undefined>(new Date());
    return (
      <Calendar
        mode="single"
        selected={date}
        onSelect={setDate}
        className="rounded-md border"
      />
    );
  },
};

export const Variants: Story = {
  render: () => {
    const [range, setRange] = useState<DateRange | undefined>({
      from: new Date(2026, 5, 22),
      to: new Date(2026, 5, 28),
    });
    return (
      <Calendar
        mode="range"
        selected={range}
        onSelect={setRange}
        numberOfMonths={2}
        className="rounded-md border"
      />
    );
  },
};
