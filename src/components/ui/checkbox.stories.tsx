import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";

import { Checkbox } from "./checkbox";
import { Label } from "./label";

const meta = {
  title: "UI/Checkbox",
  component: Checkbox,
  tags: ["autodocs"],
  parameters: { layout: "centered" },
} satisfies Meta<typeof Checkbox>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => {
    const [checked, setChecked] = useState(true);
    return (
      <div className="flex items-center gap-2">
        <Checkbox
          id="ost-142"
          checked={checked}
          onCheckedChange={(value) => setChecked(value === true)}
        />
        <Label htmlFor="ost-142">Mark OST-142 as Done</Label>
      </div>
    );
  },
};

export const States: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <Checkbox id="todo" />
        <Label htmlFor="todo">To-do</Label>
      </div>
      <div className="flex items-center gap-2">
        <Checkbox id="in-progress" defaultChecked />
        <Label htmlFor="in-progress">In progress</Label>
      </div>
      <div className="flex items-center gap-2">
        <Checkbox id="locked" disabled defaultChecked />
        <Label htmlFor="locked" className="opacity-50">
          For integration (locked)
        </Label>
      </div>
    </div>
  ),
};
