import { useEffect, useState, type ReactNode } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/store/currentUser";
import { toast } from "@/hooks/use-toast";

const ALLOWED_DOMAIN = "old.st";

type Status = "loading" | "authed" | "anon";

const StatusContext = (() => {
  // Minimal context-free signal via a module-level store is unnecessary;
  // AuthProvider just renders children. RequireAuth uses its own hook.
  return null;
})();

export function AuthProvider({ children }: { children: ReactNode }) {
  const setUser = useCurrentUser((s) => s.setUser);
  const navigate = useNavigate();
  const location = useLocation();
  const [, setSession] = useState<Session | null>(null);

  useEffect(() => {
    let cancelled = false;

    const resolveTeamMember = async (session: Session | null) => {
      if (!session?.user?.email) {
        setUser(null);
        return false;
      }
      const email = session.user.email.toLowerCase();
      if (!email.endsWith(`@${ALLOWED_DOMAIN}`)) {
        await supabase.auth.signOut();
        setUser(null);
        toast({
          title: "Use your old.st Google account",
          description: `Only @${ALLOWED_DOMAIN} accounts can sign in.`,
          variant: "destructive",
        });
        return false;
      }
      const { data, error } = await supabase
        .from("team_members")
        .select("*")
        .ilike("email", email)
        .maybeSingle();
      if (cancelled) return false;
      if (error || !data) {
        await supabase.auth.signOut();
        setUser(null);
        toast({
          title: "Account not on the team",
          description: "Ask a PMBA to add you in Admin → Team members.",
          variant: "destructive",
        });
        return false;
      }
      setUser(data);
      return true;
    };

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      // Defer Supabase calls per best practice
      setTimeout(() => {
        void resolveTeamMember(session).then((ok) => {
          if (!ok && location.pathname !== "/login" && !location.pathname.startsWith("/h/")) {
            navigate("/login", { replace: true });
          }
        });
      }, 0);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      void resolveTeamMember(session).then((ok) => {
        if (!ok && location.pathname !== "/login" && !location.pathname.startsWith("/h/")) {
          navigate("/login", { replace: true });
        }
      });
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <>{children}</>;
}

export { StatusContext };
