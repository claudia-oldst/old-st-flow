import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { StatusBadge } from "./StatusBadge";

describe("StatusBadge", () => {
  it("uses the good token for approved", () => {
    render(<StatusBadge status="approved" />);
    expect(screen.getByText("approved").className).toContain("text-health-good");
  });

  it("uses the warn token for pending", () => {
    render(<StatusBadge status="pending" />);
    expect(screen.getByText("pending").className).toContain("text-health-warn");
  });

  it("uses the bad token for rejected", () => {
    render(<StatusBadge status="rejected" />);
    expect(screen.getByText("rejected").className).toContain("text-health-bad");
  });

  it("falls back to dim styling for unknown statuses", () => {
    render(<StatusBadge status="weird" />);
    expect(screen.getByText("weird").className).toContain("text-dim");
  });
});
