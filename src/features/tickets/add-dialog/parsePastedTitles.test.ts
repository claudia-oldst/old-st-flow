import { describe, expect, it } from "vitest";
import { parsePastedTitles, countDuplicates } from "./parsePastedTitles";
import { MAX_TICKET_TITLE } from "@/lib/schemas/ticket";

describe("parsePastedTitles", () => {
  it("splits on newlines and trims", () => {
    expect(parsePastedTitles("  Alpha \nBeta\n\n Gamma  \n")).toEqual(["Alpha", "Beta", "Gamma"]);
  });

  it("handles CRLF", () => {
    expect(parsePastedTitles("A\r\nB\r\n")).toEqual(["A", "B"]);
  });

  it("uses only the first cell of tab-separated rows", () => {
    expect(parsePastedTitles("Title one\textra\tcells\nTitle two")).toEqual(["Title one", "Title two"]);
  });

  it("returns empty for blank input", () => {
    expect(parsePastedTitles("   \n\t\n")).toEqual([]);
  });

  it("clamps long titles", () => {
    const long = "x".repeat(MAX_TICKET_TITLE + 50);
    expect(parsePastedTitles(long)[0]).toHaveLength(MAX_TICKET_TITLE);
  });
});

describe("countDuplicates", () => {
  it("counts case-insensitive duplicates", () => {
    expect(countDuplicates(["A", "a", "B"])).toBe(1);
    expect(countDuplicates(["A", "B"])).toBe(0);
  });
});
