import type { Meta, StoryObj } from "@storybook/react";
import { Progress } from "./progress";

const meta = {
  title: "UI/Progress",
  component: Progress,
  tags: ["autodocs"],
  parameters: { layout: "padded" },
} satisfies Meta<typeof Progress>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <div className="w-80 space-y-2">
      <p className="text-sm font-medium">Logged hours toward weekly target</p>
      <Progress value={60} />
    </div>
  ),
};

export const States: Story = {
  render: () => (
    <div className="w-80 space-y-6">
      {[0, 25, 60, 100].map((value) => (
        <div key={value} className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="font-medium">Logged hours toward weekly target</span>
            <span className="text-muted-foreground">{value}%</span>
          </div>
          <Progress value={value} />
        </div>
      ))}
    </div>
  ),
};
