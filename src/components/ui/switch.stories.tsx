import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";

import { Switch } from "./switch";

const meta = {
  title: "UI/Switch",
  component: Switch,
  tags: ["autodocs"],
  parameters: { layout: "centered" },
} satisfies Meta<typeof Switch>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => {
    const [checked, setChecked] = useState(true);
    return (
      <div className="flex items-center gap-2">
        <Switch id="billable" checked={checked} onCheckedChange={setChecked} />
        <label htmlFor="billable" className="text-sm">
          Billable
        </label>
      </div>
    );
  },
};

export const States: Story = {
  render: () => (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Switch id="off" defaultChecked={false} />
        <label htmlFor="off" className="text-sm">
          Billable (off)
        </label>
      </div>
      <div className="flex items-center gap-2">
        <Switch id="on" defaultChecked />
        <label htmlFor="on" className="text-sm">
          Billable (on)
        </label>
      </div>
      <div className="flex items-center gap-2">
        <Switch id="disabled" defaultChecked disabled />
        <label htmlFor="disabled" className="text-sm text-muted-foreground">
          Billable (disabled)
        </label>
      </div>
    </div>
  ),
};
