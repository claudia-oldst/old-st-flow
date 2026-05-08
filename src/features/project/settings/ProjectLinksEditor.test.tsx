import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ProjectLinksEditor } from "./ProjectLinksEditor";

describe("ProjectLinksEditor", () => {
  it("renders the empty state when there are no links", () => {
    render(<ProjectLinksEditor links={[]} canEdit onChange={() => {}} />);
    expect(screen.getByText("No links yet.")).toBeInTheDocument();
  });

  it("hides the Add button when canEdit is false", () => {
    render(<ProjectLinksEditor links={[]} canEdit={false} onChange={() => {}} />);
    expect(screen.queryByLabelText("Add link")).toBeNull();
  });

  it("calls onChange with a new empty row when Add link is clicked", () => {
    const onChange = vi.fn();
    render(<ProjectLinksEditor links={[]} canEdit onChange={onChange} />);
    fireEvent.click(screen.getByLabelText("Add link"));
    expect(onChange).toHaveBeenCalledWith([{ name: "", url: "" }]);
  });

  it("propagates name edits via onChange", () => {
    const onChange = vi.fn();
    render(
      <ProjectLinksEditor
        links={[{ name: "Figma", url: "https://figma.com" }]}
        canEdit
        onChange={onChange}
      />,
    );
    fireEvent.change(screen.getByLabelText("Link 1 name"), { target: { value: "Notion" } });
    expect(onChange).toHaveBeenCalledWith([{ name: "Notion", url: "https://figma.com" }]);
  });

  it("removes the row at the requested index", () => {
    const onChange = vi.fn();
    render(
      <ProjectLinksEditor
        links={[
          { name: "A", url: "https://a" },
          { name: "B", url: "https://b" },
        ]}
        canEdit
        onChange={onChange}
      />,
    );
    fireEvent.click(screen.getByLabelText("Remove link 1"));
    expect(onChange).toHaveBeenCalledWith([{ name: "B", url: "https://b" }]);
  });
});
