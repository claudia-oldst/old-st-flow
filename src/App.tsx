import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { TopBar } from "@/components/TopBar";
import { WeeklyHoursBar } from "@/components/WeeklyHoursBar";
import { TimerSync } from "@/components/TimerSync";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import Projects from "./pages/Projects";
import ProjectWorkspace from "./pages/ProjectWorkspace";
import Admin from "./pages/Admin";
import MyWork from "./pages/MyWork";
import ClientPortalPublic from "./pages/ClientPortalPublic";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound.tsx";
import { AuthProvider } from "@/features/auth/AuthProvider";
import { RequireAuth } from "@/features/auth/RequireAuth";
import { RequirePMBA } from "@/features/auth/RequirePMBA";
import { GithubUsernamePrompt } from "@/features/auth/GithubUsernamePrompt";

const wrap = (scope: string, el: ReactNode) => (
  <ErrorBoundary scope={scope}>{el}</ErrorBoundary>
);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <TimerSync />
          <Routes>
            <Route path="/h/:hash" element={wrap("client portal", <ClientPortalPublic />)} />
            <Route path="/login" element={wrap("login", <Login />)} />
            <Route
              path="*"
              element={
                <RequireAuth>
                  <div className="min-h-screen">
                    <TopBar />
                    <WeeklyHoursBar />
                    <Routes>
                      <Route path="/" element={wrap("projects", <Projects />)} />
                      <Route path="/projects/:id/*" element={wrap("project", <ProjectWorkspace />)} />
                      <Route path="/admin" element={<RequirePMBA>{wrap("admin", <Admin />)}</RequirePMBA>} />
                      <Route path="/my-work" element={wrap("my work", <MyWork />)} />
                      <Route path="*" element={<NotFound />} />
                    </Routes>
                  </div>
                </RequireAuth>
              }
            />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
