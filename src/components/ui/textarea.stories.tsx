import type { Meta, StoryObj } from "@storybook/react";

import { Textarea } from "./textarea";

const meta = {
  title: "UI/Textarea",
  component: Textarea,
  tags: ["autodocs"],
  parameters: { layout: "padded" },
  args: {
    placeholder: "Add a note about logged time…",
  },
} satisfies Meta<typeof Textarea>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const States: Story = {
  render: (args) => (
    <div className="flex w-[360px] flex-col gap-4">
      <Textarea {...args} />
      <Textarea {...args} disabled />
      <Textarea
        {...args}
        defaultValue="Logged 6.5h on OST-142 — Client Portal login flow."
      />
    </div>
  ),
};
