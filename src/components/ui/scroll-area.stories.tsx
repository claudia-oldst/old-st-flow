import type { Meta, StoryObj } from "@storybook/react";
import { ScrollArea } from "./scroll-area";

const meta = {
  title: "UI/ScrollArea",
  component: ScrollArea,
  tags: ["autodocs"],
  parameters: { layout: "padded" },
} satisfies Meta<typeof ScrollArea>;
export default meta;
type Story = StoryObj<typeof meta>;

const statuses = ["To-do", "In progress", "For integration", "Done"];
const tickets = Array.from({ length: 20 }, (_, index) => ({
  id: `OST-${142 + index}`,
  title: index % 2 === 0 ? "Client Portal task" : "Time Logging task",
  status: statuses[index % statuses.length],
}));

export const Default: Story = {
  render: () => (
    <ScrollArea className="h-72 w-80 rounded-md border">
      <div className="p-4">
        <h4 className="mb-4 text-sm font-medium leading-none">Sprint tickets</h4>
        {tickets.map((ticket) => (
          <div key={ticket.id} className="border-b py-2 text-sm last:border-b-0">
            <div className="font-medium">
              {ticket.id} · {ticket.title}
            </div>
            <div className="text-muted-foreground">{ticket.status}</div>
          </div>
        ))}
      </div>
    </ScrollArea>
  ),
};
