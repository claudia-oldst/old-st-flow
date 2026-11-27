import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "@/test/utils";
import { EMPTY_FILTERS, type TicketFilters } from "./applyFilters";
import { FilterSections } from "./FilterSections";

vi.mock("@/features/statuses/useStatuses", () => ({
  useStatuses: () => ({ statuses: [{ id: "s1", name: "To Do", color: "#ffffff" }] }),
}));

vi.mock("@/features/epics/useProjectEpics", () => ({
  useProjectEpics: () => ({ epics: [{ id: 7, epic_name: "Onboarding" }] }),
}));

function renderFilterSections(overrides: Partial<TicketFilters> = {}) {
  const toggle = vi.fn();
  const filters = { ...EMPTY_FILTERS, ...overrides } as TicketFilters;
  renderWithProviders(
    <FilterSections
      projectId="p1"
      sections={["type", "status", "epic", "version"]}
      filters={filters}
      toggle={toggle}
      assigneeOptions={[]}
      versionOptions={["v1.0"]}
    />
  );
  return { toggle };
}

const groupHeader = (title: string) =>
  screen.getByRole("button", { name: new RegExp(`^${title}`) });

describe("filter groups", () => {
  afterEach(cleanup);

  it("starts with every group collapsed", () => {
    renderFilterSections();

    expect(groupHeader("Type")).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByText("Bug")).not.toBeInTheDocument();
    expect(screen.queryByText("To Do")).not.toBeInTheDocument();
    expect(screen.queryByText("Onboarding")).not.toBeInTheDocument();
  });

  it("reveals a group's options when its header is clicked, and keeps others closed", async () => {
    const { toggle } = renderFilterSections();

    await userEvent.click(groupHeader("Type"));

    expect(groupHeader("Type")).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText("Bug")).toBeInTheDocument();
    expect(screen.queryByText("To Do")).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Bug" }));
    expect(toggle).toHaveBeenCalledWith("types", "Bug");
  });

  it("shows how many options are selected while the group stays collapsed", () => {
    renderFilterSections({ types: ["Bug", "CR"], epicIds: ["7"] });

    expect(groupHeader("Type")).toHaveTextContent("2");
    expect(groupHeader("Epic")).toHaveTextContent("1");
    expect(screen.queryByText("Bug")).not.toBeInTheDocument();
  });
});
