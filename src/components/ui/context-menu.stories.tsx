import type { Meta, StoryObj } from "@storybook/react";

import {
  ContextMenu,
  ContextMenuCheckboxItem,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuRadioGroup,
  ContextMenuRadioItem,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from "./context-menu";

const meta = {
  title: "UI/ContextMenu",
  component: ContextMenu,
  tags: ["autodocs"],
  parameters: { layout: "centered" },
} satisfies Meta<typeof ContextMenu>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <ContextMenu>
      <ContextMenuTrigger className="flex h-[160px] w-[320px] items-center justify-center rounded-md border border-dashed text-sm text-muted-foreground">
        Right-click OST-142
      </ContextMenuTrigger>
      <ContextMenuContent className="w-56">
        <ContextMenuLabel>OST-142 · Client Portal</ContextMenuLabel>
        <ContextMenuSeparator />
        <ContextMenuItem>
          Start timer
          <ContextMenuShortcut>⌘T</ContextMenuShortcut>
        </ContextMenuItem>
        <ContextMenuItem>Stop timer</ContextMenuItem>
        <ContextMenuSub>
          <ContextMenuSubTrigger>Assign to…</ContextMenuSubTrigger>
          <ContextMenuSubContent className="w-44">
            <ContextMenuItem>Dennis Mariano</ContextMenuItem>
            <ContextMenuItem>Alex Morgan</ContextMenuItem>
            <ContextMenuItem>Riley Chen</ContextMenuItem>
          </ContextMenuSubContent>
        </ContextMenuSub>
        <ContextMenuSeparator />
        <ContextMenuCheckboxItem checked>Watching</ContextMenuCheckboxItem>
        <ContextMenuSeparator />
        <ContextMenuLabel inset>Status</ContextMenuLabel>
        <ContextMenuRadioGroup value="in-progress">
          <ContextMenuRadioItem value="to-do">To-do</ContextMenuRadioItem>
          <ContextMenuRadioItem value="in-progress">In progress</ContextMenuRadioItem>
          <ContextMenuRadioItem value="for-integration">For integration</ContextMenuRadioItem>
          <ContextMenuRadioItem value="done">Done</ContextMenuRadioItem>
        </ContextMenuRadioGroup>
      </ContextMenuContent>
    </ContextMenu>
  ),
};
