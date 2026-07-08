import type { Meta, StoryObj } from "@storybook/react";
import type { TeamMember } from "@/lib/types";
import { useCurrentUser } from "@/store/currentUser";
import { useTimerStore } from "@/store/timer";
import { TopBar } from "./TopBar";

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

/**
 * TopBar reads the signed-in user from the zustand store (UserMenu returns null
 * without one) and the active timer from the timer store (TimerChip renders
 * only when a timer is running). Router (MemoryRouter) + React Query +
 * TooltipProvider come from the global preview decorators; Supabase is mocked.
 */
const meta = {
  title: "Composites/TopBar",
  component: TopBar,
  tags: ["autodocs"],
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof TopBar>;

export default meta;
type Story = StoryObj<typeof meta>;

// Signed in, no active timer: logo, nav, logoff-summary + user menu.
export const Default: Story = {
  decorators: [
    (Story) => {
      useCurrentUser.setState({ user: MOCK_USER, authLoading: false });
      useTimerStore.setState({ active: null, tickets: [] });
      return <Story />;
    },
  ],
};

// PMBA user → the Admin nav item is shown (non-PMBA users like the Default
// story's Frontend user don't get it, mirroring the RequirePMBA route guard).
export const PMBAWithAdminLink: Story = {
  decorators: [
    (Story) => {
      useCurrentUser.setState({
        user: { ...MOCK_USER, role: "PMBA" } as TeamMember,
        authLoading: false,
      });
      useTimerStore.setState({ active: null, tickets: [] });
      return <Story />;
    },
  ],
};

// With a running timer → the timer chip appears alongside the user menu.
export const WithActiveTimer: Story = {
  decorators: [
    (Story) => {
      useCurrentUser.setState({ user: MOCK_USER, authLoading: false });
      useTimerStore.setState({
        active: {
          discipline: "FE",
          user_id: MOCK_USER.id,
          ticket_id: "tk-1",
          started_at: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
        } as ReturnType<typeof useTimerStore.getState>["active"],
        tickets: [
          {
            id: "tk-1",
            formatted_id: "OST-142",
            title: "Client portal auth flow",
            position: 0,
            fe_status: "in_progress",
            be_status: "todo",
            status_id: null,
            project_id: "p-1",
          },
        ] as ReturnType<typeof useTimerStore.getState>["tickets"],
      });
      return <Story />;
    },
  ],
};
