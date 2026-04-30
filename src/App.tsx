import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { TopBar } from "@/components/TopBar";
import { TimerSync } from "@/components/TimerSync";
import Projects from "./pages/Projects";
import ProjectWorkspace from "./pages/ProjectWorkspace";
import Admin from "./pages/Admin";
import MyWork from "./pages/MyWork";
import ClientPortalPublic from "./pages/ClientPortalPublic";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <TimerSync />
        <Routes>
          <Route path="/h/:hash" element={<ClientPortalPublic />} />
          <Route
            path="*"
            element={
              <div className="min-h-screen">
                <TopBar />
                <Routes>
                  <Route path="/" element={<Projects />} />
                  <Route path="/projects/:id/*" element={<ProjectWorkspace />} />
                  <Route path="/admin" element={<Admin />} />
                  <Route path="/my-work" element={<MyWork />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </div>
            }
          />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
