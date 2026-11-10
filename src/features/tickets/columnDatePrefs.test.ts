import { describe, it, expect } from "vitest";
import { DEFAULT_COLUMN_PREFS, isAllColsOn } from "./useColumnDisplayPrefs";

describe("created/updated columns", () => {
  it("are hidden by default", () => {
    expect(DEFAULT_COLUMN_PREFS.created_at).toBe(false);
    expect(DEFAULT_COLUMN_PREFS.updated_at).toBe(false);
  });
  it("default prefs don't flag the menu as customised", () => {
    expect(isAllColsOn(DEFAULT_COLUMN_PREFS)).toBe(true);
    expect(isAllColsOn({ ...DEFAULT_COLUMN_PREFS, created_at: true })).toBe(false);
  });
});
