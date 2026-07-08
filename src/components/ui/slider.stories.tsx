import type { Meta, StoryObj } from "@storybook/react";

import { Slider } from "./slider";

const meta = {
  title: "UI/Slider",
  component: Slider,
  tags: ["autodocs"],
  parameters: { layout: "centered" },
} satisfies Meta<typeof Slider>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <div className="w-72 space-y-3">
      <p className="text-sm font-medium">Estimated hours</p>
      <Slider defaultValue={[8]} min={0} max={40} step={1} />
    </div>
  ),
};
