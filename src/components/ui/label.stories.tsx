import type { Meta, StoryObj } from "@storybook/react";
import { Label } from "./label";
import { Input } from "./input";

const meta = {
  title: "UI/Label",
  component: Label,
  tags: ["autodocs"],
  parameters: { layout: "centered" },
} satisfies Meta<typeof Label>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <div className="grid w-72 gap-2">
      <Label htmlFor="project">Project</Label>
      <Input id="project" defaultValue="Client Portal" />
    </div>
  ),
};
