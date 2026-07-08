import type { Meta, StoryObj } from "@storybook/react";
import { MemberAvatar, MemberAvatarStack } from "./MemberAvatar";

const meta = {
  title: "Composites/MemberAvatar",
  component: MemberAvatar,
  tags: ["autodocs"],
  parameters: { layout: "centered" },
  args: {
    name: "Dennis Mariano",
    color: "#6366f1",
    size: "md",
  },
  argTypes: {
    size: { control: "inline-radio", options: ["xs", "sm", "md", "lg"] },
  },
} satisfies Meta<typeof MemberAvatar>;

export default meta;
type Story = StoryObj<typeof meta>;

// Single avatar with controllable size/color via args.
export const Default: Story = {};

// All four sizes side-by-side, each with a distinct member + brand color.
export const Variants: Story = {
  render: () => (
    <div className="flex items-end gap-4">
      <MemberAvatar name="Alex Morgan" color="#f76c5e" size="xs" />
      <MemberAvatar name="Riley Chen" color="#22c55e" size="sm" />
      <MemberAvatar name="Dennis Mariano" color="#6366f1" size="md" />
      <MemberAvatar name="Sam Patel" color="#a855f7" size="lg" />
    </div>
  ),
};

// Overlapping stack with a +N overflow chip (max=3 of 5 members).
export const Stack: Story = {
  render: () => (
    <MemberAvatarStack
      size="md"
      max={3}
      members={[
        { id: "tm-1", name: "Dennis Mariano", avatar_color: "#6366f1" },
        { id: "tm-2", name: "Alex Morgan", avatar_color: "#f76c5e" },
        { id: "tm-3", name: "Riley Chen", avatar_color: "#22c55e" },
        { id: "tm-4", name: "Sam Patel", avatar_color: "#a855f7" },
        { id: "tm-5", name: "Jordan Diaz", avatar_color: "#eab308" },
      ]}
    />
  ),
};
