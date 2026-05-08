import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ChipGroup } from "./ChipGroup";

describe("ChipGroup", () => {
  it("renders all four discipline options", () => {
    render(<ChipGroup value={[]} onChange={() => {}} />);
    ["Todo", "In progress", "For integration", "Done"].forEach((l) =>
      expect(screen.getByText(l)).toBeInTheDocument(),
    );
  });

  it("shows the 'any' hint when nothing selected", () => {
    render(<ChipGroup value={[]} onChange={() => {}} />);
    expect(screen.getByText("any")).toBeInTheDocument();
  });

  it("calls onChange with added value when toggling on", () => {
    const onChange = vi.fn();
    render(<ChipGroup value={[]} onChange={onChange} />);
    fireEvent.click(screen.getByText("Done"));
    expect(onChange).toHaveBeenCalledWith(["done"]);
  });

  it("calls onChange with removed value when toggling off", () => {
    const onChange = vi.fn();
    render(<ChipGroup value={["done" as never, "todo" as never]} onChange={onChange} />);
    fireEvent.click(screen.getByText("Done"));
    expect(onChange).toHaveBeenCalledWith(["todo"]);
  });

  it("does not call onChange when disabled", () => {
    const onChange = vi.fn();
    render(<ChipGroup value={[]} onChange={onChange} disabled />);
    fireEvent.click(screen.getByText("Done"));
    expect(onChange).not.toHaveBeenCalled();
  });
});
