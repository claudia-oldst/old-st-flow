import type { Meta, StoryObj } from "@storybook/react";
import { Loader2, Plus, Trash2 } from "lucide-react";

import { Button } from "./button";

const meta = {
  title: "UI/Button",
  component: Button,
  tags: ["autodocs"],
  parameters: { layout: "centered" },
  argTypes: {
    variant: {
      control: "select",
      options: ["default", "destructive", "outline", "secondary", "ghost", "link"],
    },
    size: {
      control: "select",
      options: ["default", "sm", "lg", "icon"],
    },
    disabled: { control: "boolean" },
  },
  args: { children: "Log time" },
} satisfies Meta<typeof Button>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { variant: "default", size: "default" },
};

export const Variants: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-2">
      <Button variant="default">Create ticket</Button>
      <Button variant="destructive">Delete OST-142</Button>
      <Button variant="outline">Assign role</Button>
      <Button variant="secondary">For integration</Button>
      <Button variant="ghost">Cancel</Button>
      <Button variant="link">View project</Button>
    </div>
  ),
};

export const States: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <Button size="sm">Small</Button>
        <Button size="default">Default</Button>
        <Button size="lg">Large</Button>
        <Button size="icon" aria-label="Add ticket">
          <Plus />
        </Button>
      </div>
      <div className="flex items-center gap-2">
        <Button>
          <Plus />
          New ticket
        </Button>
        <Button variant="destructive">
          <Trash2 />
          Delete
        </Button>
        <Button disabled>
          <Loader2 className="animate-spin" />
          Saving…
        </Button>
        <Button variant="outline" disabled>
          Disabled
        </Button>
      </div>
    </div>
  ),
};
