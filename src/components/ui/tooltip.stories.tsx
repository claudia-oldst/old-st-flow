import type { Meta, StoryObj } from "@storybook/react";
import { Play } from "lucide-react";

import { Tooltip, TooltipTrigger, TooltipContent } from "./tooltip";
import { Button } from "./button";

const meta = {
  title: "UI/Tooltip",
  component: Tooltip,
  tags: ["autodocs"],
  parameters: { layout: "centered" },
} satisfies Meta<typeof Tooltip>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="outline" size="icon" aria-label="Start timer">
          <Play className="h-4 w-4" />
        </Button>
      </TooltipTrigger>
      <TooltipContent>Start timer</TooltipContent>
    </Tooltip>
  ),
};
