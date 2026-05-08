import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Stat } from "./Stat";

describe("Stat", () => {
  it("renders the label", () => {
    render(<Stat label="Original" value={5} />);
    expect(screen.getByText("Original")).toBeInTheDocument();
  });

  it("formats hours via formatHours", () => {
    render(<Stat label="Hours" value={2.5} />);
    expect(screen.getByText("2.5h")).toBeInTheDocument();
  });

  it("applies the accent color class", () => {
    render(<Stat label="X" value={1} accent="warn" />);
    expect(screen.getByText("1h").className).toContain("text-health-warn");
  });

  it("falls back to foreground when no accent", () => {
    render(<Stat label="X" value={1} />);
    expect(screen.getByText("1h").className).toContain("text-foreground");
  });
});
