import type { Meta, StoryObj } from "@storybook/react";

import { Avatar, AvatarFallback, AvatarImage } from "./avatar";

const meta = {
  title: "UI/Avatar",
  component: Avatar,
  tags: ["autodocs"],
  parameters: { layout: "centered" },
} satisfies Meta<typeof Avatar>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Avatar>
      <AvatarImage src="https://i.pravatar.cc/80?u=dennis-mariano" alt="Dennis Mariano" />
      <AvatarFallback>DM</AvatarFallback>
    </Avatar>
  ),
};

export const States: Story = {
  render: () => (
    <div className="flex items-center gap-4">
      {/* Fallback initials (image fails to load) */}
      <Avatar>
        <AvatarImage src="" alt="Alex Morgan" />
        <AvatarFallback>AM</AvatarFallback>
      </Avatar>
      <Avatar>
        <AvatarFallback>RC</AvatarFallback>
      </Avatar>
      {/* Sizes via className */}
      <Avatar className="h-8 w-8">
        <AvatarFallback className="text-xs">SP</AvatarFallback>
      </Avatar>
      <Avatar className="h-14 w-14">
        <AvatarImage src="https://i.pravatar.cc/120?u=riley-chen" alt="Riley Chen" />
        <AvatarFallback>RC</AvatarFallback>
      </Avatar>
    </div>
  ),
};
