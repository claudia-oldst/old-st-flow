import type { Meta, StoryObj } from "@storybook/react";

import { AspectRatio } from "./aspect-ratio";

const meta = {
  title: "UI/AspectRatio",
  component: AspectRatio,
  tags: ["autodocs"],
  parameters: { layout: "centered" },
} satisfies Meta<typeof AspectRatio>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <div className="w-[480px]">
      <AspectRatio ratio={16 / 9}>
        <div className="flex h-full w-full items-center justify-center rounded-md border bg-muted text-sm text-muted-foreground">
          Client Portal — cover image (16 / 9)
        </div>
      </AspectRatio>
    </div>
  ),
};
