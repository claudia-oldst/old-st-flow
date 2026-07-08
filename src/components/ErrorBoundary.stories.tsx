import type { Meta, StoryObj } from "@storybook/react";
import { ErrorBoundary } from "./ErrorBoundary";

// A child that throws during render so the boundary shows its fallback UI.
function Boom(): JSX.Element {
  throw new Error("Failed to load tickets for Client Portal (OST-142)");
}

const meta = {
  title: "Composites/ErrorBoundary",
  component: ErrorBoundary,
  tags: ["autodocs"],
  parameters: { layout: "fullscreen" },
  args: { children: null },
} satisfies Meta<typeof ErrorBoundary>;

export default meta;
type Story = StoryObj<typeof meta>;

// Default fallback: a child throws → scoped "Something went wrong" panel with
// Try again / Reload actions. (In dev the error message is shown too.)
export const Default: Story = {
  render: () => (
    <ErrorBoundary scope="projects">
      <Boom />
    </ErrorBoundary>
  ),
};

// Custom fallback node passed via the `fallback` prop.
export const CustomFallback: Story = {
  render: () => (
    <ErrorBoundary
      scope="time logs"
      fallback={
        <div className="p-6 text-sm text-dim">
          Couldn&apos;t load time logs. Please retry.
        </div>
      }
    >
      <Boom />
    </ErrorBoundary>
  ),
};

// Happy path: no error → children render normally.
export const HealthyChildren: Story = {
  render: () => (
    <ErrorBoundary scope="projects">
      <div className="p-6 text-sm text-foreground">Tickets loaded for Client Portal.</div>
    </ErrorBoundary>
  ),
};
