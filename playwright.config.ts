import { defineConfig } from "@playwright/test";

// Scoped to the source-mock capture spec only (not the app's vitest/.stories).
// Single worker, single browser — Chromium is memory-hungry (resource cap C).
export default defineConfig({
  testDir: "./src/mock/screenshots",
  testMatch: /capture\.spec\.ts/,
  workers: 1,
  fullyParallel: false,
  reporter: "list",
  use: {
    baseURL: process.env.MOCK_BASE_URL ?? "http://localhost:8081",
    viewport: { width: 1440, height: 900 },
  },
});
