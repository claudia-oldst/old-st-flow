import { assert, assertEquals } from "jsr:@std/assert@1";
import { renderReport, suggestedType } from "./format.ts";

Deno.test("report types map to suggested ticket types", () => {
  assertEquals(suggestedType("bug"), "Bug");
  assertEquals(suggestedType("feature"), "CR");
  assertEquals(suggestedType("general"), "Standard");
});

Deno.test("report renders reporter, page, console and network errors", () => {
  const body = renderReport({
    type: "bug",
    description: "Button spins",
    page_url: "https://amber.old.st/checkout",
    reporter: { name: "Alex Smith", email: "alex@old.st" },
    environment: { viewport: "393x852" },
    diagnostics: {
      console_logs: [{ level: "error", message: "TypeError: token" }],
      network_errors: [{ method: "POST", url: "https://api/x", status: 500, statusText: "Internal Server Error" }],
    },
  });
  assert(body.includes("Alex Smith (alex@old.st)"));
  assert(body.includes("Page: https://amber.old.st/checkout"));
  assert(body.includes("[error] TypeError: token"));
  assert(body.includes("POST https://api/x → 500 Internal Server Error"));
});
