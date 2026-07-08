import type { Meta, StoryObj } from "@storybook/react";
import { useMemo } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { TeamMember } from "@/lib/types";
import { useCurrentUser } from "@/store/currentUser";
import { WeeklyHoursBar } from "./WeeklyHoursBar";

const MOCK_USER = {
  id: "tm-1",
  name: "Dennis Mariano",
  email: "dennis@old.st",
  avatar_color: "#6366f1",
  role: "Frontend",
  auth_user_id: null,
  github_username: "dmariano",
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
} as TeamMember;

// Reproduces the component's internal weekRange().key so we can pre-seed the
// React Query cache under the exact key the hook reads.
function weekKey() {
  const now = new Date();
  const day = now.getDay();
  const diffToMon = (day + 6) % 7;
  const monday = new Date(now);
  monday.setHours(0, 0, 0, 0);
  monday.setDate(monday.getDate() - diffToMon);
  return monday.toDateString();
}

/**
 * WeeklyHoursBar fetches the current user's logged hours via React Query +
 * Supabase. We seed a current user (zustand) and pre-fill the query cache with
 * a fixed hours value so the bar renders filled with zero network. The bar
 * itself is a 2px sticky strip, so we frame it inside a tall surface.
 */
function withSeededHours(hours: number) {
  return function Decorator(Story: React.ComponentType) {
    useCurrentUser.setState({ user: MOCK_USER, authLoading: false });
    const qc = useMemo(() => {
      const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
      client.setQueryData(["weekly-hours", MOCK_USER.id, weekKey()], hours);
      return client;
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    return (
      <QueryClientProvider client={qc}>
        <div className="relative h-40 w-[480px] rounded-lg bg-surface-1 hairline overflow-hidden">
          <Story />
          <p className="p-4 text-xs text-dim">
            Hover the top strip → tooltip shows hours / 40h this week.
          </p>
        </div>
      </QueryClientProvider>
    );
  };
}

const meta = {
  title: "Composites/WeeklyHoursBar",
  component: WeeklyHoursBar,
  tags: ["autodocs"],
  parameters: { layout: "padded" },
} satisfies Meta<typeof WeeklyHoursBar>;

export default meta;
type Story = StoryObj<typeof meta>;

// ~52% of the 40h weekly target.
export const Default: Story = {
  decorators: [withSeededHours(21)],
};

// Target reached → bar full at 100%.
export const TargetReached: Story = {
  decorators: [withSeededHours(40)],
};
