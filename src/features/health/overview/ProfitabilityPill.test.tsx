import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ProfitabilityPill } from "./ProfitabilityPill";

describe("ProfitabilityPill", () => {
  it("renders Healthy for good", () => {
    render(<ProfitabilityPill state="good" />);
    expect(screen.getByText("Healthy")).toBeInTheDocument();
  });
  it("renders At risk for warn", () => {
    render(<ProfitabilityPill state="warn" />);
    expect(screen.getByText("At risk")).toBeInTheDocument();
  });
  it("renders Over budget for bad", () => {
    render(<ProfitabilityPill state="bad" />);
    expect(screen.getByText("Over budget")).toBeInTheDocument();
  });
  it("renders No data for unknown state", () => {
    render(<ProfitabilityPill state="unknown" />);
    expect(screen.getByText("No data")).toBeInTheDocument();
  });
});
