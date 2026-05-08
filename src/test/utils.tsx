import { ReactElement, ReactNode } from "react";
import { render, RenderOptions } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";

export function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0, staleTime: 0 },
      mutations: { retry: false },
    },
  });
}

interface ProvidersProps {
  children: ReactNode;
  route?: string;
  client?: QueryClient;
}

export function AllProviders({ children, route = "/", client }: ProvidersProps) {
  const qc = client ?? createTestQueryClient();
  return (
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[route]}>{children}</MemoryRouter>
    </QueryClientProvider>
  );
}

export function renderWithProviders(
  ui: ReactElement,
  opts: { route?: string; client?: QueryClient } & Omit<RenderOptions, "wrapper"> = {},
) {
  const { route, client, ...rest } = opts;
  return render(ui, {
    wrapper: ({ children }) => (
      <AllProviders route={route} client={client}>
        {children}
      </AllProviders>
    ),
    ...rest,
  });
}
