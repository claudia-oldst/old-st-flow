/**
 * Capture spec for the source mock. Iterates the MANIFEST, and per route×state
 * writes BOTH a .png (visual reference) and a .dom.json (structural reference:
 * headings, table columns, badge/status labels, row counts, empty-state copy).
 *
 * Run after booting the mock:  npm run dev:mock   (http://localhost:8081)
 * then:                        npm run mock:capture   (playwright --workers=1)
 *
 * Single browser, one shared page/context across all rows (resource cap C).
 */
import { test, expect } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const BASE = process.env.MOCK_BASE_URL ?? "http://localhost:8081";
const OUT = path.dirname(fileURLToPath(import.meta.url));
const COU = "f77acac6-09f3-4da8-97e6-ec125afcbb22";
const DEM = "36aa2c91-61e3-4098-9fc5-f3d41313852c";
const DRA = "8438996f-055d-4cb0-a1b6-7d8dfd58ac35";
const HASH = "c16bf94a8e01ac8e0da588e2426b4a19aa81e7d370742e4cb365e3a85ecaa6d6";

interface Row {
  route: string;
  state: string;
  link: string;
  waitFor?: string;
  click?: string; // optional selector to click (opens a modal) before capture
}

const MANIFEST: Row[] = [
  { route: "projects-list", state: "many", link: "/" },
  { route: "project-tickets", state: "many", link: `/projects/${COU}` },
  { route: "project-tickets", state: "empty", link: `/projects/${DEM}` },
  { route: "project-tickets", state: "single", link: `/projects/${DRA}` },
  { route: "change-requests-cr", state: "populated", link: `/projects/${COU}/change-requests-cr` },
  { route: "estimate-revisions", state: "default", link: `/projects/${COU}/change-requests` },
  { route: "sprints", state: "populated", link: `/projects/${COU}/sprints` },
  { route: "sprints", state: "empty", link: `/projects/${DEM}/sprints` },
  { route: "health", state: "populated", link: `/projects/${COU}/health` },
  { route: "client-portal-editor", state: "populated", link: `/projects/${COU}/client` },
  { route: "my-work", state: "default", link: "/my-work" },
  { route: "admin", state: "populated", link: "/admin" },
  { route: "client-portal-public", state: "populated", link: `/h/${HASH}` },
  { route: "login", state: "default", link: "/login" },
  { route: "not-found", state: "default", link: "/this-route-does-not-exist" },
  // exact-text match on a board card's formatted id (avoids the TopBar timer chip, which is on COU-019)
  { route: "ticket-detail-sheet", state: "open", link: `/projects/${COU}`, click: 'text="COU-001"', waitFor: "[role=dialog]" },
];

const VIEWPORT = "desktop";
const THEME = "dark";

test.describe.configure({ mode: "serial" });

test("capture all manifest rows", async ({ page }) => {
  test.setTimeout(180_000);
  await page.setViewportSize({ width: 1440, height: 900 });

  for (const row of MANIFEST) {
    const dir = path.join(OUT, row.route);
    fs.mkdirSync(dir, { recursive: true });
    const base = `${row.state}-${VIEWPORT}-${THEME}`;

    await page.goto(BASE + row.link, { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => {});
    await page.waitForTimeout(1200);
    if (row.click) {
      await page.locator(row.click).first().click({ timeout: 6000 }).catch(() => {});
      await page.waitForTimeout(800);
    }
    if (row.waitFor) await page.waitForSelector(row.waitFor, { timeout: 6000 }).catch(() => {});

    const dom = await page.evaluate(() => {
      const txt = (el: Element) => (el as HTMLElement).innerText?.trim() ?? "";
      const uniq = (a: string[]) => [...new Set(a.filter(Boolean))];
      const dialog = document.querySelector('[role="dialog"]');
      const scope: ParentNode = dialog ?? document.body;
      return {
        title: document.title,
        headings: uniq([...scope.querySelectorAll("h1,h2,h3")].map(txt)).slice(0, 30),
        tableColumns: uniq([...scope.querySelectorAll('th,[role="columnheader"]')].map(txt)).slice(0, 40),
        badges: uniq(
          [...scope.querySelectorAll('[class*="badge" i],[data-status],[class*="pill" i]')]
            .map(txt)
            .filter((t) => t && t.length < 40),
        ).slice(0, 60),
        rowCount: scope.querySelectorAll('tbody tr,[role="row"]').length,
        tabs: uniq([...scope.querySelectorAll('[role="tab"],nav a')].map(txt).filter((t) => t && t.length < 30)).slice(0, 30),
        emptyCopy: uniq([...scope.querySelectorAll('[class*="empty" i]')].map(txt)).slice(0, 8),
        inDialog: !!dialog,
      };
    });

    fs.writeFileSync(path.join(dir, `${base}.dom.json`), JSON.stringify(dom, null, 2));
    await page.screenshot({ path: path.join(dir, `${base}.png`), fullPage: true });
  }

  // sanity: at least the projects list rendered something
  expect(fs.existsSync(path.join(OUT, "projects-list", `many-${VIEWPORT}-${THEME}.png`))).toBeTruthy();
});
