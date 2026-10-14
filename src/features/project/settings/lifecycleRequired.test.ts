import { describe, it, expect } from "vitest";
import { missingRequiredField, type LifecycleDates } from "./lifecycle";

const base: LifecycleDates = {
  start_date: "2026-01-01", development_start_date: null, handover_date: null,
  closing_window_date: null, pause_date: null, pause_reason: null, closed_date: null, closed_reason: null,
};

describe("development start date requirement", () => {
  it("is required for In Progress", () => {
    expect(missingRequiredField("In Progress", base)).toBe("development_start_date");
  });
  it("is not required for Definition", () => {
    expect(missingRequiredField("Definition", base)).toBeNull();
  });
});
