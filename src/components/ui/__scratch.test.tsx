import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { hasDescriptionElement } from "@/lib/radixDescription";

describe("scratch", () => {
  it("inspects the link", () => {
    const el = <DialogDescription>hello</DialogDescription>;
    console.log("direct scan:", hasDescriptionElement([el], [DialogDescription]));
    console.log("primitive scan:", hasDescriptionElement([el], [DialogDescription]));
    render(
      <Dialog open>
        <DialogContent>
          <DialogTitle>Assign ticket</DialogTitle>
          <DialogDescription>Choose who owns this ticket.</DialogDescription>
        </DialogContent>
      </Dialog>,
    );
    const dialog = screen.getByRole("dialog");
    console.log("attrs:", dialog.getAttribute("aria-describedby"), dialog.getAttribute("aria-labelledby"));
    console.log("html:", dialog.outerHTML.slice(0, 400));
    expect(true).toBe(true);
  });
});
