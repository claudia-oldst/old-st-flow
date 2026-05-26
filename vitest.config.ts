import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "json-summary"],
      include: ["src/features/**", "src/lib/**", "src/hooks/**"],
      exclude: [
        "**/*.test.*",
        "**/*.spec.*",
        "src/test/**",
        "src/components/ui/**",
        "src/integrations/supabase/types.ts",
      ],
      thresholds: {
        // Repo-wide floor; raise as coverage grows.
        lines: 5,
        statements: 5,
        functions: 20,
        branches: 50,
      },
    },
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
});
