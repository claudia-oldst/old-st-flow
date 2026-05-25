import { useEffect, useState, type ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/store/currentUser";

export function RequireAuth({ children }: { children: ReactNode }) {
  const user = useCurrentUser((s) => s.user);
  const authLoading = useCurrentUser((s) => s.authLoading);
  const authError = useCurrentUser((s) => s.authError);
  const [hasSession, setHasSession] = useState<boolean | null>(null);
  const location = useLocation();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setHasSession(!!session);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setHasSession(!!session);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  // Still checking session, OR session exists but AuthProvider hasn't
  // finished resolving the team_member row yet — keep waiting instead of
  // bouncing the user to /login mid-load (which would kick a real PMBA off
  // the app while the tickets query was about to fire).
  if (authError && hasSession) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6 text-center">
        <div className="max-w-sm rounded-2xl hairline bg-surface-2/40 p-6">
          <div className="font-display text-lg font-semibold mb-2">Could not finish sign in</div>
          <p className="text-sm text-dim mb-4">{authError}</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="text-sm text-primary hover:text-primary/80 transition"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  if (hasSession === null || authLoading || (hasSession && !user)) {
    return (
      <div className="min-h-screen flex items-center justify-center text-dim text-sm">
        Loading…
      </div>
    );
  }
  if (!hasSession) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  return <>{children}</>;
}
