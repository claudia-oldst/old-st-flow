import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { BillingTable } from "./BillingTable";
import { buildRows, totalRow, type BillingPayload } from "./buildBilling";

const base: BillingPayload = {
  project: { id: "p", name: "Amber", rate_per_hour: 48, start_date: "2026-04-10", cutoff: "2026-09-30T22:59:59Z" },
  epics: [{ id: 1, epic_name: "Auth", original_std: 10, original_cr: 0, original_bug: 0, revised: 15 }],
  logs: [{ epic_id: 1, month: "2026-09", hours: 5 }],
};

const renderTable = (p: BillingPayload) => {
  const rows = buildRows(p);
  return render(<BillingTable rows={rows} total={totalRow(rows)} months={["2026-09"]} rate={48} />);
};

/** Row labels carry a unit suffix; the column header doesn't, so this only matches total rows. */
const rowLabel = (name: string) => new RegExp(`${name} \\((hours|GBP)\\)`);

describe("billing table discount row", () => {
  it("has no Discount/Unbilled column or row when the project has no discounts", () => {
    renderTable(base);
    expect(screen.queryAllByText(/Discount\/Unbilled/)).toHaveLength(0);
    expect(screen.getAllByText(rowLabel("Grand Total")).length).toBeGreaterThan(0);
  });

  it("adds the Discount/Unbilled column and rows once a discount exists", () => {
    renderTable({ ...base, discounts: [{ epic_id: 1, month: "2026-09", hours: 1.5 }] });
    expect(screen.getAllByText(/Discount\/Unbilled/).length).toBeGreaterThan(0);
  });
});
