import { describe, it, expect } from "vitest";
import { shouldPromptForAvatar } from "./fridayPrompt";

const fri = new Date(2026, 10, 13, 9);
const thu = new Date(2026, 10, 12, 9);

describe("Friday avatar prompt", () => {
  it("prompts on Friday without a photo", () => expect(shouldPromptForAvatar(false, fri, null)).toBe(true));
  it("does not prompt on other days", () => expect(shouldPromptForAvatar(false, thu, null)).toBe(false));
  it("does not prompt once a photo exists", () => expect(shouldPromptForAvatar(true, fri, null)).toBe(false));
  it("does not re-prompt after dismissal the same Friday", () => expect(shouldPromptForAvatar(false, fri, "2026-11-13")).toBe(false));
  it("prompts again the next Friday", () => expect(shouldPromptForAvatar(false, new Date(2026, 10, 20), "2026-11-13")).toBe(true));
});
