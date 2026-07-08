import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "./select";

const meta = {
  title: "UI/Select",
  component: Select,
  tags: ["autodocs"],
  parameters: { layout: "centered" },
} satisfies Meta<typeof Select>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Select defaultValue="in-progress">
      <SelectTrigger className="w-56">
        <SelectValue placeholder="Select a status" />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          <SelectLabel>Status</SelectLabel>
          <SelectItem value="todo">To-do</SelectItem>
          <SelectItem value="in-progress">In progress</SelectItem>
          <SelectItem value="for-integration">For integration</SelectItem>
          <SelectItem value="done">Done</SelectItem>
        </SelectGroup>
      </SelectContent>
    </Select>
  ),
};

export const Assignee: Story = {
  render: () => {
    const [assignee, setAssignee] = useState("dennis");
    return (
      <Select value={assignee} onValueChange={setAssignee}>
        <SelectTrigger className="w-56">
          <SelectValue placeholder="Assign teammate" />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectLabel>Frontend</SelectLabel>
            <SelectItem value="dennis">Dennis Mariano</SelectItem>
            <SelectItem value="alex">Alex Morgan</SelectItem>
          </SelectGroup>
          <SelectGroup>
            <SelectLabel>QA</SelectLabel>
            <SelectItem value="jordan">Jordan Lee</SelectItem>
          </SelectGroup>
        </SelectContent>
      </Select>
    );
  },
};
