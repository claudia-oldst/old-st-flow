import { cleanup, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useCurrentUser } from "@/store/currentUser";
import { renderWithProviders } from "@/test/utils";
import type { CommentRow, CommentThreadNode } from "./types";
import { CommentThread } from "./CommentThread";

const mocks = vi.hoisted(() => ({ insert: vi.fn() }));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => Promise.resolve({ data: [] }),
        maybeSingle: () => Promise.resolve({ data: null }),
      }),
      insert: mocks.insert,
    }),
    auth: {
      getSession: () => Promise.resolve({ data: { session: null } }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
    },
    storage: { from: () => ({ createSignedUrls: () => Promise.resolve({ data: [] }) }) },
  },
}));

vi.mock("@/features/team/useProjectRole", () => ({
  useProjectRole: () => "PMBA",
  canManageTickets: () => true,
  isPMBA: () => true,
}));

function makeRow(over: Partial<CommentRow> = {}): CommentRow {
  return {
    id: "r1",
    ticket_id: "t1",
    user_id: "u1",
    parent_id: "p1",
    body: "a reply",
    attachments: [],
    edited_at: null,
    created_at: new Date("2026-11-27T08:00:00Z").toISOString(),
    author: { id: "u1", name: "Claudia", avatar_color: "#ffffff" } as CommentRow["author"],
    ...over,
  };
}

function makeThread(): CommentThreadNode {
  return {
    ...makeRow({ id: "p1", parent_id: null, body: "the parent discussion" }),
    replies: [makeRow({ id: "r1", body: "a reply" })],
  };
}

function replyRowItem() {
  const text = screen.getByText("a reply");
  const item = text.closest(".group") as HTMLElement | null;
  if (!item) throw new Error("reply row not found");
  return item;
}

describe("Discussion thread replies", () => {
  beforeEach(() => {
    mocks.insert.mockResolvedValue({ error: null });
    useCurrentUser.setState({ user: { id: "u1", name: "Claudia", role: "PMBA" } as never });
  });
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
    useCurrentUser.setState({ user: null });
  });

  it("offers a Reply action on the parent comment and on every reply", () => {
    renderWithProviders(<CommentThread thread={makeThread()} projectId="p1" ticketId="t1" onChanged={vi.fn()} />);
    expect(screen.getAllByRole("button", { name: "Reply" })).toHaveLength(2);
  });

  it("opens the reply composer from a reply row and posts to the parent discussion", async () => {
    const user = userEvent.setup();
    renderWithProviders(<CommentThread thread={makeThread()} projectId="p1" ticketId="t1" onChanged={vi.fn()} />);

    await user.click(within(replyRowItem()).getByRole("button", { name: "Reply" }));

    const box = screen.getByPlaceholderText("Write a reply…");
    await user.type(box, "Fixing it now");
    await user.click(within(box.parentElement as HTMLElement).getByRole("button", { name: "Reply" }));

    await waitFor(() => expect(mocks.insert).toHaveBeenCalled());
    const payload = mocks.insert.mock.calls[0][0];
    expect(payload).toMatchObject({
      ticket_id: "t1",
      user_id: "u1",
      parent_id: "p1",
      body: "Fixing it now",
    });
    expect(payload.parent_id).not.toBe("r1");
  });

  it("hides reply actions when nobody is signed in", () => {
    useCurrentUser.setState({ user: null });
    renderWithProviders(<CommentThread thread={makeThread()} projectId="p1" ticketId="t1" onChanged={vi.fn()} />);
    expect(screen.queryByRole("button", { name: "Reply" })).toBeNull();
  });
});
