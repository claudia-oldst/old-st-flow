import type { Meta, StoryObj } from "@storybook/react";
import { Button } from "./button";
import { Label } from "./label";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";
import { RadioGroup, RadioGroupItem } from "./radio-group";

const meta = {
  title: "UI/Popover",
  component: Popover,
  tags: ["autodocs"],
  parameters: { layout: "centered" },
} satisfies Meta<typeof Popover>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Popover defaultOpen>
      <PopoverTrigger asChild>
        <Button variant="outline">Filter tickets</Button>
      </PopoverTrigger>
      <PopoverContent className="w-72">
        <div className="grid gap-4">
          <div className="space-y-1">
            <h4 className="text-sm font-medium leading-none">Filter by status</h4>
            <p className="text-sm text-muted-foreground">Showing tickets in the Client Portal project.</p>
          </div>
          <RadioGroup defaultValue="in-progress">
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="todo" id="filter-todo" />
              <Label htmlFor="filter-todo">To-do</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="in-progress" id="filter-in-progress" />
              <Label htmlFor="filter-in-progress">In progress</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="for-integration" id="filter-for-integration" />
              <Label htmlFor="filter-for-integration">For integration</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="done" id="filter-done" />
              <Label htmlFor="filter-done">Done</Label>
            </div>
          </RadioGroup>
        </div>
      </PopoverContent>
    </Popover>
  ),
};
