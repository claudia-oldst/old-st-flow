import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";

import { Button } from "./button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "./sheet";

const meta = {
  title: "UI/Sheet",
  component: Sheet,
  tags: ["autodocs"],
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof Sheet>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => {
    const [open, setOpen] = useState(true);
    return (
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button variant="outline">Open ticket details</Button>
        </SheetTrigger>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Ticket details — OST-142</SheetTitle>
            <SheetDescription>
              Estimate trend chart for the Client Portal project.
            </SheetDescription>
          </SheetHeader>
          <div className="grid gap-3 py-6 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Status</span>
              <span>In progress</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Role</span>
              <span>Frontend</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Assignee</span>
              <span>Dennis Mariano</span>
            </div>
          </div>
          <SheetFooter>
            <SheetClose asChild>
              <Button type="button">Save changes</Button>
            </SheetClose>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    );
  },
};
