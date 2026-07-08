import type { Meta, StoryObj } from "@storybook/react";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "./hover-card";
import { Avatar, AvatarFallback, AvatarImage } from "./avatar";
import { Button } from "./button";

const meta = {
  title: "UI/HoverCard",
  component: HoverCard,
  tags: ["autodocs"],
  parameters: { layout: "centered" },
} satisfies Meta<typeof HoverCard>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <HoverCard openDelay={0}>
      <HoverCardTrigger asChild>
        <Button variant="link">@dennis</Button>
      </HoverCardTrigger>
      <HoverCardContent>
        <div className="flex gap-3">
          <Avatar>
            <AvatarImage src="" alt="Dennis Mariano" />
            <AvatarFallback>DM</AvatarFallback>
          </Avatar>
          <div className="space-y-1">
            <h4 className="text-sm font-semibold">Dennis Mariano</h4>
            <p className="text-sm text-muted-foreground">Frontend</p>
            <p className="text-xs text-muted-foreground">
              Currently on OST-142 — Client Portal
            </p>
          </div>
        </div>
      </HoverCardContent>
    </HoverCard>
  ),
};
