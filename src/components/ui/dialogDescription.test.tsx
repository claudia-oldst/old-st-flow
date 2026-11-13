import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";

const DESCRIPTION_WARNING = "Missing `Description`";

function spyConsole() {
  const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
  return warn;
}

function warnedText(warn: ReturnType<typeof spyConsole>) {
  return warn.mock.calls.flat().join("\n");
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("window descriptions", () => {
  it("stays quiet when a dialog has no description", () => {
    const warn = spyConsole();
    render(
      <Dialog open>
        <DialogContent>
          <DialogTitle>Assign ticket</DialogTitle>
        </DialogContent>
      </Dialog>,
    );
    expect(screen.getByRole("dialog").getAttribute("aria-describedby")).toBeNull();
    expect(warnedText(warn)).not.toContain(DESCRIPTION_WARNING);
  });

  it("keeps the screen-reader link when a dialog renders a description", () => {
    const warn = spyConsole();
    render(
      <Dialog open>
        <DialogContent>
          <DialogTitle>Assign ticket</DialogTitle>
          <DialogDescription>Choose who owns this ticket.</DialogDescription>
        </DialogContent>
      </Dialog>,
    );
    const describedBy = screen.getByRole("dialog").getAttribute("aria-describedby");
    expect(describedBy).toBeTruthy();
    expect(document.getElementById(describedBy!)).toHaveTextContent("Choose who owns this ticket.");
    expect(warnedText(warn)).not.toContain(DESCRIPTION_WARNING);
  });

  it("stays quiet when a sheet has no description", () => {
    const warn = spyConsole();
    render(
      <Sheet open>
        <SheetContent>
          <SheetTitle>Ticket HER2-001</SheetTitle>
        </SheetContent>
      </Sheet>,
    );
    expect(screen.getByRole("dialog").getAttribute("aria-describedby")).toBeNull();
    expect(warnedText(warn)).not.toContain(DESCRIPTION_WARNING);
  });

  it("keeps the screen-reader link when a nested sheet description is rendered", () => {
    const warn = spyConsole();
    render(
      <Sheet open>
        <SheetContent>
          <SheetTitle>Ticket HER2-001</SheetTitle>
          <div>
            <SheetDescription>Acceptance criteria for this ticket.</SheetDescription>
          </div>
        </SheetContent>
      </Sheet>,
    );
    const describedBy = screen.getByRole("dialog").getAttribute("aria-describedby");
    expect(describedBy).toBeTruthy();
    expect(document.getElementById(describedBy!)).toHaveTextContent("Acceptance criteria for this ticket.");
    expect(warnedText(warn)).not.toContain(DESCRIPTION_WARNING);
  });
});
