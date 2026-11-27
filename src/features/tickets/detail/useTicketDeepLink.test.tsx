import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router-dom";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { makeTicket } from "@/test/fixtures/tickets";
import { urls } from "../../../../supabase/functions/slack-notify/urls";

const mocks = vi.hoisted(() => ({ fetch: vi.fn() }));
vi.mock("../fetchTicketById", () => ({ fetchTicketById: mocks.fetch }));
import { ticketDetailTab, useTicketDeepLink } from "./useTicketDeepLink";

function setup(url: string) {
  return renderHook(() => ({ ...useTicketDeepLink(), location: useLocation() }), {
    wrapper: ({ children }: { children: ReactNode }) => <MemoryRouter initialEntries={[url]}>{children}</MemoryRouter>,
  });
}

describe("Slack discussion deep links", () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(cleanup);

  it("adds Discussion only to discussion links, leaving ordinary ticket links unchanged", () => {
    const links = urls("https://oldst-pulse.lovable.app/", "project-id", "ticket-id");
    expect(links.discussion).toBe("https://oldst-pulse.lovable.app/projects/project-id?ticket=ticket-id&tab=discussion");
    expect(links.ticket).toBe("https://oldst-pulse.lovable.app/projects/project-id?ticket=ticket-id");
    expect(urls(null, "p", "t").discussion).toBeNull();
  });

  it("captures Discussion before clearing the link parameters, preserving other filters", async () => {
    const ticket = makeTicket({ id: "ticket-id" });
    mocks.fetch.mockResolvedValue(ticket);
    const { result } = setup("/projects/p?ticket=ticket-id&tab=discussion&version=v1");
    await waitFor(() => expect(result.current.openTicket).toEqual(ticket));
    expect(result.current.initialTab).toBe("discussion");
    expect(result.current.location.search).toBe("?version=v1");
    expect(mocks.fetch).toHaveBeenCalledTimes(1);
    expect(mocks.fetch).toHaveBeenCalledWith("ticket-id");
  });

  it("does not carry Discussion into the next ticket opened from the list", async () => {
    mocks.fetch.mockResolvedValue(makeTicket({ id: "linked" }));
    const { result } = setup("/projects/p?ticket=linked&tab=discussion");
    await waitFor(() => expect(result.current.initialTab).toBe("discussion"));
    act(() => result.current.setOpenTicket(null));
    const next = makeTicket({ id: "ordinary" });
    act(() => result.current.setOpenTicket(next));
    expect(result.current.openTicket).toEqual(next);
    expect(result.current.initialTab).toBeUndefined();
  });

  it("retains normal defaults when the link has no tab or an invalid tab", async () => {
    mocks.fetch.mockResolvedValue(makeTicket());
    const { result } = setup("/projects/p?ticket=t&tab=invalid");
    await waitFor(() => expect(result.current.openTicket).not.toBeNull());
    expect(result.current.initialTab).toBeUndefined();
    expect(ticketDetailTab(null)).toBeUndefined();
    expect(ticketDetailTab("status")).toBe("status");
    expect(ticketDetailTab("acceptance")).toBe("acceptance");
  });

  it("does not open a missing ticket", async () => {
    mocks.fetch.mockResolvedValue(null);
    const { result } = setup("/projects/p?ticket=missing&tab=discussion");
    await waitFor(() => expect(result.current.location.search).toBe(""));
    expect(result.current.openTicket).toBeNull();
  });
});