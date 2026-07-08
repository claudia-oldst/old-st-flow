import type { Meta, StoryObj } from "@storybook/react";

import {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
} from "./table";

const meta = {
  title: "UI/Table",
  component: Table,
  tags: ["autodocs"],
  parameters: { layout: "padded" },
} satisfies Meta<typeof Table>;
export default meta;
type Story = StoryObj<typeof meta>;

const tickets = [
  { id: "OST-142", title: "Client Portal login flow", assignee: "Dennis Mariano", status: "In progress", hours: "6.5" },
  { id: "OST-118", title: "Time Logging API integration", assignee: "Alex Morgan", status: "For integration", hours: "4.0" },
  { id: "OST-126", title: "Dashboard hours summary", assignee: "Riley Chen", status: "To-do", hours: "0.0" },
  { id: "OST-097", title: "Invoice export to PDF", assignee: "Dennis Mariano", status: "Done", hours: "8.0" },
];

export const Default: Story = {
  render: () => (
    <Table>
      <TableCaption>Open tickets for the current sprint.</TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead>Ticket</TableHead>
          <TableHead>Title</TableHead>
          <TableHead>Assignee</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Hours</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {tickets.map((t) => (
          <TableRow key={t.id}>
            <TableCell className="font-medium">{t.id}</TableCell>
            <TableCell>{t.title}</TableCell>
            <TableCell>{t.assignee}</TableCell>
            <TableCell>{t.status}</TableCell>
            <TableCell className="text-right">{t.hours}</TableCell>
          </TableRow>
        ))}
      </TableBody>
      <TableFooter>
        <TableRow>
          <TableCell colSpan={4}>Total logged</TableCell>
          <TableCell className="text-right">18.5</TableCell>
        </TableRow>
      </TableFooter>
    </Table>
  ),
};
