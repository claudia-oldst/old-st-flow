import type { Meta, StoryObj } from "@storybook/react";
import { toast } from "sonner";

import { Button } from "./button";
import { Toaster } from "./sonner";

const meta = {
  title: "UI/Sonner",
  component: Toaster,
  tags: ["autodocs"],
  parameters: { layout: "centered" },
} satisfies Meta<typeof Toaster>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <div>
      <Toaster />
      <Button
        onClick={() =>
          toast("OST-142 moved to In progress", {
            description: "Client Portal · assigned to Dennis Mariano",
          })
        }
      >
        Notify
      </Button>
    </div>
  ),
};
