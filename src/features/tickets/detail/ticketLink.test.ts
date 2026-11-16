import { describe, it, expect } from "vitest";
import { ticketUrl, ticketLabel, ticketLinkHtml } from "./ticketLink";

describe("ticket link", () => {
  it("uses the project deep link with the ticket id", () => {
    expect(ticketUrl("https://x.app/", "p1", "t1")).toBe("https://x.app/projects/p1?ticket=t1");
  });
  it("labels as number — title and escapes html", () => {
    const label = ticketLabel("COU-934", "A <b> & c");
    expect(label).toBe("COU-934 — A <b> & c");
    expect(ticketLinkHtml("https://x/?a=1&b=2", label)).toBe(
      '<a href="https://x/?a=1&amp;b=2">COU-934 — A &lt;b&gt; &amp; c</a>',
    );
  });
});
