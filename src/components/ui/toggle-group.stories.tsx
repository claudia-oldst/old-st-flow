import type { Meta, StoryObj } from "@storybook/react";

import { ToggleGroup, ToggleGroupItem } from "./toggle-group";

const meta = {
  title: "UI/ToggleGroup",
  component: ToggleGroup,
  tags: ["autodocs"],
  parameters: { layout: "centered" },
} satisfies Meta;
export default meta;
type Story = StoryObj;

export const Default: Story = {
  render: () => (
    <ToggleGroup type="single" variant="outline" defaultValue="in-progress">
      <ToggleGroupItem value="to-do" aria-label="Filter To-do">
        To-do
      </ToggleGroupItem>
      <ToggleGroupItem value="in-progress" aria-label="Filter In progress">
        In progress
      </ToggleGroupItem>
      <ToggleGroupItem value="for-integration" aria-label="Filter For integration">
        For integration
      </ToggleGroupItem>
      <ToggleGroupItem value="done" aria-label="Filter Done">
        Done
      </ToggleGroupItem>
    </ToggleGroup>
  ),
};
