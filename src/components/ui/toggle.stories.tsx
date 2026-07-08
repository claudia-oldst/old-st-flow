import type { Meta, StoryObj } from "@storybook/react";
import { CircleDollarSign } from "lucide-react";

import { Toggle } from "./toggle";

const meta = {
  title: "UI/Toggle",
  component: Toggle,
  tags: ["autodocs"],
  parameters: { layout: "centered" },
} satisfies Meta<typeof Toggle>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Toggle aria-label="Mark time as billable">
      <CircleDollarSign className="h-4 w-4" />
    </Toggle>
  ),
};

export const Variants: Story = {
  render: () => (
    <div className="flex items-center gap-3">
      <Toggle variant="default" size="sm" aria-label="Billable small">
        <CircleDollarSign className="h-4 w-4" />
      </Toggle>
      <Toggle variant="outline" size="default" aria-label="Billable default">
        <CircleDollarSign className="h-4 w-4" />
        Billable
      </Toggle>
      <Toggle variant="outline" size="lg" aria-label="Billable large">
        <CircleDollarSign className="h-4 w-4" />
        Billable
      </Toggle>
    </div>
  ),
};

export const States: Story = {
  render: () => (
    <div className="flex items-center gap-3">
      <Toggle pressed variant="outline" aria-label="Billable on">
        <CircleDollarSign className="h-4 w-4" />
        Billable
      </Toggle>
      <Toggle disabled variant="outline" aria-label="Billable disabled">
        <CircleDollarSign className="h-4 w-4" />
        Billable
      </Toggle>
    </div>
  ),
};
