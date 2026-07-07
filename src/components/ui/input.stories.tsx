import type { Meta, StoryObj } from "@storybook/react";
import { Input } from "./input";

const meta = {
  title: "UI/Input",
  component: Input,
  tags: ["autodocs"],
  parameters: { layout: "centered" },
} satisfies Meta<typeof Input>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { placeholder: "Search tickets…" },
  render: (args) => (
    <div className="w-72">
      <Input {...args} />
    </div>
  ),
};

export const States: Story = {
  render: () => (
    <div className="flex w-72 flex-col gap-3">
      <Input placeholder="Ticket title (e.g. OST-142)" />
      <Input defaultValue="Client Portal" />
      <Input disabled placeholder="Disabled" />
      <Input type="password" defaultValue="secret-token" />
      <Input type="file" />
    </div>
  ),
};
