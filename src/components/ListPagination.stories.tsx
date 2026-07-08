import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import { ListPagination } from "./ListPagination";

const meta = {
  title: "Composites/ListPagination",
  component: ListPagination,
  tags: ["autodocs"],
  parameters: { layout: "padded" },
  args: { page: 1, total: 0, pageSize: 20, onChange: () => {} },
} satisfies Meta<typeof ListPagination>;

export default meta;
type Story = StoryObj<typeof meta>;

// Interactive: clicking a page / prev / next updates the active page.
export const Default: Story = {
  render: () => {
    const [page, setPage] = useState(3);
    return (
      <div className="space-y-2">
        <p className="text-xs text-dim">Showing tickets — page {page} of 12</p>
        <ListPagination page={page} total={240} pageSize={20} onChange={setPage} />
      </div>
    );
  },
};

// Many pages → the windowing collapses the middle with ellipses (1 … 4 5 6 … 12).
export const ManyPages: Story = {
  render: () => {
    const [page, setPage] = useState(6);
    return <ListPagination page={page} total={480} pageSize={20} onChange={setPage} />;
  },
};

// Few pages → no ellipses; every page shown (1–3).
export const FewPages: Story = {
  render: () => {
    const [page, setPage] = useState(2);
    return <ListPagination page={page} total={50} pageSize={20} onChange={setPage} />;
  },
};
