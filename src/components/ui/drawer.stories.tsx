import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "./drawer";
import { Button } from "./button";

const meta = {
  title: "UI/Drawer",
  component: Drawer,
  tags: ["autodocs"],
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof Drawer>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => {
    const [open, setOpen] = useState(true);
    return (
      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerContent>
          <div className="mx-auto w-full max-w-md">
            <DrawerHeader>
              <DrawerTitle>Timer summary — OST-142</DrawerTitle>
              <DrawerDescription>
                Tracked time on Client Portal for today.
              </DrawerDescription>
            </DrawerHeader>
            <div className="space-y-3 px-4 pb-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Status</span>
                <span className="font-medium">In progress</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Assignee</span>
                <span className="font-medium">Dennis Mariano</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Role</span>
                <span className="font-medium">Frontend</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Elapsed today</span>
                <span className="font-medium">02:45:10</span>
              </div>
            </div>
            <DrawerFooter>
              <Button onClick={() => setOpen(false)}>Stop timer</Button>
              <Button variant="outline" onClick={() => setOpen(false)}>
                Keep running
              </Button>
            </DrawerFooter>
          </div>
        </DrawerContent>
      </Drawer>
    );
  },
};
