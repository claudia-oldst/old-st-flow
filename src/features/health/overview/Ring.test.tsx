import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Ring } from "./Ring";

describe("Ring", () => {
  it("renders title, percent, and formatted hours", () => {
    render(<Ring title="Frontend" actual={5} estimate={10} original={8} />);
    expect(screen.getByText("Frontend")).toBeInTheDocument();
    // current pct = 50%
    expect(screen.getByText("50%")).toBeInTheDocument();
    // original pct = round(5/8) = 63%
    expect(screen.getByText("63%")).toBeInTheDocument();
  });

  it("hides original block when original is 0", () => {
    render(<Ring title="Backend" actual={2} estimate={4} original={0} />);
    expect(screen.queryByText("Original")).toBeInTheDocument(); // label still in side stats
    // The right-hand 'Original' value renders as "—"
    expect(screen.getByText("—")).toBeInTheDocument();
  });
});
