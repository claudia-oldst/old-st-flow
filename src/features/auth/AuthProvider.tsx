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
  const setAuthLoading = useCurrentUser((s) => s.setAuthLoading);
  const setAuthError = useCurrentUser((s) => s.setAuthError);
  const userId = useCurrentUser((s) => s.user?.id);
  const navigate = useNavigate();
  const location = useLocation();
  const [, setSession] = useState<Session | null>(null);

  // Subscribe to changes on the current user's team_members row so role
  // updates (and other profile changes) are reflected live without a reload.
  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel(`team_member:${userId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "team_members", filter: `id=eq.${userId}` },
        (payload) => {
          const next = payload.new as Parameters<typeof setUser>[0];
          if (next) setUser(next);
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [userId, setUser]);

  useEffect(() => {
    let cancelled = false;

    const resolveTeamMember = async (session: Session | null) => {
      setAuthLoading(true);
      setAuthError(null);
      if (!session?.user?.email) {
        setUser(null);
        setAuthLoading(false);
        return false;
      }
      const email = session.user.email.toLowerCase();
      if (!email.endsWith(`@${ALLOWED_DOMAIN}`)) {
        await supabase.auth.signOut();
        setUser(null);
        setAuthLoading(false);
        toast({
          title: "Use your old.st Google account",
          description: `Only @${ALLOWED_DOMAIN} accounts can sign in.`,
          variant: "destructive",
        });
        return false;
      }
      // Identity is now resolved by the verified auth user id (auth_user_id
      // column on team_members). A DB trigger links a team_member row to its
      // auth user on signup / on team_member insert, so this should match for
      // any legitimate user. Email lookup is kept as a one-shot fallback only
      // in case the linker trigger hasn't run yet for a brand-new row.
      const authUserId = session.user.id;
      let { data, error } = await supabase
        .from("team_members")
        .select("*")
        .eq("auth_user_id", authUserId)
        .maybeSingle();
      if (!cancelled && !data && !error) {
        const fallback = await supabase
          .from("team_members")
          .select("*")
          .ilike("email", email)
          .maybeSingle();
        data = fallback.data;
        error = fallback.error;
      }
      if (cancelled) return true;
      if (error) {
        setUser(null);
        setAuthError(`Could not confirm your team account: ${error.message}`);
        setAuthLoading(false);
        return true;
      }
      if (!data) {
        await supabase.auth.signOut();
        setUser(null);
        setAuthLoading(false);
        toast({
          title: "Account not on the team",
          description: "Ask a PMBA to add you in Admin → Team members.",
          variant: "destructive",
        });
        return false;
      }
      setUser(data);
      setAuthLoading(false);
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
