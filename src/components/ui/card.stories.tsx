import type { Meta, StoryObj } from "@storybook/react";

import { Button } from "./button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "./card";

const meta = {
  title: "UI/Card",
  component: Card,
  tags: ["autodocs"],
  parameters: { layout: "padded" },
} satisfies Meta<typeof Card>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Card className="w-[360px]">
      <CardHeader>
        <CardTitle>Client Portal</CardTitle>
        <CardDescription>
          Customer-facing dashboard for The Old St Tracker.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <p className="text-muted-foreground">Open tickets</p>
          <p className="text-2xl font-semibold">12</p>
        </div>
        <div>
          <p className="text-muted-foreground">Logged this week</p>
          <p className="text-2xl font-semibold">38h</p>
        </div>
        <div>
          <p className="text-muted-foreground">Status</p>
          <p className="font-medium">In progress</p>
        </div>
        <div>
          <p className="text-muted-foreground">Lead</p>
          <p className="font-medium">Dennis Mariano</p>
        </div>
      </CardContent>
      <CardFooter className="justify-end">
        <Button>View project</Button>
      </CardFooter>
    </Card>
  ),
};
