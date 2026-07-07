import type { Meta, StoryObj } from "@storybook/react";

import { Toaster } from "./toaster";

const meta = {
  title: "UI/Toaster",
  component: Toaster,
  tags: ["autodocs"],
  parameters: { layout: "padded" },
} satisfies Meta<typeof Toaster>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => <Toaster />,
};
