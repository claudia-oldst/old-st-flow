import type { Meta, StoryObj } from "@storybook/react";

import { Separator } from "./separator";

const meta = {
  title: "UI/Separator",
  component: Separator,
  tags: ["autodocs"],
  parameters: { layout: "centered" },
} satisfies Meta<typeof Separator>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <div className="w-72">
      <div className="space-y-1">
        <h4 className="text-sm font-medium leading-none">OST-142</h4>
        <p className="text-sm text-muted-foreground">Client Portal — Estimate trend chart</p>
      </div>
      <Separator className="my-4" />
      <p className="text-sm text-muted-foreground">In progress · Frontend · Dennis Mariano</p>
    </div>
  ),
};

export const Variants: Story = {
  render: () => (
    <div className="space-y-6">
      <div className="w-72 space-y-2">
        <p className="text-sm">Horizontal</p>
        <Separator orientation="horizontal" />
      </div>
      <div className="flex h-6 items-center space-x-3 text-sm">
        <span>To-do</span>
        <Separator orientation="vertical" />
        <span>In progress</span>
        <Separator orientation="vertical" />
        <span>Done</span>
      </div>
    </div>
  ),
};
