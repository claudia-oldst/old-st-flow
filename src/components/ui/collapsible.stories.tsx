import type { Meta, StoryObj } from "@storybook/react";
import { ChevronsUpDown } from "lucide-react";

import { Button } from "./button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "./collapsible";

const meta = {
  title: "UI/Collapsible",
  component: Collapsible,
  tags: ["autodocs"],
  parameters: { layout: "centered" },
} satisfies Meta<typeof Collapsible>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Collapsible defaultOpen className="w-[320px] space-y-2">
      <div className="flex items-center justify-between rounded-md border px-4 py-2">
        <span className="text-sm font-medium">OST-142 · Activity</span>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" size="sm" className="w-9 p-0">
            <ChevronsUpDown className="h-4 w-4" />
            <span className="sr-only">Toggle</span>
          </Button>
        </CollapsibleTrigger>
      </div>
      <CollapsibleContent className="space-y-2">
        <div className="rounded-md border px-4 py-2 text-sm">
          Dennis Mariano moved this to In progress
        </div>
        <div className="rounded-md border px-4 py-2 text-sm">
          Alex Morgan logged 2h on Client Portal
        </div>
        <div className="rounded-md border px-4 py-2 text-sm">
          Riley Chen assigned QA review
        </div>
      </CollapsibleContent>
    </Collapsible>
  ),
};
