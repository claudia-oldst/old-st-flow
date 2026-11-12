import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { EpicReviewCard } from "./EpicReviewCard";

const rows = (start: number, end: number) =>
  Array.from({ length: 10 }, (_, i) => i).slice(start, end).map((i) => (
    <tr key={i}><td>row-{i}</td></tr>
  ));

describe("EpicReviewCard", () => {
  it("shows 6 rows per page and pages to the rest", () => {
    render(
      <EpicReviewCard projectAcronym="COU" epicName="Epic A" subtitle="x"
        totals={{ original: 1, current: 2, projected: 3, actual: 4 }}
        chartData={[]} defaultOpen columns={<th>Ticket</th>} itemCount={10} renderRows={rows} />,
    );
    expect(screen.getByText("row-5")).toBeTruthy();
    expect(screen.queryByText("row-6")).toBeNull();
    expect(screen.getByText("Showing 1–6 of 10")).toBeTruthy();
    fireEvent.click(screen.getByText("2"));
    expect(screen.getByText("row-9")).toBeTruthy();
  });
  it("shows the empty row when there are no items", () => {
    render(
      <EpicReviewCard projectAcronym="COU" epicName="Epic A" subtitle="x"
        totals={{ original: 0, current: 0, projected: 0, actual: 0 }}
        chartData={[]} defaultOpen columns={<th>Ticket</th>} itemCount={0}
        emptyRow={<tr><td>No CRs</td></tr>} renderRows={() => null} />,
    );
    expect(screen.getByText("No CRs")).toBeTruthy();
  });
});
