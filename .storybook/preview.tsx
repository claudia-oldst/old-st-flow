import React from "react";
import type { Preview } from "@storybook/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { TooltipProvider } from "../src/components/ui/tooltip";
import "../src/index.css";

/**
 * Global decorator mirroring the app shell (src/App.tsx):
 *   QueryClientProvider -> MemoryRouter -> TooltipProvider
 * A fresh QueryClient per render (retry:false) keeps stories isolated, and
 * MemoryRouter stands in for the app's BrowserRouter so router-aware components
 * (NavLink, TopBar) render. The global stylesheet is imported so Tailwind +
 * design-token classes resolve. The app is dark-by-default (tokens on :root),
 * so the matching background is set below.
 */
const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    backgrounds: {
      default: "app",
      values: [
        { name: "app", value: "hsl(227 33% 16%)" },
        { name: "light", value: "#ffffff" },
      ],
    },
  },
  decorators: [
    (Story) => {
      const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false } },
      });
      return (
        <QueryClientProvider client={queryClient}>
          <MemoryRouter>
            <TooltipProvider>
              <Story />
            </TooltipProvider>
          </MemoryRouter>
        </QueryClientProvider>
      );
    },
  ],
};

export default preview;
