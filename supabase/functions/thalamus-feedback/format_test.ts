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

Deno.test("renders 1.3.0 device details", () => {
  const out = renderReport({ environment: { viewport: "1440x813", screen: "1440x900", pixel_ratio: 2, browser: "Chrome 128.0.6613.120", os: "macOS 14.5.0", app_version: "2.4.0" } });
  for (const l of ["Browser: Chrome 128.0.6613.120", "OS: macOS 14.5.0", "Window: 1440×813", "Screen: 1440×900 @2x", "App version: 2.4.0"]) {
    if (!out.includes(l)) throw new Error(`missing ${l}`);
  }
});

Deno.test("older report skips missing device lines", () => {
  const out = renderReport({ environment: { viewport: "393x852" } });
  if (out.includes("Browser:") || out.includes("Screen:")) throw new Error("unexpected lines");
  if (!out.includes("App version: Not set by the site")) throw new Error("missing fallback");
});
