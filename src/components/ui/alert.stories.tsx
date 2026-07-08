import type { Meta, StoryObj } from "@storybook/react";
import { AlertTriangle, Terminal } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "./alert";

const meta = {
  title: "UI/Alert",
  component: Alert,
  tags: ["autodocs"],
  parameters: { layout: "centered" },
  argTypes: {
    variant: {
      control: "select",
      options: ["default", "destructive"],
    },
  },
} satisfies Meta<typeof Alert>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { variant: "default" },
  render: (args) => (
    <Alert {...args} className="max-w-md">
      <Terminal className="h-4 w-4" />
      <AlertTitle>Heads up</AlertTitle>
      <AlertDescription>
        Ticket OST-142 was moved to For integration and is awaiting a QA review.
      </AlertDescription>
    </Alert>
  ),
};

export const Variants: Story = {
  render: () => (
    <div className="flex w-full max-w-md flex-col gap-4">
      <Alert variant="default">
        <Terminal className="h-4 w-4" />
        <AlertTitle>Time logged</AlertTitle>
        <AlertDescription>
          Dennis Mariano logged 2h 15m against OST-118 on the Time Logging project.
        </AlertDescription>
      </Alert>
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Overdue ticket</AlertTitle>
        <AlertDescription>
          OST-142 on Client Portal has been In progress past its due date.
        </AlertDescription>
      </Alert>
    </div>
  ),
};
