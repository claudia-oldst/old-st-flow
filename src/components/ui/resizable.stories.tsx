import type { Meta, StoryObj } from "@storybook/react";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "./resizable";

const meta = {
  title: "UI/Resizable",
  component: ResizablePanelGroup,
  tags: ["autodocs"],
  parameters: { layout: "fullscreen" },
  args: { direction: "horizontal" },
} satisfies Meta<typeof ResizablePanelGroup>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <div className="h-[400px] p-6">
      <ResizablePanelGroup direction="horizontal" className="rounded-lg border">
        <ResizablePanel defaultSize={35}>
          <div className="flex h-full flex-col gap-2 p-6">
            <h3 className="text-sm font-semibold">Projects</h3>
            <p className="text-sm text-muted-foreground">Client Portal</p>
            <p className="text-sm text-muted-foreground">Time Logging</p>
          </div>
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel defaultSize={65}>
          <div className="flex h-full flex-col gap-2 p-6">
            <h3 className="text-sm font-semibold">OST-142 · In progress</h3>
            <p className="text-sm text-muted-foreground">Assigned to Dennis Mariano (Frontend).</p>
            <p className="text-sm text-muted-foreground">Reviewer: Alex Morgan (QA).</p>
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  ),
};
