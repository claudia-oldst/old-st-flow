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

  it("shows the true percent past 150% while capping the arc at one full circle", () => {
    const { container } = render(<Ring title="Frontend" actual={27} estimate={10} original={10} />);
    // Labels are the real ratios, not clamped to 150%.
    expect(screen.getByText("270%")).toBeInTheDocument();
    const arcs = Array.from(container.querySelectorAll("circle[stroke-dasharray]"));
    const dash = (el: Element) =>
      Number((el.getAttribute("stroke-dasharray") || "").split(" ")[0]);
    // Outer arc (r=56) and inner arc (r=30) never exceed their own circumference.
    const outer = arcs.find((el) => el.getAttribute("r") === "56")!;
    const inner = arcs.find((el) => el.getAttribute("r") === "30")!;
    expect(dash(outer)).toBeCloseTo(2 * Math.PI * 56, 1);
    expect(dash(inner)).toBeCloseTo(2 * Math.PI * 30, 1);
  });
});
