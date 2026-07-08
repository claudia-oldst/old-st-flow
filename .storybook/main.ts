import type { StorybookConfig } from "@storybook/react-vite";
import path from "path";

const config: StorybookConfig = {
  stories: ["../src/**/*.stories.@(ts|tsx)"],
  addons: ["@storybook/addon-essentials"],
  framework: {
    name: "@storybook/react-vite",
    options: {},
  },
  core: {
    disableTelemetry: true,
  },
  async viteFinal(viteConfig) {
    viteConfig.resolve = viteConfig.resolve ?? {};
    // Prepend the Supabase client mock BEFORE the project's `@` alias so it wins.
    // The real client constructs a Supabase connection with hardcoded prod
    // credentials at import time — alias-mocking it keeps stories off the network.
    viteConfig.resolve.alias = [
      {
        find: "@/integrations/supabase/client",
        replacement: path.resolve(__dirname, "./mocks/supabase.ts"),
      },
      { find: "@", replacement: path.resolve(__dirname, "../src") },
      ...(Array.isArray(viteConfig.resolve.alias) ? viteConfig.resolve.alias : []),
    ];
    return viteConfig;
  },
};

export default config;
