import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { hasDescriptionElement } from "@/lib/radixDescription";

function spyConsole() {
  const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
  return warn;
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("sequence", () => {
  it("one: no description", () => {
    spyConsole();
    render(
      <Dialog open>
        <DialogContent>
          <DialogTitle>Assign ticket</DialogTitle>
        </DialogContent>
      </Dialog>,
    );
    console.log("T1 dialogs:", document.querySelectorAll('[role="dialog"]').length);
  });

  it("two: with description", () => {
    spyConsole();
    console.log("entering two, dialogs already in dom:", document.querySelectorAll('[role="dialog"]').length);
    const children = [
      <DialogTitle key="t">Assign ticket</DialogTitle>,
      <DialogDescription key="d">Choose who owns this ticket.</DialogDescription>,
    ];
    console.log("scan says:", hasDescriptionElement(children, [DialogDescription]));
    render(
      <Dialog open>
        <DialogContent>
          <DialogTitle>Assign ticket</DialogTitle>
          <DialogDescription>Choose who owns this ticket.</DialogDescription>
        </DialogContent>
      </Dialog>,
    );
    const dialogs = document.querySelectorAll('[role="dialog"]');
    console.log("T2 dialogs:", dialogs.length);
    dialogs.forEach((d, i) => console.log(`  #${i}`, d.getAttribute("aria-describedby"), d.textContent));
    console.log("getByRole says:", screen.getByRole("dialog").getAttribute("aria-describedby"));
    expect(true).toBe(true);
  });
});
