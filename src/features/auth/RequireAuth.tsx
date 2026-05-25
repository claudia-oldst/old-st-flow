import { useEffect, useState, type ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/store/currentUser";

export function RequireAuth({ children }: { children: ReactNode }) {
  const user = useCurrentUser((s) => s.user);
  const [checked, setChecked] = useState(false);
  const [hasSession, setHasSession] = useState(false);
  const location = useLocation();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setHasSession(!!session);
      setChecked(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setHasSession(!!session);
      setChecked(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  if (!checked) {
    return (
      <div className="min-h-screen flex items-center justify-center text-dim text-sm">
        Loading…
      </div>
    );
  }
  if (!hasSession || !user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  return <>{children}</>;
}
