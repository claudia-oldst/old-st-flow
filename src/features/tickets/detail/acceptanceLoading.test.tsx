import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup } from "@testing-library/react";

const mocks = vi.hoisted(() => ({ read: vi.fn(), update: vi.fn(), invoke: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: {
  from: () => ({
    select: () => ({ eq: () => ({ abortSignal: () => ({ single: mocks.read }), single: mocks.read }) }),
    update: (patch: unknown) => { mocks.update(patch); return { eq: async () => ({ error: null }) }; },
  }), functions: { invoke: mocks.invoke },
} }));
import { AcceptanceCriteria } from "./AcceptanceCriteria";
import { useAcceptanceCriteria } from "./useAcceptanceCriteria";

function Harness({ enabled }: { enabled: boolean }) {
  const query = useAcceptanceCriteria("ticket", enabled);
  return <AcceptanceCriteria ticketId="ticket" ticketTitle="A ticket" epicName={null} role="PMBA" canEdit
    value={query.data} loading={query.data === undefined && !query.isError}
    error={query.isError ? query.error.message : null} onRetry={() => void query.refetch()} onSaved={() => {}} />;
}
function setup(enabled: boolean) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  const view = render(<QueryClientProvider client={client}><Harness enabled={enabled} /></QueryClientProvider>);
  return { client, ...view };
}
describe("acceptance criteria lazy loading safety", () => {
  beforeEach(() => { vi.clearAllMocks(); });
  afterEach(cleanup);
  it("does not fetch while disabled, and prevents saving or generating before the real value loads", async () => {
    let resolve: ((value: unknown) => void) | undefined;
    mocks.read.mockImplementation(() => new Promise((done) => { resolve = done; }));
    const view = setup(false);
    expect(mocks.read).not.toHaveBeenCalled();
    view.rerender(<QueryClientProvider client={view.client}><Harness enabled /></QueryClientProvider>);
    await waitFor(() => expect(mocks.read).toHaveBeenCalledTimes(1));
    expect(mocks.update).not.toHaveBeenCalled();
    expect(mocks.invoke).not.toHaveBeenCalled();
    await act(async () => { resolve?.({ data: { acceptance_criteria: "Existing criteria" }, error: null }); });
    await waitFor(() => expect(screen.getByRole("button", { name: "Edit" })).toBeEnabled());
    fireEvent.click(screen.getByRole("button", { name: "Edit" }));
    expect(screen.getByRole("textbox")).toHaveValue("Existing criteria");
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "Saved criteria" } });
    mocks.read.mockResolvedValue({ data: { acceptance_criteria: "Saved criteria" }, error: null });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(mocks.update).toHaveBeenCalledWith({ acceptance_criteria: "Saved criteria" }));
    await waitFor(() => expect(view.client.getQueryData(["ticketAC", "ticket"])).toBe("Saved criteria"));
    view.unmount();
    const reopened = setup(true);
    await waitFor(() => expect(screen.getByRole("button", { name: "Edit" })).toBeEnabled());
    fireEvent.click(screen.getByRole("button", { name: "Edit" }));
    expect(screen.getByRole("textbox")).toHaveValue("Saved criteria");
    reopened.unmount();
  });
  it("failed loading never writes an empty value, and can retry", async () => {
    mocks.read.mockResolvedValueOnce({ data: null, error: { message: "Offline" } })
      .mockResolvedValue({ data: { acceptance_criteria: "Recovered criteria" }, error: null });
    setup(true);
    await waitFor(() => expect(screen.getByRole("alert")).toBeInTheDocument());
    expect(mocks.update).not.toHaveBeenCalled();
    expect(mocks.invoke).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Edit" })).toBeEnabled());
    fireEvent.click(screen.getByRole("button", { name: "Edit" }));
    expect(screen.getByRole("textbox")).toHaveValue("Recovered criteria");
  });
});
